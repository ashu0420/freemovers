import { HttpError, jsonResponse, requireUser } from '@/lib/server/http';
import { getMoveById, listQuotesForMove } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const moveId = Number(id);
  if (!Number.isFinite(moveId)) {
    return jsonResponse({ quotes: [] });
  }

  try {
    const session = await requireUser(request);
    if (session.role !== 'customer') {
      return jsonResponse({ error: 'forbidden' }, 403);
    }

    const move = getMoveById(moveId);
    if (!move) {
      return jsonResponse({ quotes: [] });
    }
    if (move.customer_id !== session.userId) {
      return jsonResponse({ error: 'forbidden' }, 403);
    }

    const quotes = listQuotesForMove(moveId).map((quote) => ({
      driverId: quote.driver_id,
      quotedRate: quote.quoted_rate,
      createdAt: quote.created_at,
    }));

    return jsonResponse({ quotes });
  } catch (e) {
    if (e instanceof HttpError) return jsonResponse({ error: e.message }, e.status);
    throw e;
  }
}

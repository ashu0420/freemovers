import { HttpError, jsonResponse, readJson, requireUser } from '@/lib/server/http';
import { createNotification, getMoveById, listQuotesForMove } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const moveId = Number(id);
  if (!Number.isFinite(moveId)) {
    return jsonResponse({ detail: 'Invalid move id.' }, 400);
  }

  try {
    const session = await requireUser(request);
    if (session.role !== 'customer') {
      return jsonResponse({ error: 'forbidden' }, 403);
    }

    const body = await readJson<{ driver_id?: number; message?: string }>(request);
    if (!body) {
      return jsonResponse({ detail: 'Invalid request body.' }, 400);
    }
    const driverId = body.driver_id;
    if (!driverId || !Number.isFinite(driverId)) {
      return jsonResponse({ detail: 'driver_id is required.' }, 400);
    }

    const move = getMoveById(moveId);
    if (!move) {
      return jsonResponse({ detail: 'Move not found.' }, 404);
    }
    if (move.customer_id !== session.userId) {
      return jsonResponse({ error: 'forbidden' }, 403);
    }

    // Ensure the target driver actually quoted this move.
    const quotes = listQuotesForMove(moveId);
    if (!quotes.some((q) => q.driver_id === driverId)) {
      return jsonResponse({ detail: 'That driver has not quoted this move.' }, 400);
    }

    createNotification({
      driverId,
      moveId,
      type: 'negotiation',
      message: body?.message?.trim() || 'Customer requested to renegotiate the quote.',
    });

    return jsonResponse({ ok: true });
  } catch (e) {
    if (e instanceof HttpError) return jsonResponse({ error: e.message }, e.status);
    throw e;
  }
}

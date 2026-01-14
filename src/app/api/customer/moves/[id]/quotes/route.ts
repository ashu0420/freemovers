import { jsonResponse } from '@/lib/server/http';
import { listQuotesForMove } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const moveId = Number(id);
  if (!Number.isFinite(moveId)) {
    return jsonResponse({ quotes: [] });
  }

  const quotes = listQuotesForMove(moveId).map((quote) => ({
    driverId: quote.driver_id,
    quotedRate: quote.quoted_rate,
    createdAt: quote.created_at,
  }));

  return jsonResponse({ quotes });
}

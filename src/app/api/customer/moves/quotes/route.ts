import { HttpError, jsonResponse, requireUser } from '@/lib/server/http';
import { listMovesByCustomer, listQuotesForMove } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const session = await requireUser(request);
    if (session.role !== 'customer') {
      return jsonResponse({ error: 'forbidden' }, 403);
    }
    const customerId = session.userId;

    // Fetch the customer's moves once, then collect all quotes grouped by move_id.
    // This avoids the per-move N+1 waterfall that the per-move quotes endpoint causes.
    const moves = listMovesByCustomer(customerId);

    const grouped: Record<number, { driverId: number; quotedRate: number; createdAt: string }[]> = {};
    for (const move of moves) {
      grouped[move.id] = listQuotesForMove(move.id).map((quote) => ({
        driverId: quote.driver_id,
        quotedRate: quote.quoted_rate,
        createdAt: quote.created_at,
      }));
    }

    return jsonResponse({
      moves: moves.map((m) => ({ id: m.id, status: m.status })),
      quotesByMove: grouped,
    });
  } catch (e) {
    if (e instanceof HttpError) return jsonResponse({ error: e.message }, e.status);
    throw e;
  }
}

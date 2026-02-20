import { HttpError, jsonResponse, readJson, requireUser } from '@/lib/server/http';
import { acceptQuote, getMoveById } from '@/lib/server/db';

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

    const body = await readJson<{ driver_id?: number }>(request);
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

    const updated = acceptQuote(moveId, driverId);
    if (!updated) {
      return jsonResponse({ detail: 'Quote not found.' }, 404);
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    if (e instanceof HttpError) return jsonResponse({ error: e.message }, e.status);
    throw e;
  }
}

import { HttpError, jsonResponse, requireUser } from '@/lib/server/http';
import { getMoveById, updateMoveStatus } from '@/lib/server/db';

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
    // Authorization is derived from the session, never a client-supplied customer_id.
    const customerId = session.userId;

    const move = getMoveById(moveId);
    if (!move || move.customer_id !== customerId) {
      return jsonResponse({ detail: 'Move not found.' }, 404);
    }

    if (move.status === 'completed') {
      return jsonResponse({ detail: 'Completed move cannot be cancelled.' }, 400);
    }

    const updated = updateMoveStatus(moveId, 'cancelled');
    if (!updated) {
      return jsonResponse({ detail: 'Unable to cancel move.' }, 400);
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    if (e instanceof HttpError) return jsonResponse({ error: e.message }, e.status);
    throw e;
  }
}

import { HttpError, jsonResponse, readJson, requireUser } from '@/lib/server/http';
import { getMoveById, updateMoveStatus } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const moveId = Number(id);
  if (!Number.isFinite(moveId)) {
    return jsonResponse({ detail: 'Invalid job id.' }, 400);
  }

  try {
    const session = await requireUser(request);
    if (session.role !== 'driver') {
      return jsonResponse({ error: 'forbidden' }, 403);
    }

    const move = getMoveById(moveId);
    if (!move) {
      return jsonResponse({ detail: 'Job not found.' }, 404);
    }
    if (move.driver_id !== session.userId) {
      return jsonResponse({ error: 'forbidden' }, 403);
    }

    const body = await readJson<{ status?: string }>(request);
    if (!body) {
      return jsonResponse({ detail: 'Invalid request body.' }, 400);
    }
    const status = body.status;
    const allowed = ['scheduled', 'in_progress', 'completed', 'cancelled'];
    if (!status || !allowed.includes(status)) {
      return jsonResponse({ detail: 'Invalid status.' }, 400);
    }

    const updated = updateMoveStatus(moveId, status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled');
    if (!updated) {
      return jsonResponse({ detail: 'Job not found.' }, 404);
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    if (e instanceof HttpError) return jsonResponse({ error: e.message }, e.status);
    throw e;
  }
}

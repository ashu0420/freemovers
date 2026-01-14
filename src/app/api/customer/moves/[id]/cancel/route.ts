import { getMoveById, updateMoveStatus } from '@/lib/server/db';
import { jsonResponse, readJson } from '@/lib/server/http';

export const runtime = 'nodejs';

type CancelBody = {
  customer_id?: number;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const moveId = Number(id);
  if (!Number.isFinite(moveId)) {
    return jsonResponse({ detail: 'Invalid move id.' }, 400);
  }

  const body = await readJson<CancelBody>(request).catch(() => null);
  const customerId = body?.customer_id;
  if (!customerId || !Number.isFinite(customerId)) {
    return jsonResponse({ detail: 'customer_id is required.' }, 400);
  }

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
}

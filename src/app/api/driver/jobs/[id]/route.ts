import { HttpError, jsonResponse, requireUser } from '@/lib/server/http';
import { getMoveById } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(
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

    return jsonResponse({
    id: String(move.id),
    title: 'Move Request',
    customerName: `Customer #${move.customer_id}`,
    customerId: move.customer_id,
    pickupLocation: move.pickup_address,
    dropoffLocation: move.dropoff_address,
    scheduledDate: move.move_date,
    estimatedEarnings: move.estimated_earnings,
    status: move.status,
    distance: 'TBD',
    items: move.items,
  });
  } catch (e) {
    if (e instanceof HttpError) return jsonResponse({ error: e.message }, e.status);
    throw e;
  }
}

import { jsonResponse } from '@/lib/server/http';
import { getMoveById } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const moveId = Number(id);
  if (!Number.isFinite(moveId)) {
    return jsonResponse({ detail: 'Invalid job id.' }, 400);
  }

  const move = getMoveById(moveId);
  if (!move) {
    return jsonResponse({ detail: 'Job not found.' }, 404);
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
}

import { jsonResponse } from '@/lib/server/http';
import { listRecentMovesForDriver } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const driverIdParam = url.searchParams.get('driver_id');
  const driverId = driverIdParam ? Number(driverIdParam) : NaN;

  if (!Number.isFinite(driverId)) {
    return jsonResponse({ jobs: [] });
  }

  const jobs = listRecentMovesForDriver(driverId).map((move) => ({
    id: String(move.id),
    title: 'Move Request',
    customerName: `Customer #${move.customer_id}`,
    customerId: move.customer_id,
    pickupLocation: move.pickup_address,
    dropoffLocation: move.dropoff_address,
    scheduledDate: move.move_date,
    estimatedEarnings: move.estimated_earnings,
    status: 'completed',
    distance: 'TBD',
  }));

  return jsonResponse({ jobs });
}

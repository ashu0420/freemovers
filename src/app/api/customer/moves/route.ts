import { jsonResponse } from '@/lib/server/http';
import { listMovesByCustomer } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const customerIdParam = url.searchParams.get('customer_id');
  const customerId = customerIdParam ? Number(customerIdParam) : NaN;

  if (!Number.isFinite(customerId)) {
    return jsonResponse({ moves: [] });
  }

  const moves = listMovesByCustomer(customerId).map((move) => ({
    id: move.id,
    status: move.status,
    from: move.pickup_address,
    pickupPostalCode: move.pickup_postal_code,
    to: move.dropoff_address,
    dropoffPostalCode: move.dropoff_postal_code,
    scheduledDate: move.move_date,
    serviceArea: move.service_area,
    paymentPreference: move.payment_preference,
  }));

  return jsonResponse({ moves });
}

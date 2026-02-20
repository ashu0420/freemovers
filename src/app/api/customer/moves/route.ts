import { HttpError, jsonResponse, requireUser } from '@/lib/server/http';
import { listMovesByCustomer } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const session = await requireUser(request);
    if (session.role !== 'customer') {
      return jsonResponse({ error: 'forbidden' }, 403);
    }
    // customer_id is DERIVED from the session, not a query param.
    const customerId = session.userId;

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
  } catch (e) {
    if (e instanceof HttpError) return jsonResponse({ error: e.message }, e.status);
    throw e;
  }
}

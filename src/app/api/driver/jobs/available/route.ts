import { jsonResponse } from '@/lib/server/http';
import {
  findUserById,
  listAvailableMoves,
  listQuotesByDriver,
  parseOperatingRegions,
} from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const driverIdParam = url.searchParams.get('driver_id');
  const driverId = driverIdParam ? Number(driverIdParam) : NaN;
  const driver = Number.isFinite(driverId) ? findUserById(driverId) : undefined;
  const regions = driver?.user_type === 'driver' ? parseOperatingRegions(driver.operating_regions_json) : [];
  const quoteRows = Number.isFinite(driverId) ? listQuotesByDriver(driverId) : [];
  const quotesByMove = new Map(
    quoteRows.map((row) => [
      row.move_id,
      { quotedRate: row.quoted_rate, createdAt: row.created_at },
    ])
  );

  const moves = listAvailableMoves(regions).map((move) => ({
    id: String(move.id),
    title: 'Move Request',
    customerName: `Customer #${move.customer_id}`,
    customerId: move.customer_id,
    pickupLocation: move.pickup_address,
    dropoffLocation: move.dropoff_address,
    serviceArea: move.service_area,
    paymentPreference: move.payment_preference,
    scheduledDate: move.move_date,
    estimatedEarnings: move.estimated_earnings,
    myQuote: quotesByMove.get(move.id)?.quotedRate ?? null,
    myQuoteAt: quotesByMove.get(move.id)?.createdAt ?? null,
    status: move.status,
    distance: 'TBD',
  }));

  return jsonResponse({ jobs: moves });
}

import { jsonResponse } from '@/lib/server/http';
import { listNotificationsForDriver } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const driverIdParam = url.searchParams.get('driver_id');
  const driverId = driverIdParam ? Number(driverIdParam) : NaN;

  if (!Number.isFinite(driverId)) {
    return jsonResponse({ notifications: [] });
  }

  return jsonResponse({
    notifications: listNotificationsForDriver(driverId),
  });
}

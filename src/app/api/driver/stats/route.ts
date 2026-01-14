import { jsonResponse } from '@/lib/server/http';
import { driverStats } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const driverIdParam = url.searchParams.get('driver_id');
  const driverId = driverIdParam ? Number(driverIdParam) : NaN;

  if (!Number.isFinite(driverId)) {
    return jsonResponse({ totalEarnings: 0, jobsCompleted: 0, rating: 0, activeJobs: 0 });
  }

  return jsonResponse(driverStats(driverId));
}

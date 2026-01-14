import { jsonResponse } from '@/lib/server/http';
import { countUpcomingMoves } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const customerIdParam = url.searchParams.get('customer_id');
  const customerId = customerIdParam ? Number(customerIdParam) : NaN;

  if (!Number.isFinite(customerId)) {
    return jsonResponse({ upcoming: 0 });
  }

  return jsonResponse({
    upcoming: countUpcomingMoves(customerId),
  });
}

import { jsonResponse, readJson } from '@/lib/server/http';
import { createMove } from '@/lib/server/db';

type MoveItem = { name: string; quantity: number };

type CreateMoveBody = {
  customer_id: number;
  pickup_address: string;
  pickup_postal_code?: string;
  dropoff_address: string;
  dropoff_postal_code?: string;
  move_date: string;
  country_code?: string;
  service_area?: string;
  payment_preference?: string;
  items: MoveItem[];
};

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await readJson<CreateMoveBody>(request);

  if (
    !body?.customer_id ||
    !body?.pickup_address ||
    !body?.dropoff_address ||
    !body?.move_date ||
    !body?.items?.length
  ) {
    return jsonResponse({ detail: 'All fields are required.' }, 400);
  }

  const move = createMove({
    customer_id: body.customer_id,
    driver_id: null,
    pickup_address: body.pickup_address,
    pickup_postal_code: body.pickup_postal_code || null,
    dropoff_address: body.dropoff_address,
    dropoff_postal_code: body.dropoff_postal_code || null,
    move_date: body.move_date,
    country_code: body.country_code || 'JP',
    service_area: body.service_area || 'tokyo',
    payment_preference: body.payment_preference || 'card',
    items: body.items,
    estimated_earnings: 0,
    status: 'pending',
  });

  return jsonResponse({ move }, 201);
}

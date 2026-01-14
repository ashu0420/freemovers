import { createMove, findUserById } from '@/lib/server/db';
import { getOrCreateGuestCustomer } from '@/lib/server/guest';
import { jsonResponse, readJson } from '@/lib/server/http';
import { sendCustomerMoveNotification } from '@/lib/server/notifications';

type MoveItem = { name: string; quantity: number };

type CreateGuestMoveBody = {
  first_name?: string;
  last_name?: string;
  phone_number: string;
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
  const body = await readJson<CreateGuestMoveBody>(request);

  if (
    !body?.phone_number ||
    !body?.pickup_address ||
    !body?.dropoff_address ||
    !body?.move_date ||
    !body?.items?.length
  ) {
    return jsonResponse({ detail: 'All required fields must be filled.' }, 400);
  }

  const guest = getOrCreateGuestCustomer({
    firstName: body.first_name,
    lastName: body.last_name,
    phoneNumber: body.phone_number,
  });

  const move = createMove({
    customer_id: guest.id,
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

  const customer = findUserById(guest.id);
  await sendCustomerMoveNotification({
    customer,
    pickupAddress: move.pickup_address,
    dropoffAddress: move.dropoff_address,
    moveDate: move.move_date,
    whatsappTemplateOverride: process.env.WHATSAPP_TEMPLATE_NAME_MOVE_REQUEST,
  });

  return jsonResponse(
    {
      move,
      guest: {
        first_name: guest.first_name,
        last_name: guest.last_name,
        phone_number: guest.phone_number,
      },
    },
    201
  );
}

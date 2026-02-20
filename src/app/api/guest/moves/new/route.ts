import { createMove, findUserById } from '@/lib/server/db';
import { getOrCreateGuestCustomer } from '@/lib/server/guest';
import { jsonResponse, readJson } from '@/lib/server/http';
import { sendCustomerMoveNotification } from '@/lib/server/notifications';

type MoveItem = { id?: string | number; name: string; qty?: number; quantity?: number; weight?: number };

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

const ALLOWED_SERVICE_AREAS = ['tokyo', 'osaka', 'kyoto', 'nagoya', 'yokohama', 'fukuoka', 'sapporo'];
const ALLOWED_PAYMENT_PREFERENCES = ['card', 'cash', 'bank_transfer', 'line_pay'];

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && value === d.toISOString();
}

function validateItems(items: unknown): items is MoveItem[] {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.every(
    (it) =>
      it &&
      typeof it === 'object' &&
      typeof (it as MoveItem).name === 'string' &&
      (it as MoveItem).name.length > 0 &&
      Number.isFinite(Number((it as MoveItem).qty ?? (it as MoveItem).quantity ?? 0)) &&
      Number.isFinite(Number((it as MoveItem).weight ?? 0))
  );
}

export async function POST(request: Request) {
  const body = await readJson<CreateGuestMoveBody>(request);
  if (!body) {
    return jsonResponse({ detail: 'Invalid request body.' }, 400);
  }

  if (!body.phone_number || !body.pickup_address || !body.dropoff_address || !body.move_date) {
    return jsonResponse({ detail: 'phone_number, pickup_address, dropoff_address and move_date are required.' }, 400);
  }
  if (!isValidIsoDate(body.move_date)) {
    return jsonResponse({ detail: 'move_date must be a valid ISO date string.' }, 400);
  }
  if (body.service_area && !ALLOWED_SERVICE_AREAS.includes(body.service_area)) {
    return jsonResponse({ detail: 'Invalid service_area.' }, 400);
  }
  if (body.payment_preference && !ALLOWED_PAYMENT_PREFERENCES.includes(body.payment_preference)) {
    return jsonResponse({ detail: 'Invalid payment_preference.' }, 400);
  }
  if (!validateItems(body.items)) {
    return jsonResponse({ detail: 'items must be a non-empty array of { id?, name, qty?, weight? } objects.' }, 400);
  }

  const guest = await getOrCreateGuestCustomer({
    firstName: body.first_name,
    lastName: body.last_name,
    phoneNumber: body.phone_number,
  });

  const normalizedItems = body.items.map((it) => ({
    name: it.name,
    quantity: Number(it.qty ?? it.quantity ?? 1),
  }));

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
    items: normalizedItems,
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

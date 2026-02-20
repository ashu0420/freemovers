import { HttpError, jsonResponse, readJson, requireUser } from '@/lib/server/http';
import { createMove, findUserById } from '@/lib/server/db';
import { sendCustomerMoveNotification } from '@/lib/server/notifications';

type MoveItem = { id?: string | number; name: string; qty?: number; quantity?: number; weight?: number };

type CreateMoveBody = {
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
  try {
    const session = await requireUser(request);
    if (session.role !== 'customer') {
      return jsonResponse({ error: 'forbidden' }, 403);
    }
    // customer_id is DERIVED from the session, not the request body.
    const customerId = session.userId;

    const body = await readJson<CreateMoveBody>(request);
    if (!body) {
      return jsonResponse({ detail: 'Invalid request body.' }, 400);
    }

    if (!body.pickup_address || !body.dropoff_address || !body.move_date) {
      return jsonResponse({ detail: 'pickup_address, dropoff_address and move_date are required.' }, 400);
    }
    if (!isValidIsoDate(body.move_date)) {
      return jsonResponse({ detail: 'move_date must be a valid ISO date string.' }, 400);
    }
    const serviceArea = body.service_area && ALLOWED_SERVICE_AREAS.includes(body.service_area)
      ? body.service_area
      : 'tokyo';
    const paymentPreference = body.payment_preference && ALLOWED_PAYMENT_PREFERENCES.includes(body.payment_preference)
      ? body.payment_preference
      : 'card';
    if (body.service_area && !ALLOWED_SERVICE_AREAS.includes(body.service_area)) {
      return jsonResponse({ detail: 'Invalid service_area.' }, 400);
    }
    if (body.payment_preference && !ALLOWED_PAYMENT_PREFERENCES.includes(body.payment_preference)) {
      return jsonResponse({ detail: 'Invalid payment_preference.' }, 400);
    }
    if (!validateItems(body.items)) {
      return jsonResponse({ detail: 'items must be a non-empty array of { id?, name, qty?, weight? } objects.' }, 400);
    }

    const normalizedItems = body.items.map((it) => ({
      name: it.name,
      quantity: Number(it.qty ?? it.quantity ?? 1),
    }));

    const move = createMove({
      customer_id: customerId,
      driver_id: null,
      pickup_address: body.pickup_address,
      pickup_postal_code: body.pickup_postal_code || null,
      dropoff_address: body.dropoff_address,
      dropoff_postal_code: body.dropoff_postal_code || null,
      move_date: body.move_date,
      country_code: body.country_code || 'JP',
      service_area: serviceArea,
      payment_preference: paymentPreference,
      items: normalizedItems,
      estimated_earnings: 0,
      status: 'pending',
    });

    const customer = findUserById(customerId);
    await sendCustomerMoveNotification({
      customer,
      pickupAddress: move.pickup_address,
      dropoffAddress: move.dropoff_address,
      moveDate: move.move_date,
      whatsappTemplateOverride: process.env.WHATSAPP_TEMPLATE_NAME_MOVE_REQUEST,
    });

    return jsonResponse({ move }, 201);
  } catch (e) {
    if (e instanceof HttpError) return jsonResponse({ error: e.message }, e.status);
    throw e;
  }
}

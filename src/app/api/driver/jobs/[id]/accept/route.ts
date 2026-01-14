import { jsonResponse } from '@/lib/server/http';
import { createOrUpdateQuote, findUserById, getMoveById } from '@/lib/server/db';
import { sendCustomerMoveNotification } from '@/lib/server/notifications';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const moveId = Number(id);
  console.log('moveId:', moveId);
  if (!Number.isFinite(moveId)) {
    return jsonResponse({ detail: 'Invalid job id.' }, 400);
  }

  const body = await request.json().catch(() => null) as {
    driver_id?: number;
    quoted_rate?: number;
  } | null;
  const driverId = body?.driver_id;
  const quotedRate = body?.quoted_rate;

  if (!driverId || !Number.isFinite(driverId)) {
    return jsonResponse({ detail: 'driver_id is required.' }, 400);
  }

  if (!quotedRate || !Number.isFinite(quotedRate) || quotedRate <= 0) {
    return jsonResponse({ detail: 'quoted_rate must be a positive number.' }, 400);
  }

  createOrUpdateQuote(moveId, driverId, quotedRate);

  const move = getMoveById(moveId);
  if (move) {
    const customer = findUserById(move.customer_id);
    await sendCustomerMoveNotification({
      customer,
      pickupAddress: move.pickup_address,
      dropoffAddress: move.dropoff_address,
      moveDate: move.move_date,
      quoteAmount: quotedRate,
    });
  }
  return jsonResponse({ ok: true });
}

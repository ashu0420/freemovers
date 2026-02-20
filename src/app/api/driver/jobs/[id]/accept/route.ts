import { HttpError, jsonResponse, readJson, requireUser } from '@/lib/server/http';
import { createOrUpdateQuote, findUserById, getMoveById } from '@/lib/server/db';
import { sendCustomerMoveNotification } from '@/lib/server/notifications';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const moveId = Number(id);
  if (!Number.isFinite(moveId)) {
    return jsonResponse({ detail: 'Invalid job id.' }, 400);
  }

  try {
    const session = await requireUser(request);
    if (session.role !== 'driver') {
      return jsonResponse({ error: 'forbidden' }, 403);
    }
    // driver_id is DERIVED from the authenticated session, never the request body.
    const driverId = session.userId;

    const body = await readJson<{ quoted_rate?: number }>(request);
    if (!body) {
      return jsonResponse({ detail: 'Invalid request body.' }, 400);
    }
    const quotedRate = body.quoted_rate;

    if (!quotedRate || !Number.isFinite(quotedRate) || quotedRate <= 0) {
      return jsonResponse({ detail: 'quoted_rate must be a positive number.' }, 400);
    }

    const move = getMoveById(moveId);
    if (!move) {
      return jsonResponse({ detail: 'Job not found.' }, 404);
    }
    // Optionally ensure the move is still in an acceptable state (open to quotes).
    if (move.status !== 'pending' || move.driver_id !== null) {
      return jsonResponse({ detail: 'This move is no longer accepting quotes.' }, 400);
    }

    createOrUpdateQuote(moveId, driverId, quotedRate);

    const customer = findUserById(move.customer_id);
    await sendCustomerMoveNotification({
      customer,
      pickupAddress: move.pickup_address,
      dropoffAddress: move.dropoff_address,
      moveDate: move.move_date,
      quoteAmount: quotedRate,
    });
    return jsonResponse({ ok: true });
  } catch (e) {
    if (e instanceof HttpError) return jsonResponse({ error: e.message }, e.status);
    throw e;
  }
}

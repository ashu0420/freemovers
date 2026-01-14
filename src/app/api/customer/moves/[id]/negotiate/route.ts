import { jsonResponse } from '@/lib/server/http';
import { createNotification } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const moveId = Number(id);
  if (!Number.isFinite(moveId)) {
    return jsonResponse({ detail: 'Invalid move id.' }, 400);
  }

  const body = await request.json().catch(() => null) as {
    driver_id?: number;
    message?: string;
  } | null;
  const driverId = body?.driver_id;
  if (!driverId || !Number.isFinite(driverId)) {
    return jsonResponse({ detail: 'driver_id is required.' }, 400);
  }

  createNotification({
    driverId,
    moveId,
    type: 'negotiation',
    message: body?.message?.trim() || 'Customer requested to renegotiate the quote.',
  });

  return jsonResponse({ ok: true });
}

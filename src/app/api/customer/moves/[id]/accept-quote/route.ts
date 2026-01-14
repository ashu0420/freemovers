import { jsonResponse } from '@/lib/server/http';
import { acceptQuote } from '@/lib/server/db';

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

  const body = await request.json().catch(() => null) as { driver_id?: number } | null;
  const driverId = body?.driver_id;
  if (!driverId || !Number.isFinite(driverId)) {
    return jsonResponse({ detail: 'driver_id is required.' }, 400);
  }

  const updated = acceptQuote(moveId, driverId);
  if (!updated) {
    return jsonResponse({ detail: 'Quote not found.' }, 404);
  }

  return jsonResponse({ ok: true });
}

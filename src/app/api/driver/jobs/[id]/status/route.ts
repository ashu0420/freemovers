import { jsonResponse } from '@/lib/server/http';
import { updateMoveStatus } from '@/lib/server/db';

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

  const body = await request.json().catch(() => null) as { status?: string } | null;
  const status = body?.status;
  const allowed = ['scheduled', 'in_progress', 'completed', 'cancelled'];
  if (!status || !allowed.includes(status)) {
    return jsonResponse({ detail: 'Invalid status.' }, 400);
  }

  const updated = updateMoveStatus(moveId, status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled');
  if (!updated) {
    return jsonResponse({ detail: 'Job not found.' }, 404);
  }

  return jsonResponse({ ok: true });
}

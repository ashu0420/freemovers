import { jsonResponse, readJson, requireUser, HttpError } from '@/lib/server/http';
import { getAllFlags, setFlag, isValidFlagKey } from '@/lib/server/feature-flags';

export const runtime = 'nodejs';

async function requireAdmin(request: Request) {
  const session = await requireUser(request);
  if (session.role !== 'admin') {
    throw new HttpError(403, 'forbidden');
  }
  return session;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return jsonResponse({ flags: getAllFlags() });
  } catch (e) {
    if (e instanceof HttpError) return jsonResponse({ error: e.message }, e.status);
    return jsonResponse({ error: 'server' }, 500);
  }
}

type PutBody = { key: string; enabled: boolean };

export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
    const body = await readJson<PutBody>(request);
    if (!body?.key || typeof body.enabled !== 'boolean') {
      return jsonResponse({ detail: 'key and enabled are required.' }, 400);
    }
    if (!isValidFlagKey(body.key)) {
      return jsonResponse({ detail: 'Unknown feature flag.' }, 400);
    }
    setFlag(body.key, body.enabled);
    return jsonResponse({ ok: true, flags: getAllFlags() });
  } catch (e) {
    if (e instanceof HttpError) return jsonResponse({ error: e.message }, e.status);
    return jsonResponse({ error: 'server' }, 500);
  }
}

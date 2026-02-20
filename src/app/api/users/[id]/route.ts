import { HttpError, jsonResponse, readJson, requireUser } from '@/lib/server/http';
import { findUserById, updateUser } from '@/lib/server/db';

export const runtime = 'nodejs';

// Allowed self-service update fields. user_type/role are intentionally excluded
// so a non-admin can never escalate privileges via mass-assignment.
type UpdateBody = {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  preferred_locale?: 'en' | 'ja';
  preferred_notification_channel?: 'line' | 'whatsapp' | 'sms';
  line_user_id?: string | null;
  operating_regions?: string[];
};

const ALLOWED_UPDATE_KEYS: Array<keyof UpdateBody> = [
  'first_name',
  'last_name',
  'phone_number',
  'preferred_locale',
  'preferred_notification_channel',
  'line_user_id',
  'operating_regions',
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return jsonResponse({ detail: 'Invalid user id.' }, 400);
  }

  try {
    const session = await requireUser(request);
    if (session.userId !== userId && session.role !== 'admin') {
      return jsonResponse({ detail: 'forbidden' }, 403);
    }
  } catch (e) {
    if (e instanceof HttpError) return jsonResponse({ error: e.message }, e.status);
    throw e;
  }

  const user = findUserById(userId);
  if (!user) {
    return jsonResponse({ detail: 'User not found.' }, 404);
  }

  return jsonResponse({
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    phone_number: user.phone_number,
    user_type: user.user_type,
    preferred_locale: user.preferred_locale,
    phone_verified: user.phone_verified === 1,
    preferred_notification_channel: user.preferred_notification_channel,
    line_user_id: user.line_user_id,
    operating_regions: (() => {
      try {
        const parsed = JSON.parse(user.operating_regions_json);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })(),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return jsonResponse({ detail: 'Invalid user id.' }, 400);
  }

  try {
    const session = await requireUser(request);
    if (session.userId !== userId && session.role !== 'admin') {
      return jsonResponse({ error: 'forbidden' }, 403);
    }
  } catch (e) {
    if (e instanceof HttpError) return jsonResponse({ error: e.message }, e.status);
    throw e;
  }

  const body = await readJson<UpdateBody>(request);
  if (!body) {
    return jsonResponse({ detail: 'Invalid request body.' }, 400);
  }

  // Whitelist fields; drop anything not allowed (e.g. user_type/role) unless admin.
  const safeUpdates: UpdateBody = {};
  for (const key of ALLOWED_UPDATE_KEYS) {
    if (key in body) {
      (safeUpdates as Record<string, unknown>)[key] = body[key];
    }
  }

  const updated = updateUser(userId, safeUpdates);
  if (!updated) {
    return jsonResponse({ detail: 'User not found.' }, 404);
  }

  return jsonResponse({ ok: true });
}

import { jsonResponse, readJson } from '@/lib/server/http';
import { findUserById, updateUser } from '@/lib/server/db';

export const runtime = 'nodejs';

type UpdateBody = {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  preferred_locale?: 'en' | 'ja';
  preferred_notification_channel?: 'line' | 'whatsapp' | 'sms';
  line_user_id?: string | null;
  operating_regions?: string[];
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return jsonResponse({ detail: 'Invalid user id.' }, 400);
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

  const body = await readJson<UpdateBody>(request);
  const updated = updateUser(userId, body);
  if (!updated) {
    return jsonResponse({ detail: 'User not found.' }, 404);
  }

  return jsonResponse({ ok: true });
}

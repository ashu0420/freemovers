import { jsonResponse, requireUser, HttpError } from '@/lib/server/http';
import { findUserById } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const session = await requireUser(req);
    const user = findUserById(session.userId);
    if (!user) {
      return jsonResponse({ error: 'unauthenticated' }, 401);
    }
    return jsonResponse({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      user_type: user.user_type,
      phone_number: user.phone_number,
      phone_verified: user.phone_verified === 1,
      preferred_locale: user.preferred_locale,
      preferred_notification_channel: user.preferred_notification_channel,
      line_user_id: user.line_user_id,
      role: session.role,
    });
  } catch (e) {
    if (e instanceof HttpError) return jsonResponse({ error: e.message }, e.status);
    return jsonResponse({ error: 'server' }, 500);
  }
}

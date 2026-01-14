import { jsonResponse, readJson } from '@/lib/server/http';
import { findUserByCredentials, UserType } from '@/lib/server/db';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

type LoginBody = {
  email: string;
  password: string;
  user_type: UserType;
};

export async function POST(request: Request) {
  const body = await readJson<LoginBody>(request);

  if (!body?.email || !body?.password || !body?.user_type) {
    return jsonResponse({ detail: 'Email, password, and user_type are required.' }, 400);
  }

  const user = findUserByCredentials(body.email, body.password, body.user_type);

  if (!user) {
    return jsonResponse({ detail: 'Invalid credentials.' }, 401);
  }

  const tokens = {
    access: randomUUID(),
    refresh: randomUUID(),
  };

  return jsonResponse({
    access: tokens.access,
    refresh: tokens.refresh,
    user: {
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
    },
  });
}

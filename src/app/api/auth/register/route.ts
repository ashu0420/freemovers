import { jsonResponse, readJson } from '@/lib/server/http';
import { createUser, findUserByEmail, UserType } from '@/lib/server/db';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

type RegisterBody = {
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  user_type: UserType;
  phone_number: string;
  preferred_locale?: 'en' | 'ja';
};

export async function POST(request: Request) {
  const body = await readJson<RegisterBody>(request);

  if (
    !body?.email ||
    !body?.password ||
    !body?.password2 ||
    !body?.first_name ||
    !body?.last_name ||
    !body?.user_type ||
    !body?.phone_number
  ) {
    return jsonResponse({ detail: 'All fields are required.' }, 400);
  }

  if (body.password !== body.password2) {
    return jsonResponse({ detail: 'Passwords do not match.' }, 400);
  }

  const existing = findUserByEmail(body.email);
  if (existing) {
    return jsonResponse({ detail: 'Email already registered.' }, 409);
  }

  const user = createUser({
    email: body.email,
    password: body.password,
    first_name: body.first_name,
    last_name: body.last_name,
    user_type: body.user_type,
    phone_number: body.phone_number,
    phone_verified: 0,
    preferred_locale: body.preferred_locale || 'ja',
    preferred_notification_channel: 'line',
    line_user_id: null,
    operating_regions_json: body.user_type === 'driver' ? JSON.stringify(['tokyo']) : JSON.stringify([]),
  });

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

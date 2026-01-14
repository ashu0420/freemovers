import { jsonResponse, readJson } from '@/lib/server/http';
import { normalizePhone } from '@/lib/server/guest';
import { markUsersPhoneVerified } from '@/lib/server/db';
import { checkPhoneVerification } from '@/lib/server/twilio-verify';

export const runtime = 'nodejs';

type CheckBody = {
  phone_number: string;
  code: string;
};

export async function POST(request: Request) {
  const body = await readJson<CheckBody>(request);
  if (!body?.phone_number || !body?.code) {
    return jsonResponse({ detail: 'phone_number and code are required.' }, 400);
  }

  const phone = normalizePhone(body.phone_number);
  const result = await checkPhoneVerification(phone, body.code);
  if (!result.ok) {
    return jsonResponse({ detail: result.reason }, 400);
  }
  if (!result.approved) {
    return jsonResponse({ detail: 'Verification code is incorrect or expired.' }, 400);
  }

  const updatedUsers = markUsersPhoneVerified(phone);
  return jsonResponse({ ok: true, phone_number: phone, updated_users: updatedUsers });
}

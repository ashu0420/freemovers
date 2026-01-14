import { jsonResponse, readJson } from '@/lib/server/http';
import { normalizePhone } from '@/lib/server/guest';
import { startPhoneVerification } from '@/lib/server/twilio-verify';

export const runtime = 'nodejs';

type StartBody = {
  phone_number: string;
};

export async function POST(request: Request) {
  const body = await readJson<StartBody>(request);
  if (!body?.phone_number) {
    return jsonResponse({ detail: 'phone_number is required.' }, 400);
  }

  const phone = normalizePhone(body.phone_number);
  const result = await startPhoneVerification(phone);
  if (!result.ok) {
    return jsonResponse({ detail: result.reason }, 400);
  }

  return jsonResponse({ ok: true, status: result.status, phone_number: phone });
}

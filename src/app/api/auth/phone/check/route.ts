import { jsonResponse, readJson } from '@/lib/server/http';
import { normalizePhone } from '@/lib/server/guest';
import { markUsersPhoneVerified } from '@/lib/server/db';
import { checkPhoneVerification } from '@/lib/server/otp';

export const runtime = 'nodejs';

// Simple in-memory rate limit keyed by IP: rolling window of request timestamps.
const RATE_LIMIT_MAX = 10; // requests
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // per minute
const rateLimitTimestamps = new Map<string, number[]>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = (rateLimitTimestamps.get(ip) || []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );
  if (bucket.length >= RATE_LIMIT_MAX) {
    rateLimitTimestamps.set(ip, bucket);
    return true;
  }
  bucket.push(now);
  rateLimitTimestamps.set(ip, bucket);
  return false;
}

type CheckBody = {
  phone_number: string;
  code: string;
};

export async function POST(request: Request) {
  if (rateLimited(getClientIp(request))) {
    return jsonResponse({ detail: 'Too many requests. Please try again later.' }, 429);
  }

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

import crypto from 'crypto';
import {
  consumePhoneOtp,
  createPhoneOtp,
  getActivePhoneOtp,
  incrementPhoneOtpAttempts,
} from '@/lib/server/db';

/**
 * Self-managed phone OTP verification.
 *
 * Codes are generated locally, stored (hashed) in SQLite with a short expiry,
 * and "delivered" via the pluggable sender below. The default sender logs the
 * code to the server console. No external SMS/Twilio account required.
 *
 * To send codes for real later, replace `deliverOtp` with a call to an email
 * or SMS provider; the rest of the flow stays the same.
 */

const CODE_LENGTH = 6;
const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

function isValidPhone(phone: string | undefined) {
  return !!phone && phone.startsWith('+') && phone.length >= 8;
}

function generateCode() {
  // Zero-padded 6-digit numeric code using a CSPRNG.
  const max = 10 ** CODE_LENGTH;
  return crypto.randomInt(0, max).toString().padStart(CODE_LENGTH, '0');
}

function hashCode(phone: string, code: string) {
  return crypto.createHash('sha256').update(`${phone}:${code}`).digest('hex');
}

async function deliverOtp(phone: string, code: string) {
  // Default sender: console. Swap for email/SMS to deliver for real.
  console.log(`[DEV OTP] ${phone} code: ${code} (valid ${CODE_TTL_MS / 60000}m)`);
}

export async function startPhoneVerification(to: string) {
  if (!isValidPhone(to)) {
    return { ok: false as const, reason: 'Invalid phone number format.' };
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
  createPhoneOtp({ phone: to, codeHash: hashCode(to, code), expiresAt });
  await deliverOtp(to, code);

  const result: { ok: true; status: string; devCode?: string } = {
    ok: true,
    status: 'pending',
  };
  // Surface the code in non-production so it can be entered without a real channel.
  if (process.env.NODE_ENV !== 'production') {
    result.devCode = code;
  }
  return result;
}

export async function checkPhoneVerification(to: string, code: string) {
  if (!isValidPhone(to)) {
    return { ok: false as const, reason: 'Invalid phone number format.' };
  }
  if (!code || code.trim().length < 4) {
    return { ok: false as const, reason: 'Invalid verification code.' };
  }

  const record = getActivePhoneOtp(to);
  if (!record) {
    return { ok: false as const, approved: false, reason: 'No active verification code. Request a new one.' };
  }
  if (new Date(record.expires_at).getTime() < Date.now()) {
    return { ok: false as const, approved: false, reason: 'Verification code expired. Request a new one.' };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false as const, approved: false, reason: 'Too many attempts. Request a new code.' };
  }

  const matches = crypto.timingSafeEqual(
    Buffer.from(record.code_hash, 'hex'),
    Buffer.from(hashCode(to, code.trim()), 'hex')
  );

  if (!matches) {
    incrementPhoneOtpAttempts(record.id);
    return { ok: true as const, approved: false };
  }

  consumePhoneOtp(record.id);
  return { ok: true as const, approved: true };
}

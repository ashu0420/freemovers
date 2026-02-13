import { createUser, findUserByEmail, UserRecord } from '@/lib/server/db';
import { randomUUID } from 'crypto';

export function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, '').trim();
}

function sanitizeForEmailPart(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

export function buildGuestEmail(phone: string) {
  const normalized = sanitizeForEmailPart(normalizePhone(phone));
  return `guest+${normalized || randomUUID().slice(0, 8)}@freemovers.local`;
}

export async function getOrCreateGuestCustomer(params: {
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
}): Promise<UserRecord> {
  const normalizedPhone = normalizePhone(params.phoneNumber);
  const email = buildGuestEmail(normalizedPhone);
  const existing = findUserByEmail(email);
  if (existing) return existing;

  return createUser({
    email,
    password: randomUUID(),
    first_name: params.firstName?.trim() || 'Guest',
    last_name: params.lastName?.trim() || 'Customer',
    user_type: 'customer',
    phone_number: normalizedPhone,
    phone_verified: 0,
    preferred_locale: 'ja',
    preferred_notification_channel: 'line',
    line_user_id: null,
    operating_regions_json: JSON.stringify([]),
  });
}

export function isGuestUserEmail(email: string) {
  return email.startsWith('guest+') && email.endsWith('@freemovers.local');
}

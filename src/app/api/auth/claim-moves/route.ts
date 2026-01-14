import { findUserById, findUserByPhone, reassignMovesToCustomer } from '@/lib/server/db';
import { isGuestUserEmail, normalizePhone } from '@/lib/server/guest';
import { jsonResponse, readJson } from '@/lib/server/http';

type ClaimBody = {
  user_id?: number;
};

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await readJson<ClaimBody>(request);
  const userId = body?.user_id;
  if (!userId || !Number.isFinite(userId)) {
    return jsonResponse({ detail: 'user_id is required.' }, 400);
  }

  const user = findUserById(userId);
  if (!user) {
    return jsonResponse({ detail: 'User not found.' }, 404);
  }

  const normalizedPhone = normalizePhone(user.phone_number);
  if (!normalizedPhone) {
    return jsonResponse({ claimed_moves: 0, source_accounts: 0 });
  }

  const samePhoneUsers = findUserByPhone(normalizedPhone);
  const guestAccounts = samePhoneUsers.filter(
    (candidate) => candidate.id !== user.id && isGuestUserEmail(candidate.email)
  );

  let claimedMoves = 0;
  for (const guest of guestAccounts) {
    claimedMoves += reassignMovesToCustomer(guest.id, user.id);
  }

  return jsonResponse({
    claimed_moves: claimedMoves,
    source_accounts: guestAccounts.length,
  });
}

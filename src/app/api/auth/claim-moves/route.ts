import { findUserById, findUserByPhone, reassignMovesToCustomer } from '@/lib/server/db';
import { isGuestUserEmail, normalizePhone } from '@/lib/server/guest';
import { HttpError, jsonResponse, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const session = await requireUser(request);
    // user_id is DERIVED from the authenticated session, never a client body.
    const userId = session.userId;

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
  } catch (e) {
    if (e instanceof HttpError) return jsonResponse({ error: e.message }, e.status);
    throw e;
  }
}

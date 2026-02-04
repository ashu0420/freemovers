/**
 * SMS notification channel.
 *
 * No external SMS provider (e.g. Twilio) is configured. This logs the message
 * to the server console and reports success so the notification fallback chain
 * (line -> whatsapp -> sms) still resolves in development.
 *
 * To deliver SMS for real, replace the body of `sendSmsTextMessage` with a call
 * to your provider of choice.
 */

function isValidPhone(phone: string | undefined | null): phone is string {
  return !!phone && phone.startsWith('+') && phone.length >= 8;
}

export async function sendSmsTextMessage(to: string | undefined | null, text: string) {
  if (!isValidPhone(to)) {
    console.warn('Invalid SMS phone number. Skipping notification.');
    return false;
  }

  console.log(`[DEV SMS] to: ${to}\n${text}`);
  return true;
}

type SmsConfig = {
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
};

function getConfig(): SmsConfig {
  return {
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioFromNumber: process.env.TWILIO_FROM_NUMBER,
  };
}

function isValidPhone(phone: string | undefined | null): phone is string {
  return !!phone && phone.startsWith('+') && phone.length >= 8;
}

export async function sendSmsTextMessage(to: string | undefined | null, text: string) {
  const config = getConfig();
  if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioFromNumber) {
    console.warn('SMS not configured. Skipping notification.');
    return false;
  }

  if (!isValidPhone(to)) {
    console.warn('Invalid SMS phone number. Skipping notification.');
    return false;
  }
  const recipient = to;

  const body = new URLSearchParams({
    To: recipient,
    From: config.twilioFromNumber,
    Body: text,
  });

  const auth = Buffer.from(
    `${config.twilioAccountSid}:${config.twilioAuthToken}`,
    'utf8'
  ).toString('base64');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let response: Response | null = null;

  try {
    response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        signal: controller.signal,
      }
    );
  } catch (error) {
    console.warn('SMS send failed (network):', error);
    return false;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const error = await response.text();
    console.warn('SMS send failed:', error);
    return false;
  }

  const result = await response.json().catch(() => null);
  console.log('SMS send success:', result);
  return true;
}

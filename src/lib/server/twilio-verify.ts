type TwilioVerifyConfig = {
  accountSid?: string;
  authToken?: string;
  verifyServiceSid?: string;
};

function getConfig(): TwilioVerifyConfig {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
  };
}

function getAuthHeader(accountSid: string, authToken: string) {
  const token = Buffer.from(`${accountSid}:${authToken}`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

function isValidPhone(phone: string | undefined) {
  return !!phone && phone.startsWith('+') && phone.length >= 8;
}

export async function startPhoneVerification(to: string) {
  const config = getConfig();
  if (!config.accountSid || !config.authToken || !config.verifyServiceSid) {
    return { ok: false as const, reason: 'Twilio Verify is not configured.' };
  }
  if (!isValidPhone(to)) {
    return { ok: false as const, reason: 'Invalid phone number format.' };
  }

  const body = new URLSearchParams({
    To: to,
    Channel: 'sms',
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${config.verifyServiceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          Authorization: getAuthHeader(config.accountSid, config.authToken),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.warn('Twilio Verify start failed:', error);
      return { ok: false as const, reason: 'Failed to send verification code.' };
    }

    const data = (await response.json()) as { status?: string };
    return { ok: true as const, status: data.status || 'pending' };
  } catch (error) {
    console.warn('Twilio Verify start network failure:', error);
    return { ok: false as const, reason: 'Verification service is unavailable.' };
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkPhoneVerification(to: string, code: string) {
  const config = getConfig();
  if (!config.accountSid || !config.authToken || !config.verifyServiceSid) {
    return { ok: false as const, reason: 'Twilio Verify is not configured.' };
  }
  if (!isValidPhone(to)) {
    return { ok: false as const, reason: 'Invalid phone number format.' };
  }
  if (!code || code.trim().length < 4) {
    return { ok: false as const, reason: 'Invalid verification code.' };
  }

  const body = new URLSearchParams({
    To: to,
    Code: code.trim(),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${config.verifyServiceSid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          Authorization: getAuthHeader(config.accountSid, config.authToken),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.warn('Twilio Verify check failed:', error);
      return { ok: false as const, approved: false, reason: 'Failed to verify code.' };
    }

    const data = (await response.json()) as { status?: string; valid?: boolean };
    const approved = data.status === 'approved' || data.valid === true;
    return { ok: true as const, approved };
  } catch (error) {
    console.warn('Twilio Verify check network failure:', error);
    return { ok: false as const, approved: false, reason: 'Verification service is unavailable.' };
  } finally {
    clearTimeout(timeout);
  }
}

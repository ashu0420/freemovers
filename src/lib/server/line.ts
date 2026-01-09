type LineConfig = {
  channelAccessToken?: string;
};

function getConfig(): LineConfig {
  return {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  };
}

export async function sendLineTextMessage(to: string | null | undefined, text: string) {
  const config = getConfig();
  if (!config.channelAccessToken || !to) {
    console.warn('LINE not configured or missing recipient. Skipping notification.');
    return false;
  }

  const payload = {
    to,
    messages: [{ type: 'text', text }],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let response: Response | null = null;
  try {
    response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.channelAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    console.warn('LINE send failed (network):', error);
    return false;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const error = await response.text();
    console.warn('LINE send failed:', error);
    return false;
  }

  return true;
}

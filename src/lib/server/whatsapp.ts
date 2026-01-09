type WhatsAppConfig = {
  phoneNumberId?: string;
  accessToken?: string;
  templateName?: string;
  templateLang?: string;
  moveRequestTemplateName?: string;
};

function getConfig(): WhatsAppConfig {
  return {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    templateName: process.env.WHATSAPP_TEMPLATE_NAME,
    templateLang: process.env.WHATSAPP_TEMPLATE_LANG || 'en_US',
    moveRequestTemplateName: process.env.WHATSAPP_TEMPLATE_NAME_MOVE_REQUEST,
  };
}

function isValidPhone(phone: string | undefined) {
  return !!phone && phone.startsWith('+') && phone.length >= 8;
}

export async function sendWhatsAppTemplateMessage(
  to: string | undefined,
  bodyParams: string[],
  templateOverride?: string
) {
  const config = getConfig();
  const templateName = templateOverride || config.templateName;
  if (!config.phoneNumberId || !config.accessToken || !templateName) {
    console.warn('WhatsApp not configured. Skipping notification.');
    return false;
  }
  if (!isValidPhone(to)) {
    console.warn('Invalid WhatsApp phone number. Skipping notification.');
    return false;
  }

  console.log('WhatsApp send attempt:', {
    to,
    templateName,
    templateLang: config.templateLang,
    bodyParams,
  });

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: config.templateLang },
      components: [
        {
          type: 'body',
          parameters: bodyParams.map((text) => ({ type: 'text', text })),
        },
      ],
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let response: Response | null = null;
  try {
    response = await fetch(
      `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }
    );
  } catch (error) {
    console.warn('WhatsApp send failed (network):', error);
    return false;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const error = await response.text();
    console.warn('WhatsApp send failed:', error);
    return false;
  }

  const data = await response.json().catch(() => null);
  console.log('WhatsApp send success:', data);
  return true;
}

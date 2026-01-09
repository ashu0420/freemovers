import { UserRecord } from '@/lib/server/db';
import { sendLineTextMessage } from '@/lib/server/line';
import { sendSmsTextMessage } from '@/lib/server/sms';
import { sendWhatsAppTemplateMessage } from '@/lib/server/whatsapp';

type CustomerMoveNotification = {
  customer: UserRecord | undefined;
  pickupAddress: string;
  dropoffAddress: string;
  moveDate: string;
  quoteAmount?: number;
  whatsappTemplateOverride?: string;
};

function inferJapanProfile(customer: UserRecord | undefined, pickupAddress: string, dropoffAddress: string) {
  if (!customer) return false;
  if (customer.phone_number?.startsWith('+81')) return true;
  const lowered = `${pickupAddress} ${dropoffAddress}`.toLowerCase();
  return lowered.includes('tokyo') || lowered.includes('osaka') || lowered.includes('japan');
}

function buildLineMessage(input: CustomerMoveNotification) {
  const quote =
    typeof input.quoteAmount === 'number'
      ? `\nQuoted amount: JPY ${Math.round(input.quoteAmount).toLocaleString('en-US')}`
      : '';
  return `Move update\nFrom: ${input.pickupAddress}\nTo: ${input.dropoffAddress}\nDate: ${input.moveDate}${quote}`;
}

export async function sendCustomerMoveNotification(input: CustomerMoveNotification) {
  if (!input.customer) return;

  const lineMessage = buildLineMessage(input);
  const whatsappParams = [
    input.pickupAddress,
    input.dropoffAddress,
    input.moveDate,
    typeof input.quoteAmount === 'number' ? input.quoteAmount.toFixed(2) : 'Pending',
  ];

  const sendByChannel = async (channel: 'line' | 'whatsapp' | 'sms') => {
    if (channel === 'line') {
      return sendLineTextMessage(input.customer?.line_user_id, lineMessage);
    }

    if (channel === 'sms') {
      return sendSmsTextMessage(input.customer?.phone_number, lineMessage);
    }

    return sendWhatsAppTemplateMessage(
      input.customer?.phone_number,
      whatsappParams,
      input.whatsappTemplateOverride
    );
  };

  const preferred = input.customer.preferred_notification_channel;
  const isJapanProfile = inferJapanProfile(input.customer, input.pickupAddress, input.dropoffAddress);

  let channelOrder: Array<'line' | 'whatsapp' | 'sms'>;
  if (preferred === 'sms') {
    channelOrder = ['sms', 'line', 'whatsapp'];
  } else if (preferred === 'whatsapp') {
    channelOrder = ['whatsapp', 'line', 'sms'];
  } else if (isJapanProfile) {
    channelOrder = ['line', 'whatsapp', 'sms'];
  } else {
    channelOrder = ['line', 'whatsapp', 'sms'];
  }

  for (const channel of channelOrder) {
    const ok = await sendByChannel(channel);
    if (ok) return;
  }
}

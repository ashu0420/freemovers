import { getFeatureFlagOverrides, setFeatureFlagOverride } from '@/lib/server/db';

/**
 * Feature-flag registry. Flags are defined here (source of truth for what
 * exists + defaults) and can be overridden at runtime via the admin dashboard
 * (persisted in the `feature_flags` table).
 *
 * Enforcement is UI-only: the client reads `/api/flags` and hides/disables
 * controls for disabled features. `isFeatureEnabled` is provided for future
 * server-side enforcement if needed.
 */

export type FeatureFlagGroup =
  | 'Notifications'
  | 'Auth'
  | 'Customer'
  | 'Driver'
  | 'Location';

export type FeatureFlagDefinition = {
  key: string;
  label: string;
  description: string;
  group: FeatureFlagGroup;
  defaultEnabled: boolean;
};

export type FeatureFlag = FeatureFlagDefinition & { enabled: boolean };

export const FEATURE_FLAGS: FeatureFlagDefinition[] = [
  {
    key: 'otp',
    label: 'Phone OTP verification',
    description: 'Require phone-number verification via a one-time code.',
    group: 'Auth',
    defaultEnabled: true,
  },
  {
    key: 'driver_signup',
    label: 'Driver signup',
    description: 'Allow new users to register as drivers.',
    group: 'Auth',
    defaultEnabled: true,
  },
  {
    key: 'notify_line',
    label: 'LINE notifications',
    description: 'Send move notifications through the LINE channel.',
    group: 'Notifications',
    defaultEnabled: true,
  },
  {
    key: 'notify_whatsapp',
    label: 'WhatsApp notifications',
    description: 'Send move notifications through the WhatsApp channel.',
    group: 'Notifications',
    defaultEnabled: true,
  },
  {
    key: 'notify_sms',
    label: 'SMS notifications',
    description: 'Send move notifications through the SMS channel.',
    group: 'Notifications',
    defaultEnabled: true,
  },
  {
    key: 'guest_moves',
    label: 'Guest move requests',
    description: 'Allow unauthenticated visitors to request a move.',
    group: 'Customer',
    defaultEnabled: true,
  },
  {
    key: 'quotes_negotiation',
    label: 'Quotes & negotiation',
    description: 'Let customers view quotes, negotiate, and accept a driver.',
    group: 'Customer',
    defaultEnabled: true,
  },
  {
    key: 'driver_quotes',
    label: 'Driver quoting',
    description: 'Let drivers browse available jobs and submit quotes.',
    group: 'Driver',
    defaultEnabled: true,
  },
  {
    key: 'driver_stats',
    label: 'Driver stats',
    description: 'Show the driver earnings / completed-jobs dashboard.',
    group: 'Driver',
    defaultEnabled: true,
  },
  {
    key: 'driver_notifications',
    label: 'Driver notifications feed',
    description: 'Show drivers their in-app notifications feed.',
    group: 'Driver',
    defaultEnabled: true,
  },
  {
    key: 'map_picker',
    label: 'Map location picker',
    description: 'Enable the Leaflet map + geolocation address picker.',
    group: 'Location',
    defaultEnabled: true,
  },
  {
    key: 'jp_postal_lookup',
    label: 'JP postal-code lookup',
    description: 'Resolve Japanese postal codes to addresses.',
    group: 'Location',
    defaultEnabled: true,
  },
];

const VALID_KEYS = new Set(FEATURE_FLAGS.map((f) => f.key));

export function isValidFlagKey(key: string): boolean {
  return VALID_KEYS.has(key);
}

/** Full flag objects with runtime `enabled` state merged in. */
export function getAllFlags(): FeatureFlag[] {
  const overrides = new Map(getFeatureFlagOverrides().map((o) => [o.key, o.enabled]));
  return FEATURE_FLAGS.map((def) => ({
    ...def,
    enabled: overrides.has(def.key) ? (overrides.get(def.key) as boolean) : def.defaultEnabled,
  }));
}

/** Compact `{ key: enabled }` map for the public endpoint / client. */
export function getFlagMap(): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const flag of getAllFlags()) {
    map[flag.key] = flag.enabled;
  }
  return map;
}

export function setFlag(key: string, enabled: boolean): boolean {
  if (!isValidFlagKey(key)) return false;
  setFeatureFlagOverride(key, enabled);
  return true;
}

/** Server-side helper for future enforcement (not used by the UI-only v1). */
export function isFeatureEnabled(key: string): boolean {
  return getFlagMap()[key] ?? true;
}

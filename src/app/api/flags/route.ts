import { jsonResponse } from '@/lib/server/http';
import { getFlagMap } from '@/lib/server/feature-flags';

export const runtime = 'nodejs';

// Public, read-only: the client reads this to hide/disable UI for disabled features.
export async function GET() {
  return jsonResponse({ flags: getFlagMap() });
}

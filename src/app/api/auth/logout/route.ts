import { jsonResponse, readJson } from '@/lib/server/http';

type LogoutBody = {
  refresh: string;
};

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await readJson<LogoutBody>(request);

  if (!body?.refresh) {
    return jsonResponse({ detail: 'Refresh token is required.' }, 400);
  }

  return jsonResponse({ ok: true });
}

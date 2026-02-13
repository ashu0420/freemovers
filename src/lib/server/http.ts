import { NextResponse } from 'next/server';

export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    const text = await request.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// --- Web Crypto session helpers (edge + node compatible) ---

const SESSION_COOKIE = 'fm_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me'
  );
}

function base64urlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

interface SessionPayload {
  userId: number;
  role: string;
  exp: number;
}

function getCrypto(): SubtleCrypto {
  const c = globalThis.crypto?.subtle;
  if (!c) {
    throw new Error('Web Crypto API is not available in this environment');
  }
  return c;
}

async function hmac(payloadB64: string): Promise<string> {
  const key = await getCrypto().importKey(
    'raw',
    getSecretKey(),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await getCrypto().sign('HMAC', key, new TextEncoder().encode(payloadB64));
  return base64urlEncode(new Uint8Array(sig));
}

export async function signSession(payload: { userId: number; role: string }): Promise<string> {
  const full: SessionPayload = {
    userId: payload.userId,
    role: payload.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(full)));
  const sig = await hmac(payloadB64);
  return `${payloadB64}.${sig}`;
}

export async function verifySession(
  token: string | undefined | null
): Promise<{ userId: number; role: string } | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;

  // Constant-time-ish signature check.
  const expectedSig = await hmac(payloadB64);
  if (!timingSafeEqualString(sig, expectedSig)) return null;

  try {
    const json = new TextDecoder().decode(base64urlDecode(payloadB64));
    const data = JSON.parse(json) as SessionPayload;
    if (!data || typeof data.userId !== 'number' || typeof data.exp !== 'number') {
      return null;
    }
    if (Math.floor(Date.now() / 1000) > data.exp) return null;
    return { userId: data.userId, role: data.role ?? 'customer' };
  } catch {
    return null;
  }
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function setSessionCookie(res: NextResponse<unknown>, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse<unknown>): void {
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export async function requireUser(req: Request): Promise<{ userId: number; role: string }> {
  const cookieValue = (req as Request & { cookies?: { get(name: string): { value: string } | undefined } })
    .cookies?.get(SESSION_COOKIE)?.value;
  const session = await verifySession(cookieValue);
  if (!session) {
    throw new HttpError(401, 'unauthenticated');
  }
  return session;
}

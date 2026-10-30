export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  department?: string | null;
  exp: number; // Expiry timestamp in seconds
}

export const AUTH_COOKIE_NAME = 'qd_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'qualitydeck-secure-secret-key-iso9001-2026';

// Helper for Base64 URL decoding compatible across all runtimes
export function decodeBase64Url(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  if (typeof atob === 'function') {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(base64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

// Helper for Base64 URL encoding compatible across all runtimes
export function encodeBase64Url(str: string): string {
  let base64: string;
  if (typeof btoa === 'function') {
    base64 = btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  } else {
    base64 = Buffer.from(str, 'utf-8').toString('base64');
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signString(data: string, secret: string = SESSION_SECRET): Promise<string> {
  const enc = new TextEncoder();
  const key = await getHmacKey(secret);
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifySessionToken(token?: string | null): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [base64Payload, signature] = parts;
  try {
    const expectedSig = await signString(base64Payload, SESSION_SECRET);
    if (signature !== expectedSig) {
      return null;
    }

    const jsonStr = decodeBase64Url(base64Payload);
    const payload = JSON.parse(jsonStr) as SessionPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

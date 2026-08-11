import { ENV_KEYS } from './constants.ts';

const TOKEN_PREFIX = 'mlt2';
const DEFAULT_TOKEN_TTL_SECONDS = 10 * 60;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface MemberLookupTokenPayload {
  memberId: string;
  eventSlug: string | null;
  iat: number;
  exp: number;
}

type EncodedTokenPayload = {
  v: 1;
  mid: string;
  ev?: string;
  iat: number;
  exp: number;
};

function getSigningSecret(): string | null {
  const explicitSecret = Deno.env.get(ENV_KEYS.edgeTokenEncryptionSecret)?.trim() ?? '';
  if (explicitSecret.length > 0) {
    return explicitSecret;
  }

  console.error(`Token secret is not configured. Set ${ENV_KEYS.edgeTokenEncryptionSecret}.`);
  return null;
}

function toBase64Url(input: Uint8Array): string {
  const binary = Array.from(input, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string): Uint8Array | null {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : `${normalized}${'='.repeat(4 - padding)}`;

  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function importEncryptionKey(secret: string): Promise<CryptoKey> {
  const secretDigest = await crypto.subtle.digest('SHA-256', textEncoder.encode(secret));
  return crypto.subtle.importKey('raw', secretDigest, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function createMemberLookupToken(
  memberId: string,
  eventSlug: string | null,
): Promise<string | null> {
  const normalizedMemberId = memberId.trim();
  if (!normalizedMemberId) {
    return null;
  }

  const secret = getSigningSecret();
  if (!secret) {
    return null;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: EncodedTokenPayload = {
    v: 1,
    mid: normalizedMemberId,
    iat: nowSeconds,
    exp: nowSeconds + DEFAULT_TOKEN_TTL_SECONDS,
  };

  const normalizedEventSlug = eventSlug?.trim() ?? '';
  if (normalizedEventSlug.length > 0) {
    payload.ev = normalizedEventSlug;
  }

  const key = await importEncryptionKey(secret);
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBytes = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      textEncoder.encode(JSON.stringify(payload)),
    ),
  );
  const ivSegment = toBase64Url(ivBytes);
  const payloadSegment = toBase64Url(encryptedBytes);

  return `${TOKEN_PREFIX}.${ivSegment}.${payloadSegment}`;
}

export async function decodeMemberLookupToken(
  token: string,
): Promise<MemberLookupTokenPayload | null> {
  const secret = getSigningSecret();
  if (!secret) {
    return null;
  }

  const normalizedToken = token.trim();
  const [prefix, ivSegment, payloadSegment] = normalizedToken.split('.');

  if (!prefix || !ivSegment || !payloadSegment || prefix !== TOKEN_PREFIX) {
    return null;
  }

  const ivBytes = fromBase64Url(ivSegment);
  const encryptedBytes = fromBase64Url(payloadSegment);

  if (!ivBytes || !encryptedBytes || ivBytes.length !== 12) {
    return null;
  }

  const ivForDecrypt = Uint8Array.from(ivBytes);
  const encryptedForDecrypt = Uint8Array.from(encryptedBytes);

  const key = await importEncryptionKey(secret);

  let parsedPayload: unknown;
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivForDecrypt },
      key,
      encryptedForDecrypt,
    );
    parsedPayload = JSON.parse(textDecoder.decode(new Uint8Array(decrypted)));
  } catch {
    return null;
  }

  if (typeof parsedPayload !== 'object' || parsedPayload === null) {
    return null;
  }

  const encoded = parsedPayload as Partial<EncodedTokenPayload>;
  if (
    encoded.v !== 1 ||
    typeof encoded.mid !== 'string' ||
    encoded.mid.trim().length === 0 ||
    typeof encoded.iat !== 'number' ||
    !Number.isFinite(encoded.iat) ||
    typeof encoded.exp !== 'number' ||
    !Number.isFinite(encoded.exp)
  ) {
    return null;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (encoded.exp < nowSeconds) {
    return null;
  }

  return {
    memberId: encoded.mid.trim(),
    eventSlug: typeof encoded.ev === 'string' && encoded.ev.trim().length > 0 ? encoded.ev : null,
    iat: encoded.iat,
    exp: encoded.exp,
  };
}

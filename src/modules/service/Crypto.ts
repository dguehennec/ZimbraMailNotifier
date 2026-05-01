// ============================================================
// modules/service/Crypto.ts — AES-GCM password encryption
// Uses the native Web Crypto API (available in service workers)
// ============================================================

const ALGO = 'AES-GCM';
const KEY_LEN = 256;
const IV_LEN = 12; // 96-bit IV recommended for GCM
const SALT = 'ZimbraMailNotifier';
const HKDF_INFO = 'password-v1';

let _cachedKey: CryptoKey | null = null;
let _cachedExtensionId: string | null = null;

function getExtensionId(): string {
  return chrome.runtime.id;
}

async function deriveKeyFromExtensionId(extensionId: string): Promise<CryptoKey> {
  const ikm = new TextEncoder().encode(extensionId);

  const baseKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveKey']);

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(SALT),
      info: new TextEncoder().encode(HKDF_INFO),
    },
    baseKey,
    { name: ALGO, length: KEY_LEN },
    false,
    ['encrypt', 'decrypt']
  );
}

async function getDerivedKey(): Promise<CryptoKey> {
  const extensionId = getExtensionId();
  if (_cachedKey && _cachedExtensionId === extensionId) return _cachedKey;

  _cachedExtensionId = extensionId;
  _cachedKey = await deriveKeyFromExtensionId(extensionId);
  return _cachedKey;
}

/** @internal Clears the cached key (for unit tests). */
export function resetCryptoKeyCache(): void {
  _cachedKey = null;
  _cachedExtensionId = null;
}

/** Encrypt a plaintext string, returns base64url-encoded ciphertext (IV prepended). */
export async function encryptPassword(plaintext: string): Promise<string> {
  const key = await getDerivedKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const encoded = new TextEncoder().encode(plaintext);

  const cipher = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded);

  const combined = new Uint8Array(IV_LEN + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), IV_LEN);

  return btoa(String.fromCharCode(...combined));
}

/** Decrypt a base64url-encoded ciphertext (IV prepended). Returns empty string on failure. */
export async function decryptPassword(ciphertext: string): Promise<string> {
  try {
    if (!ciphertext) return '';
    const key = await getDerivedKey();
    const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, IV_LEN);
    const data = combined.slice(IV_LEN);

    const plain = await crypto.subtle.decrypt({ name: ALGO, iv }, key, data);
    return new TextDecoder().decode(plain);
  } catch {
    return '';
  }
}

import {
  encryptPassword,
  decryptPassword,
  resetCryptoKeyCache,
} from '../src/modules/service/Crypto';
import { TEST_EXTENSION_ID } from './setup';

describe('Crypto', () => {
  beforeEach(() => {
    resetCryptoKeyCache();
    (globalThis as typeof globalThis & { chrome: { runtime: { id: string } } }).chrome.runtime.id =
      TEST_EXTENSION_ID;
  });

  it('round-trips a password', async () => {
    const plain = 'S3cretP@ss!';
    const encrypted = await encryptPassword(plain);
    expect(encrypted).not.toBe(plain);
    expect(await decryptPassword(encrypted)).toBe(plain);
  });

  it('returns empty string for empty ciphertext', async () => {
    expect(await decryptPassword('')).toBe('');
  });

  it('returns empty string for invalid ciphertext', async () => {
    expect(await decryptPassword('not-valid-base64!!!')).toBe('');
  });

  it('produces different ciphertext for the same password', async () => {
    const a = await encryptPassword('same');
    const b = await encryptPassword('same');
    expect(a).not.toBe(b);
  });

  it('binds ciphertext to chrome.runtime.id', async () => {
    const encrypted = await encryptPassword('bound-secret');

    resetCryptoKeyCache();
    (globalThis as typeof globalThis & { chrome: { runtime: { id: string } } }).chrome.runtime.id =
      'other-extension-id';

    expect(await decryptPassword(encrypted)).toBe('');
  });

  it('uses chrome.runtime.id in key derivation', async () => {
    expect(chrome.runtime.id).toBe(TEST_EXTENSION_ID);
    const encrypted = await encryptPassword('id-check');
    expect(await decryptPassword(encrypted)).toBe('id-check');
  });
});

// ============================================================
// modules/service/Util.ts
// ============================================================

import { Constants } from '../constant/constants';
import { NetworkError, MailMessage } from '../../types';

/** i18n */

export function i18n(key: string, ...subs: string[]): string {
  try {
    return chrome.i18n.getMessage(key, subs) || key;
  } catch {
    return key;
  }
}

/** Generate a random hex string of given byte length. */
export function randomHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Sleep for `ms` milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getOriginUrl(serverUrl: string): string {
   try {
    const url = new URL(serverUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return '';
    }
    if (!url.origin || url.origin === 'null') {
      return '';
    }
    return url.origin;
  } catch (error) {
    return '';
  }
}

export async function requestOriginPermission(serverUrl: string): Promise<boolean> {
  const origin = getOriginUrl(serverUrl);
  if (!origin) {
    return false;
  }
  try {
    const origins = [`${origin}/*`];
    return await chrome.permissions.request({ origins });
  } catch (error) {
    return false;
  }
}

export async function checkOriginPermission(serverUrl: string): Promise<boolean> {
  const origin = getOriginUrl(serverUrl);
  if (!origin) {
    return false;
  }
  try {
    const origins = [`${origin}/*`];
    return await chrome.permissions.contains({ origins });
  } catch (error) {
    return false;
  }
}

/**
 * Retry an async operation with exponential back-off + jitter.
 * Only retries on NetworkError (retriable = true).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    factor?: number;
    jitterMs?: number;
    shouldRetry?: (err: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = Constants.RETRY.MAX_ATTEMPTS,
    baseDelayMs = Constants.RETRY.BASE_DELAY_MS,
    maxDelayMs = Constants.RETRY.MAX_DELAY_MS,
    factor = Constants.RETRY.BACKOFF_FACTOR,
    jitterMs = Constants.RETRY.JITTER_MS,
    shouldRetry = (e) => e instanceof NetworkError && e.retriable,
  } = opts;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition -- retry until success or attempts exhausted
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= maxAttempts || !shouldRetry(err)) throw err;
      const base = Math.min(baseDelayMs * Math.pow(factor, attempt - 1), maxDelayMs);
      const jitter = Math.random() * jitterMs;
      await sleep(base + jitter);
    }
  }
}

/** Return items from `incoming` whose id was not present in `previous`. */
export function filterNewItemsById<T extends { id: string }>(
  previous: T[],
  incoming: T[]
): T[] {
  const oldIds = new Set(previous.map((item) => item.id));
  return incoming.filter((item) => !oldIds.has(item.id));
}

/** Filter messages by regex on from, subject, and body. Empty pattern disables filtering. */
export function filterMessagesByRegex(messages: MailMessage[], pattern: string): MailMessage[] {
  const trimmed = pattern?.trim() ?? '';
  if (!trimmed) return messages;

  let regex: RegExp;
  try {
    regex = new RegExp(trimmed, 'i');
  } catch {
    return messages;
  }

  return messages.filter(
    (m) => regex.test(m.from) || regex.test(m.subject) || regex.test(m.abstract),
  );
}

/** Safe JSON parse – returns null on error instead of throwing. */
export function safeJson<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function weekDate(date: Date) {
    // If we are in december, this is possible that we are in W1 of the next year
    if (date.getMonth() === 11) {
        const dateW1NextY = dateBeginW1(date.getFullYear() + 1);
        if (date >= dateW1NextY) {
            // We are in the first week of the next year
            return 1;
        }
    }
    // General case
    const dateW1 = dateBeginW1(date.getFullYear());
    const diffDays = Math.floor((date.getTime() - dateW1.getTime()) / 86400000);
    return Math.floor(diffDays / 7) + 1;
}

function dateBeginW1(year: number): Date {
    const dateDay4 = new Date(year, 0, 4, 0, 0, 0, 0);
    return new Date(dateDay4.getTime() - (dateDay4.getDay() * 86400000));
}
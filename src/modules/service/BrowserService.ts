// ============================================================
// modules/service/BrowserService.ts
// ============================================================

import { Logger } from './Logger';
import { Prefs } from './Prefs';

const log = new Logger('BrowserService');

const DEFAULT_NOTIFICATION_ICON = 'skin/images/zimbra_mail_notifier_48.png';

function toExtensionUrl(path: string): string {
  if (path.startsWith('chrome-extension://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const normalized = path.replace(/^\.\/+/, '').replace(/^\//, '');
  return chrome.runtime.getURL(normalized);
}

function serializeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function tabMatchesWebInterface(tabUrl: string | undefined, targetUrl: string): boolean {
  if (!tabUrl) return false;
  return new URL(tabUrl).origin === new URL(targetUrl).origin && tabUrl.toLowerCase().startsWith(targetUrl.toLowerCase());
}

export const BrowserService = {
  /** Send a desktop notification. */
  async notify(title: string, body: string, duration?: number, iconUrl?: string): Promise<void> {
    const safeTitle = title?.trim() || 'Zimbra Mail Notifier';
    const safeBody = body?.trim() || ' ';
    const resolvedIcon = toExtensionUrl(iconUrl ?? DEFAULT_NOTIFICATION_ICON);

    try {
      const id = `zmn-${Date.now()}`;
      await chrome.notifications.create(id, {
        type: 'basic',
        iconUrl: resolvedIcon,
        title: safeTitle,
        message: safeBody,
      });
      const time = duration ?? 8
      if ( time > 0) {
        setTimeout(() => chrome.notifications.clear(id), time * 1000);
      }
    } catch (e) {
      log.error('Failed to show notification', {
        error: serializeError(e),
        title: safeTitle,
      });
    }
  },

  /** Update cookies from Zimbra auth. */
  async updateCookies(url: string, authToken: string, sid?: string | null): Promise<void> {
    const prefs = Prefs.get();
    if (!prefs.browserSetCookies || !url || !authToken) return;
    try {
      await chrome.cookies.set({
        url,
        name: 'ZM_AUTH_TOKEN',
        value: authToken,
        httpOnly: prefs.browserCookieHttpOnly,
        secure: url.startsWith('https'),
      });
      if (sid) {
        await chrome.cookies.set({
          url,
          name: 'SID',
          value: sid,
          httpOnly: prefs.browserCookieHttpOnly,
          secure: url.startsWith('https'),
        });
      }
    } catch (e) {
      log.warn('Failed to set cookie', e);
    }
  },

  /** Clear Zimbra cookies for a URL. */
  async clearCookies(url: string): Promise<void> {
    if (!url) return;
    try {
      await chrome.cookies.remove({ url, name: 'ZM_AUTH_TOKEN' });
      await chrome.cookies.remove({ url, name: 'SID' });
    } catch (e) {
      log.warn('Failed to clear cookie', e);
    }
  },

  /** Open or focus the Zimbra web interface tab (one tab per site origin). */
  async openWebInterface(url: string): Promise<void> {
    if (!url) return;
    try {
      const tabs = await chrome.tabs.query({});
      const existing = tabs.find((tab) => tabMatchesWebInterface(tab.url, url));

      if (existing?.id !== undefined) {
        await chrome.tabs.update(existing.id, { active: true });
        return;
      }

      await chrome.tabs.create({ url });
    } catch (e) {
      log.error('Failed to open tab', e);
    }
  },
};

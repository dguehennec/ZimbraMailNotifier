// ============================================================
// ui/uiutil.ts
// ============================================================

import { MailboxInfo, ErrorEntry, RequestStatus, ControllerInfo } from '../types';

// ─── i18n ────────────────────────────────────────────────────

export const i18n = Object.assign(
  function i18n(key: string, ...subs: string[]): string {
    try {
      return chrome.i18n.getMessage(key, subs) || key;
    } catch {
      return key;
    }
  },
  {
    /** Apply msg="key" and msgtitle="key" attributes to all elements in root. */
    applyAll(root: Document | HTMLElement = document): void {
      (root instanceof Document ? root : root.ownerDocument ?? document)
        .querySelectorAll('[msg]')
        .forEach((el) => {
          const key = el.getAttribute('msg')!;
          el.textContent = i18n(key);
        });
      (root instanceof Document ? root : root.ownerDocument ?? document)
        .querySelectorAll('[msgtitle]')
        .forEach((el) => {
          const key = el.getAttribute('msgtitle')!;
          (el as HTMLElement).title = i18n(key);
        });
    },
  }
);

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

export async function ensureOriginPermission(serverUrl: string): Promise<boolean> {
  const origin = getOriginUrl(serverUrl);
  if (!origin) {
    return false;
  }
  try {
    const origins = [`${origin}/*`];
    if (await chrome.permissions.contains({ origins })) {
      return true;
    }
    return await chrome.permissions.request({ origins });
  } catch (error) {
    return false;
  }
}

export function formatLastErrorMessage(lastErr: ErrorEntry): string {
  let message = "";
  if (lastErr !== null) {
    switch (lastErr.status) {
      case RequestStatus.WAITSET_INVALID:
        message = i18n('connector_error_wait');
        break;
      case RequestStatus.REQUEST_INVALID:
        message = i18n('connector_error_req_invalid');
        break;
      case RequestStatus.TIMEOUT:
        message = i18n('connector_error_req_timeout');
        break;
      case RequestStatus.SERVER_ERROR:
        message = i18n('connector_error_req_server');
        break;
      case RequestStatus.NETWORK_ERROR:
        message = i18n('connector_error_req_network');
        break;
      case RequestStatus.AUTH_REQUIRED:
        message = i18n('connector_error_req_authreq');
        break;
      case RequestStatus.TWOFA_AUTHENTICATION_REQUIRED:
        message = i18n('option_identifiant_2fatoken_label');
        break;
      case RequestStatus.LOGIN_INVALID:
        message = i18n('connector_error_req_logininvalid');
        break;
      case RequestStatus.INTERNAL_ERROR:
      default:
        message = i18n('connector_error_req_internal');
        break;
    }
  }
  return message.replace('%REASON%', '');
}

// ─── Background messaging ─────────────────────────────────────

export async function sendToBackground(func: string, ...args: unknown[]): Promise<unknown> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { source: 'popup', func, args },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
        } else {
          resolve(response);
        }
      }
    );
  });
}

// ─── Date formatting ─────────────────────────────────────────

export function formatRelativeDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) ;
}


export function formatRelativeDateTime(date: Date): string {
  return formatRelativeDate(date) + ' ' + formatRelativeTime(date)
}

export function formatRelativeTime(date: Date): string {
  return date.toLocaleTimeString().substring(0, 5) + date.toLocaleTimeString().substring(8)
}

export function formatAccountName(account: ControllerInfo | undefined, nbAccount: number): string {
  if (account && nbAccount > 1) {
    return ` (${account.accountAlias || account.accountLogin || account.id})`;
  }
  return '';
}


export function formatBytes(bytes: number): string {
  let v = 0;
  let unit = 'unit_bytes_B';

  if (bytes >= 1099511627776) {
      v = bytes / 1099511627776;
      unit = 'unit_bytes_TB';
  }
  else if (bytes >= 1073741824) {
      v = bytes / 1073741824;
      unit = 'unit_bytes_GB';
  }
  else if (bytes >= 1048576) {
      v = bytes / 1048576;
      unit = 'unit_bytes_MB';
  }
  else if (bytes >= 1024) {
      v = bytes / 1024;
      unit = 'unit_bytes_KB';
  }
  else if (bytes >= 0) {
      v = bytes;
  }

  return v.toFixed(1).replace('.0', '') + ' ' + i18n(unit);
}

export function formatPercentageQuotaUsed(mailBoxInfo : MailboxInfo): string {
    if (mailBoxInfo.quotaLimit > 0) {
        const perc = (mailBoxInfo.quotaUsed * 100) / mailBoxInfo.quotaLimit;
        return perc.toFixed(1);
    }
    return '';
}

export function escHtml(s: string): string {
  const div = document.createElement('div');
  div.innerText = s;
  return div.innerHTML;
}

export function maxStringLength(text: string, length: number): string {
    if (text === null || (text.length < length)) {
        return text;
    }
    if (length <= 0) {
        return '';
    }
    if (length < 6) {
        return text.substring(0, length);
    }
    return text.substring(0, length - 3) + "...";
}

export function getContrastColor(hexColor: string, lightColor: string = '#FFFFFF', darkColor: string = '#000000'): string {
  let hex = hexColor.replace('#', '');
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map(c => c + c)
            .join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const [lr, lg, lb] = [r, g, b].map(value => {
        value /= 255;
        return value <= 0.03928
            ? value / 12.92
            : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    const luminance =
        0.2126 * lr +
        0.7152 * lg +
        0.0722 * lb;
    return luminance > 0.179 ? darkColor : lightColor;
}
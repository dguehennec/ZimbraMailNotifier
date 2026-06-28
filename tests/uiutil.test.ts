import { resetChromeMocks } from './setup';
import {
  formatBytes,
  formatLastErrorMessage,
  formatPercentageQuotaUsed,
  escHtml,
  maxStringLength,
  getContrastColor,
  i18n,
} from '../src/ui/uiutil';
import { RequestStatus } from '../src/types';

describe('uiutil', () => {
  beforeEach(() => {
    resetChromeMocks();
  });

  describe('i18n', () => {
    it('returns the message key when chrome.i18n returns empty', () => {
      expect(i18n('some_key')).toBe('some_key');
    });

    it('applyAll sets text from msg attributes', () => {
      document.body.innerHTML = '<span msg="hello_key"></span>';
      i18n.applyAll(document);
      expect(document.querySelector('span')?.textContent).toBe('hello_key');
    });
  });

  describe('formatLastErrorMessage', () => {
    it('maps network errors to i18n key', () => {
      expect(formatLastErrorMessage({
        status: RequestStatus.NETWORK_ERROR,
        message: 'fail',
        ts: Date.now(),
      }, '')).toBe('connector_error_req_network');
    });

    it('maps login invalid errors', () => {
      expect(formatLastErrorMessage({
        status: RequestStatus.LOGIN_INVALID,
        message: 'bad login',
        ts: Date.now(),
      }, '')).toBe('connector_error_req_logininvalid');
    });
  });

  describe('formatBytes', () => {
    it('formats bytes', () => {
      expect(formatBytes(512)).toBe('512 unit_bytes_B');
    });

    it('formats kilobytes', () => {
      expect(formatBytes(2048)).toBe('2 unit_bytes_KB');
    });

    it('formats megabytes with one decimal', () => {
      expect(formatBytes(5 * 1024 * 1024)).toBe('5 unit_bytes_MB');
    });
  });

  describe('formatPercentageQuotaUsed', () => {
    it('returns percentage when limit is set', () => {
      expect(formatPercentageQuotaUsed({
        email: 'a@b.com',
        displayName: 'A',
        quotaUsed: 250,
        quotaLimit: 1000,
      })).toBe('25.0');
    });

    it('returns empty string when limit is zero', () => {
      expect(formatPercentageQuotaUsed({
        email: 'a@b.com',
        displayName: 'A',
        quotaUsed: 100,
        quotaLimit: 0,
      })).toBe('');
    });
  });

  describe('escHtml', () => {
    it('escapes HTML special characters', () => {
      expect(escHtml('<script>alert("x")</script>')).not.toContain('<script>');
    });
  });

  describe('maxStringLength', () => {
    it('returns text unchanged when shorter than limit', () => {
      expect(maxStringLength('hello', 10)).toBe('hello');
    });

    it('truncates with ellipsis when long enough', () => {
      expect(maxStringLength('hello world', 8)).toBe('hello...');
    });

    it('returns empty string for non-positive length', () => {
      expect(maxStringLength('hello', 0)).toBe('');
    });
  });

  describe('getContrastColor', () => {
    it('returns dark text on light background', () => {
      expect(getContrastColor('#ffffff')).toBe('#000000');
    });

    it('returns light text on dark background', () => {
      expect(getContrastColor('#000000')).toBe('#FFFFFF');
    });

    it('supports 3-digit hex shorthand', () => {
      expect(getContrastColor('#fff')).toBe('#000000');
    });
  });
});

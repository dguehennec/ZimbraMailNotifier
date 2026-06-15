// ============================================================
// modules/service/Prefs.ts — Typed preferences using chrome.storage.local
// ============================================================

import { AppPrefs, AccountConfig, WaitSetInfo, DeviceTrustedInfos } from '../../types';
import { Constants } from '../constant/constants';
import { Logger } from './Logger';
import { encryptPassword, decryptPassword } from './Crypto';

const log = new Logger('Prefs');

const STORAGE_KEY = 'zmn_prefs';
const ACCOUNTS_KEY = 'zmn_accounts';
const WAITSET_KEY_PREFIX = 'zmn_waitset_';
const DEVICE_KEY_PREFIX = 'zmn_device_';

// Default preferences
const DEFAULT_PREFS: AppPrefs = {
  isFirstLaunch: true,
  previousVersion: 0,
  currentVersion: Constants.VERSION,
  autoConnect: Constants.DEFAULT_PREFS.AUTO_CONNECT,
  emailNotificationEnabled: Constants.DEFAULT_PREFS.EMAIL_NOTIFICATION_ENABLED,
  emailSoundEnabled: Constants.DEFAULT_PREFS.EMAIL_SOUND_ENABLED,
  emailSoundSelected: Constants.DEFAULT_PREFS.EMAIL_SOUND_SELECTED,
  emailSoundFile: '',
  emailSoundVolume: Constants.DEFAULT_PREFS.EMAIL_SOUND_VOLUME,
  emailNotificationDuration: Constants.DEFAULT_PREFS.EMAIL_NOTIFICATION_DURATION,
  browserSetCookies: Constants.DEFAULT_PREFS.BROWSER_SET_COOKIES,
  browserCookieHttpOnly: Constants.DEFAULT_PREFS.BROWSER_COOKIE_HTTP_ONLY,
  popupColor: Constants.DEFAULT_PREFS.POPUP_COLOR,
  popupWidth: Constants.DEFAULT_PREFS.POPUP_WIDTH,
  messageEnabled: Constants.DEFAULT_PREFS.MESSAGE_ENABLED,
  messageNbDisplayed: Constants.DEFAULT_PREFS.MESSAGE_NB_DISPLAYED,
  messageNbCharsDisplayed: Constants.DEFAULT_PREFS.MESSAGE_NB_CHARS_DISPLAYED,
  messageFilterRegex: Constants.DEFAULT_PREFS.MESSAGE_FILTER_REGEX,
  calendarEnabled: Constants.DEFAULT_PREFS.CALENDAR_ENABLED,
  calendarPeriodDisplayed: Constants.DEFAULT_PREFS.CALENDAR_PERIOD_DISPLAYED,
  calendarNbDisplayed: Constants.DEFAULT_PREFS.CALENDAR_NB_DISPLAYED,
  calendarNotificationEnabled: Constants.DEFAULT_PREFS.CALENDAR_NOTIFICATION_ENABLED,
  calendarSoundEnabled: Constants.DEFAULT_PREFS.CALENDAR_SOUND_ENABLED,
  calendarSoundSelected: Constants.DEFAULT_PREFS.CALENDAR_SOUND_SELECTED,
  calendarSoundFile: '',
  calendarSoundVolume: Constants.DEFAULT_PREFS.CALENDAR_SOUND_VOLUME,
  calendarReminderTimeConf: [...Constants.DEFAULT_PREFS.CALENDAR_REMINDER_TIME_CONF],
  calendarReminderNbRepeat: Constants.DEFAULT_PREFS.CALENDAR_REMINDER_NB_REPEAT,
  taskEnabled: Constants.DEFAULT_PREFS.TASK_ENABLED,
  taskNbDisplayed: Constants.DEFAULT_PREFS.TASK_NB_DISPLAYED,
  taskPriorities: [...Constants.DEFAULT_PREFS.TASK_PRIORITIES],
  draftEnabled: Constants.DEFAULT_PREFS.DRAFT_ENABLED,
  draftNbDisplayed: Constants.DEFAULT_PREFS.DRAFT_NB_DISPLAYED,
  accounts: [],
  requestQueryTimeout: Constants.DEFAULT_PREFS.REQUEST_QUERY_TIMEOUT,
  requestWaitTimeout: Constants.DEFAULT_PREFS.REQUEST_WAIT_TIMEOUT,
  queryLoopEnabled: Constants.DEFAULT_PREFS.QUERY_LOOP_ENABLED,
  queryLoopPeriod: Constants.DEFAULT_PREFS.QUERY_LOOP_PERIOD,
};

// In-memory cache
let _cache: AppPrefs = { ...DEFAULT_PREFS };
let _loaded = false;
const _changeListeners: Array<() => void> = [];

// ─── Public API ───────────────────────────────────────────────

export const Prefs = {
  async load(): Promise<void> {
    try {
      const result = await Prefs.getDefaultStorage().get([STORAGE_KEY, ACCOUNTS_KEY]);
      const stored = result[STORAGE_KEY] ?? {};
      const accounts: AccountConfig[] = result[ACCOUNTS_KEY] ?? [];
      _cache = { ...DEFAULT_PREFS, ...stored, accounts };

      if (stored.isFirstLaunch || stored.previousVersion !== stored.currentVersion) {
        _cache.previousVersion = stored.currentVersion;
      }

      _loaded = true;
      log.info('Prefs loaded', { version: _cache.currentVersion });
    } catch (e) {
      log.error('Failed to load prefs', e);
    }
  },

  async save(): Promise<void> {
    try {
      const { accounts, ...rest } = _cache;
      await Prefs.getDefaultStorage().set({
        [STORAGE_KEY]: rest,
        [ACCOUNTS_KEY]: accounts,
      });
    } catch (e) {
      log.error('Failed to save prefs', e);
    }
  },

  isLoaded(): boolean {
    return _loaded;
  },

  get(): Readonly<AppPrefs> {
    return _cache;
  },

  async update<K extends keyof AppPrefs>(key: K, value: AppPrefs[K]): Promise<void> {
    (_cache)[key] = value;
    await Prefs.save();
    _changeListeners.forEach((fn) => fn());
  },

  onChange(fn: () => void): () => void {
    _changeListeners.push(fn);
    return () => {
      const i = _changeListeners.indexOf(fn);
      if (i >= 0) _changeListeners.splice(i, 1);
    };
  },

  getDefaultStorage(): chrome.storage.SyncStorageArea {
    return chrome.storage.sync ?? chrome.storage.local;
  },

  getLocalStorage(): chrome.storage.LocalStorageArea {
    return chrome.storage.local;
  },

  // ─── Account helpers ──────────────────────────────────────

  getAccounts(): AccountConfig[] {
    return _cache.accounts;
  },

  async addAccount(account: AccountConfig): Promise<void> {
    _cache.accounts = [..._cache.accounts, account];
    await Prefs.save();
  },

  async removeAccount(accountId: string): Promise<void> {
    _cache.accounts = _cache.accounts.filter((a) => a.id !== accountId);
    await Prefs.save();
  },

  async updateAccount(accountId: string, patch: Partial<AccountConfig>): Promise<void> {
    _cache.accounts = _cache.accounts.map((a) => (a.id === accountId ? { ...a, ...patch } : a));
    await Prefs.save();
  },

  async savePassword(accountId: string, password: string | undefined): Promise<void> {
    if (password) {
      const encrypted = await encryptPassword(password);
      await Prefs.updateAccount(accountId, { passwordEncrypted: encrypted });
    } else {
      await Prefs.updateAccount(accountId, { passwordEncrypted: undefined });
    }
  },

  async loadPassword(accountId: string): Promise<string> {
    const account = _cache.accounts.find((a) => a.id === accountId);
    if (!account?.savePassword || !account.passwordEncrypted) return '';
    return decryptPassword(account.passwordEncrypted);
  },

  // ─── WaitSet persistence only in local storage ──────────────────────────────────

  async saveWaitSet(accountId: string, info: WaitSetInfo | null): Promise<void> {
    const key = WAITSET_KEY_PREFIX + accountId;
    if (info === null) {
      await Prefs.getLocalStorage().remove(key);
    } else {
      await Prefs.getLocalStorage().set({ [key]: info });
    }
  },

  async loadWaitSet(accountId: string): Promise<WaitSetInfo | null> {
    const key = WAITSET_KEY_PREFIX + accountId;
    const result = await Prefs.getLocalStorage().get(key);
    return (result[key] as WaitSetInfo) ?? null;
  },

  // ─── Device trusted infos only in local storage─────────────────────────────────

  async saveDeviceTrusted(accountId: string, info: DeviceTrustedInfos): Promise<void> {
    await Prefs.getLocalStorage().set({ [DEVICE_KEY_PREFIX + accountId]: info });
  },

  async loadDeviceTrusted(accountId: string): Promise<DeviceTrustedInfos> {
    const result = await Prefs.getLocalStorage().get(DEVICE_KEY_PREFIX + accountId);
    return (result[DEVICE_KEY_PREFIX + accountId] as DeviceTrustedInfos) ?? { id: null, deviceId: '' };
  },
};

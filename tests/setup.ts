import { webcrypto } from 'node:crypto';
import { TextEncoder, TextDecoder } from 'util';

Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  configurable: true,
  writable: true,
});

if (!globalThis.TextEncoder) {
  Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoder, configurable: true });
}

if (!globalThis.TextDecoder) {
  Object.defineProperty(globalThis, 'TextDecoder', { value: TextDecoder, configurable: true });
}

export const TEST_EXTENSION_ID = 'test-extension-id-for-crypto';

export interface MockStorageArea {
  _data: Record<string, unknown>;
  _reset: () => void;
  get: jest.Mock;
  set: jest.Mock;
  remove: jest.Mock;
  clear: jest.Mock;
}

function createStorageArea(): MockStorageArea {
  const data: Record<string, unknown> = {};

  return {
    _data: data,
    _reset: () => {
      for (const key of Object.keys(data)) delete data[key];
    },
    get: jest.fn(async (keys?: string | string[] | Record<string, unknown> | null) => {
      if (keys == null) return { ...data };
      const keyList = Array.isArray(keys)
        ? keys
        : typeof keys === 'string'
          ? [keys]
          : Object.keys(keys);
      const result: Record<string, unknown> = {};
      for (const key of keyList) {
        if (key in data) result[key] = data[key];
      }
      return result;
    }),
    set: jest.fn(async (items: Record<string, unknown>) => {
      Object.assign(data, items);
    }),
    remove: jest.fn(async (keys: string | string[]) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        delete data[key];
      }
    }),
    clear: jest.fn(async () => {
      for (const key of Object.keys(data)) delete data[key];
    }),
  };
}

export const mockSyncStorage = createStorageArea();
export const mockLocalStorage = createStorageArea();

const mockGetMessage = jest.fn((key: string) => key);
const mockNotificationsCreate = jest.fn().mockResolvedValue(undefined);
const mockNotificationsClear = jest.fn().mockResolvedValue(undefined);
export const mockCookiesSet = jest.fn().mockResolvedValue(undefined);
export const mockCookiesGet = jest.fn().mockResolvedValue(undefined);
const mockCookiesRemove = jest.fn().mockResolvedValue(undefined);
const mockTabsCreate = jest.fn().mockResolvedValue(undefined);
export const mockTabsQuery = jest.fn().mockResolvedValue([]);
export const mockTabsUpdate = jest.fn().mockResolvedValue(undefined);
const mockSendMessage = jest.fn((_msg: unknown, cb?: (response: unknown) => void) => {
  cb?.(null);
});

export function resetChromeMocks(): void {
  mockSyncStorage._reset();
  mockLocalStorage._reset();
  mockSyncStorage.get.mockClear();
  mockSyncStorage.set.mockClear();
  mockLocalStorage.get.mockClear();
  mockLocalStorage.set.mockClear();
  mockLocalStorage.remove.mockClear();
  mockGetMessage.mockImplementation((key: string) => {
    switch(key) {
      case 'connector_notification_NewMessage':
        return 'Message from %EMAIL%';
      case 'connector_notification_nbUnreadMessages':
        return '%NB% new unread Emails!';
      case 'connector_notification_event':
        return 'Event:';
      case 'atTime':
        return 'at time';
      case 'minuteBefore':
        return 'minute before';
      case 'minutesBefore':
        return 'minutes before';
      case 'hourBefore':
        return 'hour before';
      case 'hoursBefore':
        return 'hours before';
      default:
    }
    return key;
  });
  mockNotificationsCreate.mockResolvedValue(undefined);
  mockNotificationsClear.mockResolvedValue(undefined);
  mockCookiesSet.mockResolvedValue(undefined);
  mockCookiesGet.mockResolvedValue(undefined);
  mockCookiesRemove.mockResolvedValue(undefined);
  mockTabsCreate.mockResolvedValue(undefined);
  mockTabsQuery.mockResolvedValue([]);
  mockTabsUpdate.mockResolvedValue(undefined);
  mockSendMessage.mockImplementation((_msg: unknown, cb?: (response: unknown) => void) => {
    cb?.(null);
  });
  chrome.runtime.id = TEST_EXTENSION_ID;
  Object.defineProperty(chrome.runtime, 'lastError', { value: null, configurable: true });
}

Object.defineProperty(globalThis, 'chrome', {
  configurable: true,
  writable: true,
  value: {
    runtime: {
      id: TEST_EXTENSION_ID,
      sendMessage: mockSendMessage,
      lastError: null,
      getURL: jest.fn((path: string) => `chrome-extension://test/${path.replace(/^\//, '')}`),
    },
    storage: {
      sync: mockSyncStorage as unknown as chrome.storage.SyncStorageArea,
      local: mockLocalStorage as unknown as chrome.storage.LocalStorageArea,
    },
    i18n: {
      getMessage: mockGetMessage,
    },
    notifications: {
      create: mockNotificationsCreate,
      clear: mockNotificationsClear,
    },
    cookies: {
      set: mockCookiesSet,
      get: mockCookiesGet,
      remove: mockCookiesRemove,
    },
    tabs: {
      create: mockTabsCreate,
      query: mockTabsQuery,
      update: mockTabsUpdate,
    },
  },
});

resetChromeMocks();

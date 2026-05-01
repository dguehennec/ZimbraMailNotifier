import { resetChromeMocks } from './setup';
import {
  AccountConfig,
  MailMessage,
  NetworkError,
  RequestStatus,
  ServiceEventType,
  ZimbraError,
} from '../src/types';

jest.mock('../src/modules/constant/constants', () => {
  const actual = jest.requireActual('../src/modules/constant/constants');
  return {
    Constants: {
      ...actual.Constants,
      SERVICE: {
        ...actual.Constants.SERVICE,
        CONNECT_BASE_WAIT_AFTER_FAILURE: 10,
        CONNECT_MAX_WAIT_AFTER_FAILURE: 50,
      },
    },
  };
});

const mockWs = {
  isAuthenticated: true,
  sessionInfo: {
    authToken: 'auth-token',
    lifetime: Date.now() + 3_600_000,
    urlWebService: 'https://zimbra.example.com',
    urlWebInterface: 'https://zimbra.example.com/',
    user: 'user@example.com',
    waitSetId: null,
    waitSetSeq: 0,
    deviceTrustedToken: null,
    deviceId: '',
    twoFactorAuthRequired: false,
  },
  waitSetInfo: null as { id: string; seq: number } | null,
  authenticate: jest.fn().mockResolvedValue(undefined),
  authenticateTwoFactor: jest.fn().mockResolvedValue(undefined),
  getMailboxInfo: jest.fn().mockResolvedValue({
    email: 'user@example.com',
    displayName: 'User',
    quotaUsed: 100,
    quotaLimit: 1000,
  }),
  getUnreadMessages: jest.fn().mockResolvedValue([] as MailMessage[]),
  getCalendarEvents: jest.fn().mockResolvedValue([]),
  getTasks: jest.fn().mockResolvedValue([]),
  createWaitSet: jest.fn().mockResolvedValue(undefined),
  waitForEvents: jest.fn().mockResolvedValue(false),
  restoreWaitSet: jest.fn(),
  abort: jest.fn(),
};

jest.mock('../src/modules/service/ZimbraWebservice', () => ({
  ZimbraWebservice: jest.fn(() => mockWs),
}));

jest.mock('../src/modules/service/BrowserService', () => ({
  BrowserService: {
    notify: jest.fn().mockResolvedValue(undefined),
    updateCookies: jest.fn().mockResolvedValue(undefined),
    clearCookies: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../src/modules/service/Notifier', () => ({
  EventNotifier: jest.fn().mockImplementation(() => ({ stop: jest.fn() })),
}));

import { BrowserService } from '../src/modules/service/BrowserService';
import { EventNotifier } from '../src/modules/service/Notifier';

const ACCOUNT_ID = 'acc-service-1';

const testAccount: AccountConfig = {
  id: ACCOUNT_ID,
  alias: 'Work',
  login: 'user@example.com',
  passwordEncrypted: '',
  urlWebService: 'https://zimbra.example.com',
  urlWebInterface: 'https://zimbra.example.com/',
  savePassword: true,
};

const sampleMessage = (id: string): MailMessage => ({
  id,
  subject: `Subject ${id}`,
  from: `sender-${id}@example.com`,
  date: new Date(),
  abstract: `Body ${id}`,
  folderId: '2',
  conversationId: `conv-${id}`,
});

function resetMockWebservice(): void {
  mockWs.isAuthenticated = true;
  mockWs.sessionInfo.twoFactorAuthRequired = false;
  mockWs.sessionInfo.authToken = 'auth-token';
  mockWs.waitSetInfo = null;
  mockWs.authenticate.mockReset().mockResolvedValue(undefined);
  mockWs.authenticateTwoFactor.mockReset().mockResolvedValue(undefined);
  mockWs.getMailboxInfo.mockReset().mockResolvedValue({
    email: 'user@example.com',
    displayName: 'User',
    quotaUsed: 100,
    quotaLimit: 1000,
  });
  mockWs.getUnreadMessages.mockReset().mockResolvedValue([]);
  mockWs.getCalendarEvents.mockReset().mockResolvedValue([]);
  mockWs.getTasks.mockReset().mockResolvedValue([]);
  mockWs.createWaitSet.mockReset().mockResolvedValue(undefined);
  mockWs.waitForEvents.mockReset().mockResolvedValue(false);
  mockWs.restoreWaitSet.mockReset();
  mockWs.abort.mockReset();
}

async function flushStateMachine(ms = 30): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

describe('Service', () => {
  let events: ServiceEventType[];
  let sessionChanged: jest.Mock;

  beforeEach(async () => {
    resetChromeMocks();
    resetMockWebservice();
    events = [];
    sessionChanged = jest.fn();
    jest.clearAllMocks();

    const { Prefs } = await import('../src/modules/service/Prefs');
    await Prefs.load();
    if (!Prefs.getAccounts().some((a) => a.id === ACCOUNT_ID)) {
      await Prefs.addAccount(testAccount);
    }
  });

  async function createService() {
    const { Service } = await import('../src/modules/controller/Service');
    return new Service({
      accountId: ACCOUNT_ID,
      onEvent: (event) => events.push(event),
      onSessionChanged: sessionChanged,
    });
  }

  it('reports invalid login when no password is available', async () => {
    const service = await createService();
    await service.initializeConnection(undefined);
    await flushStateMachine();

    expect(events).toContain(ServiceEventType.INVALID_LOGIN);
    expect(service.isConnected()).toBe(false);
    expect(service.getLastErrorMessage()?.status).toBe(RequestStatus.LOGIN_INVALID);
  });

  it('connects and refreshes mailbox data on successful authentication', async () => {
    mockWs.getUnreadMessages.mockResolvedValue([sampleMessage('1')]);

    const service = await createService();
    await service.initializeConnection('secret');
    await flushStateMachine();

    expect(mockWs.authenticate).toHaveBeenCalledWith(
      testAccount.urlWebService,
      testAccount.urlWebInterface,
      testAccount.login,
      'secret'
    );
    expect(events).toContain(ServiceEventType.CONNECTING);
    expect(events).toContain(ServiceEventType.CONNECTED);
    expect(events).toContain(ServiceEventType.CHECKING_MAILBOX_INFO);
    expect(events).toContain(ServiceEventType.UNREAD_MSG_UPDATED);
    expect(service.isConnected()).toBe(true);
    expect(service.getUnreadMessages()).toHaveLength(1);
    expect(BrowserService.updateCookies).toHaveBeenCalledWith(
      testAccount.urlWebService,
      'auth-token'
    );
  });

  it('loads saved password when initializeConnection receives no credential', async () => {
    const { Prefs } = await import('../src/modules/service/Prefs');
    await Prefs.savePassword(ACCOUNT_ID, 'stored-pass');

    const service = await createService();
    await service.initializeConnection(undefined);
    await flushStateMachine();

    expect(mockWs.authenticate).toHaveBeenCalledWith(
      testAccount.urlWebService,
      testAccount.urlWebInterface,
      testAccount.login,
      'stored-pass'
    );
  });

  it('requests two-factor authentication when session requires it', async () => {
    mockWs.sessionInfo.twoFactorAuthRequired = true;
    mockWs.isAuthenticated = false;

    const service = await createService();
    await service.initializeConnection('secret');
    await flushStateMachine();

    expect(events).toContain(ServiceEventType.TWOFA_AUTHENTICATION_REQUIRED);
    expect(events).not.toContain(ServiceEventType.CONNECTED);
    expect(service.getLastErrorMessage()?.status).toBe(RequestStatus.TWOFA_AUTHENTICATION_REQUIRED);
  });

  it('completes connection after two-factor token submission', async () => {
    mockWs.sessionInfo.twoFactorAuthRequired = true;
    mockWs.isAuthenticated = false;

    const service = await createService();
    await service.initializeConnection('secret');
    await flushStateMachine();

    mockWs.sessionInfo.twoFactorAuthRequired = false;
    mockWs.isAuthenticated = true;
    service.sendTwoFactorToken('123456');
    await flushStateMachine();

    expect(mockWs.authenticateTwoFactor).toHaveBeenCalledWith('123456');
    expect(events).toContain(ServiceEventType.CONNECTED);
  });

  it('retries connection after network failure using saved password', async () => {
    const { Prefs } = await import('../src/modules/service/Prefs');
    await Prefs.savePassword(ACCOUNT_ID, 'retry-pass');
    mockWs.authenticate
      .mockRejectedValueOnce(new NetworkError('offline', true))
      .mockResolvedValue(undefined);

    const service = await createService();
    await service.initializeConnection('retry-pass');
    await flushStateMachine(50);

    expect(events).toContain(ServiceEventType.CONNECT_ERR);
    expect(mockWs.authenticate.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(mockWs.authenticate).toHaveBeenLastCalledWith(
      testAccount.urlWebService,
      testAccount.urlWebInterface,
      testAccount.login,
      'retry-pass'
    );
  });

  it('does not notify on first unread poll but notifies on new message ids', async () => {
    const { Prefs } = await import('../src/modules/service/Prefs');
    await Prefs.update('queryLoopEnabled', false);

    mockWs.getUnreadMessages
      .mockResolvedValueOnce([sampleMessage('1')])
      .mockResolvedValueOnce([sampleMessage('1'), sampleMessage('2')]);

    const service = await createService();
    await service.initializeConnection('secret');
    await flushStateMachine();

    expect(BrowserService.notify).not.toHaveBeenCalled();

    service.checkNow();
    await flushStateMachine();

    expect(BrowserService.notify).toHaveBeenCalledWith(
      'Message from sender-2@example.com',
      'Subject 2 - Body 2 ',
      8
    );
  });

  it('falls back to timed polling when queryLoopEnabled is false', async () => {
    const { Prefs } = await import('../src/modules/service/Prefs');
    await Prefs.update('queryLoopEnabled', false);
    await Prefs.update('queryLoopPeriod', 40);

    const service = await createService();
    await service.initializeConnection('secret');
    await flushStateMachine();

    mockWs.getUnreadMessages.mockClear();
    await flushStateMachine(50);

    expect(mockWs.getUnreadMessages).toHaveBeenCalled();
  });

  it('does not schedule calendar notifiers when notifications are disabled', async () => {
    const { Prefs } = await import('../src/modules/service/Prefs');
    await Prefs.update('calendarNotificationEnabled', false);
    mockWs.getCalendarEvents.mockResolvedValue([{
      id: 'evt-1',
      name: 'Meeting',
      duration: 3600000,
      startDate: new Date(Date.now() + 3600000),
      endDate: new Date(Date.now() + 7200000),
      allDay: false,
      startWeek: 1,
      location: '',
    }]);

    const service = await createService();
    await service.initializeConnection('secret');
    await flushStateMachine();

    expect(EventNotifier).not.toHaveBeenCalled();
  });

  it('reconnects when refresh fails with auth required', async () => {
    const { Prefs } = await import('../src/modules/service/Prefs');
    await Prefs.savePassword(ACCOUNT_ID, 'refresh-pass');
    mockWs.getMailboxInfo
      .mockRejectedValueOnce(new ZimbraError(RequestStatus.AUTH_REQUIRED, 'expired'))
      .mockResolvedValueOnce({
        email: 'user@example.com',
        displayName: 'User',
        quotaUsed: 0,
        quotaLimit: 0,
      });

    const service = await createService();
    await service.initializeConnection('refresh-pass');
    await flushStateMachine(100);

    expect(mockWs.authenticate.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(mockWs.authenticate).toHaveBeenLastCalledWith(
      testAccount.urlWebService,
      testAccount.urlWebInterface,
      testAccount.login,
      'refresh-pass'
    );
  });

  it('checkNow triggers a refresh when connected', async () => {
    const service = await createService();
    await service.initializeConnection('secret');
    await flushStateMachine();

    mockWs.getMailboxInfo.mockClear();
    service.checkNow();
    await flushStateMachine();

    expect(mockWs.getMailboxInfo).toHaveBeenCalled();
  });

  it('closeConnection stops the service and clears cookies', async () => {
    const service = await createService();
    await service.initializeConnection('secret');
    await flushStateMachine();

    events.length = 0;
    service.closeConnection();

    expect(events).toContain(ServiceEventType.DISCONNECTED);
    expect(service.isConnected()).toBe(false);
    expect(BrowserService.clearCookies).toHaveBeenCalledWith(testAccount.urlWebService);
    expect(mockWs.abort).toHaveBeenCalled();
  });
});

import { resetChromeMocks, mockCookiesSet, mockTabsQuery } from './setup';

describe('BrowserService', () => {
  beforeEach(async () => {
    resetChromeMocks();
    jest.resetModules();
    jest.useFakeTimers();
    const { Prefs } = await import('../src/modules/service/Prefs');
    await Prefs.load();
    await Prefs.update('browserSetCookies', true);
    await Prefs.update('emailNotificationDuration', 5);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function loadBrowserService() {
    const { BrowserService } = await import('../src/modules/service/BrowserService');
    return BrowserService;
  }

  it('creates a desktop notification', async () => {
    const BrowserService = await loadBrowserService();
    await BrowserService.notify('Subject', 'Body');
    expect(chrome.notifications.create).toHaveBeenCalledWith(
      expect.stringMatching(/^zmn-/),
      expect.objectContaining({
        type: 'basic',
        title: 'Subject',
        message: 'Body',
        iconUrl: 'chrome-extension://test/skin/images/zimbra_mail_notifier_48.png',
      })
    );
  });

  it('uses fallback title and body when empty', async () => {
    const BrowserService = await loadBrowserService();
    await BrowserService.notify('', '');
    expect(chrome.notifications.create).toHaveBeenCalledWith(
      expect.stringMatching(/^zmn-/),
      expect.objectContaining({
        title: 'Zimbra Mail Notifier',
        message: ' ',
      })
    );
  });

  it('clears notification after configured duration', async () => {
    const BrowserService = await loadBrowserService();
    await BrowserService.notify('Subject', 'Body');
    jest.advanceTimersByTime(9000);
    expect(chrome.notifications.clear).toHaveBeenCalled();
  });

  it('sets ZM_AUTH_TOKEN cookie when enabled', async () => {
    const BrowserService = await loadBrowserService();
    await BrowserService.updateCookies('https://zimbra.example.com', 'token-123');
    expect(chrome.cookies.set).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://zimbra.example.com',
        name: 'ZM_AUTH_TOKEN',
        value: 'token-123',
        secure: true,
      })
    );
  });

  it('skips cookie update when browserSetCookies is false', async () => {
    const { Prefs } = await import('../src/modules/service/Prefs');
    await Prefs.update('browserSetCookies', false);
    jest.resetModules();
    const { Prefs: PrefsReloaded } = await import('../src/modules/service/Prefs');
    await PrefsReloaded.load();
    expect(PrefsReloaded.get().browserSetCookies).toBe(false);

    mockCookiesSet.mockClear();
    const { BrowserService } = await import('../src/modules/service/BrowserService');
    await BrowserService.updateCookies('https://zimbra.example.com', 'token-123');
    expect(mockCookiesSet).not.toHaveBeenCalled();
  });

  it('removes ZM_AUTH_TOKEN and SID cookies', async () => {
    const BrowserService = await loadBrowserService();
    await BrowserService.clearCookies('https://zimbra.example.com');
    expect(chrome.cookies.remove).toHaveBeenCalledWith({
      url: 'https://zimbra.example.com',
      name: 'ZM_AUTH_TOKEN',
    });
    expect(chrome.cookies.remove).toHaveBeenCalledWith({
      url: 'https://zimbra.example.com',
      name: 'SID',
    });
  });

  it('sets SID cookie when provided', async () => {
    const BrowserService = await loadBrowserService();
    await BrowserService.updateCookies('http://zimbra.free.fr', 'token-123', 'sid-456');
    expect(chrome.cookies.set).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://zimbra.free.fr',
        name: 'SID',
        value: 'sid-456',
        httpOnly: false,
        secure: false,
      })
    );
  });

  it('opens web interface in a new tab when none exists', async () => {
    const BrowserService = await loadBrowserService();
    await BrowserService.openWebInterface('https://zimbra.example.com/');
    expect(chrome.tabs.query).toHaveBeenCalledWith({});
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://zimbra.example.com/' });
    expect(chrome.tabs.update).not.toHaveBeenCalled();
  });

  it('focuses existing tab for the same web interface origin', async () => {
    mockTabsQuery.mockResolvedValueOnce([
      { id: 42, url: 'https://zimbra.example.com/zimbra/mail?action=1#test', windowId: 1 },
    ]);
    const BrowserService = await loadBrowserService();
    await BrowserService.openWebInterface('https://zimbra.example.com/zimbra/mail');
    expect(chrome.tabs.query).toHaveBeenCalledWith({});
    expect(chrome.tabs.update).toHaveBeenCalledWith(42, { active: true });
  });
});

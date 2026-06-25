import { resetChromeMocks, mockCookiesGet } from './setup';
import { ZimbraWebservice } from '../src/modules/service/ZimbraWebservice';
import { RequestStatus } from '../src/types';

describe('ZimbraWebservice', () => {
  const sessionChanges: unknown[] = [];

  beforeEach(() => {
    resetChromeMocks();
    sessionChanges.length = 0;
    global.fetch = jest.fn();
    mockCookiesGet.mockResolvedValue(undefined);
  });

  function createWebservice() {
    return new ZimbraWebservice(
      'https://zimbra.example.com',
      { id: null, deviceId: '' },
      5000,
      10000,
      (info) => sessionChanges.push(info)
    );
  }

  function mockSoapResponse(body: object, status = 200) {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify({ Body: body }),
    });
  }

  it('authenticates and stores session info', async () => {
    mockSoapResponse({
      AuthResponse: {
        authToken: [{ _content: 'token-abc' }],
        lifetime: 3_600_000,
        twoFactorAuthRequired: { _content: 'false' },
      },
    });

    const ws = createWebservice();
    await ws.authenticate(
      'https://zimbra.example.com',
      'https://zimbra.example.com/',
      'user@example.com',
      'password'
    );

    expect(ws.isAuthenticated).toBe(true);
    expect(ws.sessionInfo.authToken).toBe('token-abc');
    expect(ws.sessionInfo.user).toBe('user@example.com');
    expect(sessionChanges.length).toBeGreaterThan(0);
  });

  it('flags twoFactorAuthRequired without completing authentication', async () => {
    mockSoapResponse({
      AuthResponse: {
        authToken: [{ _content: 'partial-token' }],
        lifetime: 3_600_000,
        twoFactorAuthRequired: { _content: 'true' },
        deviceId: { _content: 'device-1' },
      },
    });

    const ws = createWebservice();
    await ws.authenticate(
      'https://zimbra.example.com',
      'https://zimbra.example.com/',
      'user@example.com',
      'password'
    );

    expect(ws.isAuthenticated).toBe(false);
    expect(ws.sessionInfo.twoFactorAuthRequired).toBe(true);
    expect(ws.sessionInfo.deviceId).toBe('device-1');
  });

  it('completes two-factor authentication', async () => {
    mockSoapResponse({
      AuthResponse: {
        authToken: [{ _content: 'partial-token' }],
        lifetime: 3_600_000,
        twoFactorAuthRequired: { _content: 'true' },
        deviceId: { _content: 'device-1' },
      },
    });
    mockSoapResponse({
      AuthResponse: {
        authToken: [{ _content: 'full-token' }],
        lifetime: 3_600_000,
        trustedToken: { _content: 'trusted-1' },
        deviceId: { _content: 'device-1' },
      },
    });

    const ws = createWebservice();
    await ws.authenticate(
      'https://zimbra.example.com',
      'https://zimbra.example.com/',
      'user@example.com',
      'password'
    );
    await ws.authenticateTwoFactor('123456');

    expect(ws.isAuthenticated).toBe(true);
    expect(ws.sessionInfo.authToken).toBe('full-token');
    expect(ws.sessionInfo.deviceTrustedToken).toBe('trusted-1');
    expect(ws.sessionInfo.twoFactorAuthRequired).toBe(false);
  });

  it('throws on SOAP fault for invalid login', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({
        Body: {
          Fault: {
            Detail: { Error: { Code: 'account.AUTH_FAILED' } },
            Reason: { Text: 'Invalid credentials' },
          },
        },
      }),
    });

    const ws = createWebservice();
    await expect(
      ws.authenticate(
        'https://zimbra.example.com',
        'https://zimbra.example.com/',
        'user@example.com',
        'wrong'
      )
    ).rejects.toMatchObject({ code: RequestStatus.LOGIN_INVALID });
  });

  it('restores and exposes waitset info', () => {
    const ws = createWebservice();
    expect(ws.waitSetInfo).toBeNull();
    ws.restoreWaitSet('ws-99', 7);
    expect(ws.waitSetInfo).toEqual({
      id: 'ws-99',
      seq: 7,
      urlWebService: 'https://zimbra.example.com',
      user: '',
    });
  });

  it('authenticates Free accounts via index.pl and cookies', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '<html></html>',
    });
    mockCookiesGet.mockImplementation(async ({ name }: { name: string }) => {
      if (name === 'ZM_AUTH_TOKEN') return { value: 'free-token' };
      if (name === 'SID') return { value: 'free-sid' };
      return undefined;
    });

    const ws = new ZimbraWebservice(
      'http://zimbra.free.fr',
      { id: null, deviceId: '' },
      5000,
      10000,
      (info) => sessionChanges.push(info)
    );
    await ws.authenticate(
      'http://zimbra.free.fr',
      'http://zimbra.free.fr/',
      'user@free.fr',
      'password'
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'http://zimbra.free.fr/index.pl',
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    );
    expect(chrome.cookies.remove).toHaveBeenCalledWith({ url: 'http://zimbra.free.fr', name: 'ZM_AUTH_TOKEN' });
    expect(chrome.cookies.remove).toHaveBeenCalledWith({ url: 'http://zimbra.free.fr', name: 'SID' });
    expect(ws.isAuthenticated).toBe(true);
    expect(ws.sessionInfo.authToken).toBe('free-token');
    expect(ws.sessionInfo.sid).toBe('free-sid');
  });

  it('throws on Free invalid login HTML', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => 'mot de passe incorrect',
    });

    const ws = new ZimbraWebservice(
      'http://zimbra.free.fr',
      { id: null, deviceId: '' },
      5000,
      10000,
      () => undefined
    );
    await expect(
      ws.authenticate('http://zimbra.free.fr', 'http://zimbra.free.fr/', 'user@free.fr', 'wrong')
    ).rejects.toMatchObject({ code: RequestStatus.LOGIN_INVALID });
  });

  it('sends Free auth cookies on SOAP requests', async () => {
    mockCookiesGet.mockImplementation(async ({ name }: { name: string }) => {
      if (name === 'ZM_AUTH_TOKEN') return { value: 'free-token' };
      if (name === 'SID') return { value: 'free-sid' };
      return undefined;
    });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<html></html>',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          Body: { GetInfoResponse: { name: 'user@free.fr', displayName: 'User', used: 0, limit: 0 } },
        }),
      });

    const ws = new ZimbraWebservice(
      'http://zimbra.free.fr',
      { id: null, deviceId: '' },
      5000,
      10000,
      () => undefined
    );
    await ws.authenticate('http://zimbra.free.fr', 'http://zimbra.free.fr/', 'user@free.fr', 'password');
    await ws.getMailboxInfo();

    const soapCall = (global.fetch as jest.Mock).mock.calls[1];
    expect(soapCall[1].headers.Cookie).toBe('ZM_AUTH_TOKEN=free-token; SID=free-sid');
  });
});

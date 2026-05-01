import { resetChromeMocks } from './setup';
import { ZimbraWebservice } from '../src/modules/service/ZimbraWebservice';
import { RequestStatus } from '../src/types';

describe('ZimbraWebservice', () => {
  const sessionChanges: unknown[] = [];

  beforeEach(() => {
    resetChromeMocks();
    sessionChanges.length = 0;
    global.fetch = jest.fn();
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
});

// tests/ZimbraSession.test.ts
import { ZimbraSession } from '../src/modules/service/ZimbraWebservice';

const makeSession = () => new ZimbraSession({ id: null, deviceId: 'test-device' });

describe('ZimbraSession', () => {
  it('is not authenticated initially', () => {
    expect(makeSession().isAuthenticated()).toBe(false);
  });

  it('is authenticated when token + expiry in future', () => {
    const s = makeSession();
    s.authToken   = 'abc123';
    s.tokenExpiry = Date.now() + 3_600_000;
    expect(s.isAuthenticated()).toBe(true);
  });

  it('is not authenticated when token expired', () => {
    const s = makeSession();
    s.authToken   = 'abc123';
    s.tokenExpiry = Date.now() - 1;
    expect(s.isAuthenticated()).toBe(false);
  });

  it('is not authenticated when within safety margin', () => {
    const s = makeSession();
    s.authToken   = 'abc123';
    s.tokenExpiry = Date.now() + 30_000; // inside 60s margin
    expect(s.isAuthenticated()).toBe(false);
  });

  it('toWaitSetInfo returns null when no waitSetId', () => {
    expect(makeSession().toWaitSetInfo()).toBeNull();
  });

  it('toWaitSetInfo returns info when waitSetId set', () => {
    const s      = makeSession();
    s.waitSetId  = 'ws-1';
    s.waitSetSeq = 5;
    s.urlWebService = 'https://zimbra.example.com';
    s.user = 'user@example.com';
    const info = s.toWaitSetInfo();
    expect(info).not.toBeNull();
    expect(info!.id).toBe('ws-1');
    expect(info!.seq).toBe(5);
  });

  it('toSessionInfo includes twoFactorAuthRequired', () => {
    const s = makeSession();
    s.twoFactorAuthRequired = true;
    const info = s.toSessionInfo();
    expect(info.twoFactorAuthRequired).toBe(true);
  });

  it('toSessionInfo has null authToken initially', () => {
    const info = makeSession().toSessionInfo();
    expect(info.authToken).toBeNull();
  });
});

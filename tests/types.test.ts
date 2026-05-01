import { RequestStatus, ZimbraError, NetworkError, AuthError } from '../src/types';

describe('Error types', () => {
  it('ZimbraError carries code and optional zimbraCode', () => {
    const err = new ZimbraError(RequestStatus.SERVER_ERROR, 'server down', 'mail.TRY_AGAIN');
    expect(err.name).toBe('ZimbraError');
    expect(err.code).toBe(RequestStatus.SERVER_ERROR);
    expect(err.message).toBe('server down');
    expect(err.zimbraCode).toBe('mail.TRY_AGAIN');
    expect(err).toBeInstanceOf(Error);
  });

  it('NetworkError defaults to retriable', () => {
    const err = new NetworkError('timeout');
    expect(err.name).toBe('NetworkError');
    expect(err.code).toBe(RequestStatus.NETWORK_ERROR);
    expect(err.retriable).toBe(true);
    expect(err).toBeInstanceOf(ZimbraError);
  });

  it('NetworkError can be non-retriable', () => {
    const err = new NetworkError('permanent', false);
    expect(err.retriable).toBe(false);
  });

  it('AuthError maps to AUTH_REQUIRED', () => {
    const err = new AuthError('token expired');
    expect(err.name).toBe('AuthError');
    expect(err.code).toBe(RequestStatus.AUTH_REQUIRED);
    expect(err).toBeInstanceOf(ZimbraError);
  });
});

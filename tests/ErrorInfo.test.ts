// tests/ErrorInfo.test.ts
import { ErrorInfo } from '../src/modules/service/ErrorInfo';
import { RequestStatus } from '../src/types';

describe('ErrorInfo', () => {
  let ei: ErrorInfo;

  beforeEach(() => {
    ei = new ErrorInfo();
  });

  it('is empty initially', () => {
    expect(ei.getLastMessage()).toBe(null);
    expect(ei.has(RequestStatus.NETWORK_ERROR)).toBe(false);
  });

  it('adds an error and retrieves its message', () => {
    ei.add(RequestStatus.NETWORK_ERROR, 'Network failed');
    expect(ei.has(RequestStatus.NETWORK_ERROR)).toBe(true);
    expect(ei.getLastMessage()?.message).toBe('Network failed');
  });

  it('returns the most recent error message', async () => {
    ei.add(RequestStatus.NETWORK_ERROR, 'First error');
    await new Promise((r) => setTimeout(r, 5));
    ei.add(RequestStatus.AUTH_REQUIRED, 'Second error');
    expect(ei.getLastMessage()?.message).toBe('Second error');
  });

  it('clears a specific error', () => {
    ei.add(RequestStatus.NETWORK_ERROR, 'Network failed');
    ei.clear(RequestStatus.NETWORK_ERROR);
    expect(ei.has(RequestStatus.NETWORK_ERROR)).toBe(false);
    expect(ei.getLastMessage()).toBeNull();
  });

  it('clears all errors', () => {
    ei.add(RequestStatus.NETWORK_ERROR, 'err1');
    ei.add(RequestStatus.AUTH_REQUIRED, 'err2');
    ei.clearAll();
    expect(ei.getLastMessage()).toBe(null);
    expect(ei.has(RequestStatus.NETWORK_ERROR)).toBe(false);
    expect(ei.has(RequestStatus.AUTH_REQUIRED)).toBe(false);
  });

  it('overrides an existing error with same status', () => {
    ei.add(RequestStatus.NETWORK_ERROR, 'First');
    ei.add(RequestStatus.NETWORK_ERROR, 'Updated');
    expect(ei.getLastMessage()?.message).toBe('Updated');
  });

  it('handles multiple concurrent errors', () => {
    ei.add(RequestStatus.NETWORK_ERROR, 'network');
    ei.add(RequestStatus.SERVER_ERROR, 'server');
    expect(ei.has(RequestStatus.NETWORK_ERROR)).toBe(true);
    expect(ei.has(RequestStatus.SERVER_ERROR)).toBe(true);
  });
});

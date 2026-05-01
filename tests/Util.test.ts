// tests/Util.test.ts
import { withRetry, safeJson, randomHex, sleep, filterNewItemsById, filterMessagesByRegex, weekDate } from '../src/modules/service/Util';
import { MailMessage } from '../src/types';
import { NetworkError, ZimbraError, RequestStatus } from '../src/types';

describe('safeJson', () => {
  it('parses valid JSON', () => {
    expect(safeJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('returns null for invalid JSON', () => {
    expect(safeJson('not json')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(safeJson('')).toBeNull();
  });

  it('parses arrays', () => {
    expect(safeJson('[1,2,3]')).toEqual([1, 2, 3]);
  });
});

describe('randomHex', () => {
  it('returns correct length', () => {
    expect(randomHex(8)).toHaveLength(16);  // 8 bytes = 16 hex chars
    expect(randomHex(16)).toHaveLength(32);
  });

  it('returns only hex characters', () => {
    expect(randomHex(16)).toMatch(/^[0-9a-f]+$/);
  });

  it('returns different values on each call', () => {
    expect(randomHex(16)).not.toBe(randomHex(16));
  });

  it('defaults to 16 bytes (32 chars)', () => {
    expect(randomHex()).toHaveLength(32);
  });
});

describe('sleep', () => {
  it('resolves after given time', async () => {
    const start = Date.now();
    await sleep(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(45);
  });

  it('returns a Promise', () => {
    expect(sleep(0)).toBeInstanceOf(Promise);
  });
});

describe('filterMessagesByRegex', () => {
  const sample = (overrides: Partial<MailMessage> = {}): MailMessage => ({
    id: '1',
    subject: 'Project update',
    from: 'boss@company.com',
    date: new Date(),
    abstract: 'Please review the quarterly report.',
    folderId: 'inbox',
    conversationId: 'c1',
    ...overrides,
  });

  it('returns all messages when pattern is empty', () => {
    const messages = [sample(), sample({ id: '2' })];
    expect(filterMessagesByRegex(messages, '')).toEqual(messages);
    expect(filterMessagesByRegex(messages, '   ')).toEqual(messages);
  });

  it('matches from, subject, or body', () => {
    const messages = [
      sample({ id: '1', from: 'alice@example.com' }),
      sample({ id: '2', subject: 'URGENT action required' }),
      sample({ id: '3', abstract: 'invoice attached' }),
      sample({ id: '4', from: 'other@example.com', subject: 'Hello' }),
    ];
    expect(filterMessagesByRegex(messages, 'urgent').map((m) => m.id)).toEqual(['2']);
    expect(filterMessagesByRegex(messages, 'invoice').map((m) => m.id)).toEqual(['3']);
    expect(filterMessagesByRegex(messages, 'alice@').map((m) => m.id)).toEqual(['1']);
  });

  it('applies limit after filtering', () => {
    const messages = Array.from({ length: 10 }, (_, i) =>
      sample({ id: String(i + 1), subject: i % 2 === 0 ? 'match me' : 'other' }),
    );
    const filtered = filterMessagesByRegex(messages, 'match');
    expect(filtered).toHaveLength(5);
    const displayed = filtered
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);
    expect(displayed).toHaveLength(5);
  });

  it('returns all messages when regex is invalid', () => {
    const messages = [sample()];
    expect(filterMessagesByRegex(messages, '(')).toEqual(messages);
  });
});

describe('filterNewItemsById', () => {
  it('returns only messages with new ids', () => {
    const previous = [{ id: '1', subject: 'a' }];
    const incoming = [
      { id: '1', subject: 'a' },
      { id: '2', subject: 'b' },
      { id: '3', subject: 'c' },
    ];
    expect(filterNewItemsById(previous, incoming)).toEqual([
      { id: '2', subject: 'b' },
      { id: '3', subject: 'c' },
    ]);
  });

  it('returns empty array when all ids are known', () => {
    const items = [{ id: '1', name: 'x' }];
    expect(filterNewItemsById(items, items)).toEqual([]);
  });
});

describe('weekDate', () => {
  it('returns ISO week number for a mid-year date', () => {
    expect(weekDate(new Date(2024, 5, 15))).toBeGreaterThan(0);
  });

  it('returns week 1 for early January when in first ISO week', () => {
    expect(weekDate(new Date(2024, 0, 1))).toBe(1);
  });
});

describe('withRetry', () => {
  it('returns value on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxAttempts: 3 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on retriable NetworkError', async () => {
    let attempts = 0;
    const fn = jest.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) throw new NetworkError('network', true);
      return 'done';
    });

    const result = await withRetry(fn, {
      maxAttempts: 4,
      baseDelayMs: 1,
      jitterMs: 0,
    });
    expect(result).toBe('done');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry on non-retriable NetworkError', async () => {
    const fn = jest.fn().mockRejectedValue(new NetworkError('permanent', false));
    await expect(
      withRetry(fn, { maxAttempts: 4, baseDelayMs: 1, jitterMs: 0 })
    ).rejects.toThrow('permanent');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry on ZimbraError', async () => {
    const fn = jest.fn().mockRejectedValue(
      new ZimbraError(RequestStatus.AUTH_REQUIRED, 'auth required')
    );
    await expect(
      withRetry(fn, { maxAttempts: 4, baseDelayMs: 1, jitterMs: 0 })
    ).rejects.toThrow('auth required');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws after max attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new NetworkError('network', true));
    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 1, jitterMs: 0 })
    ).rejects.toThrow('network');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('uses custom shouldRetry predicate', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('custom'));
    await expect(
      withRetry(fn, {
        maxAttempts: 3,
        baseDelayMs: 1,
        jitterMs: 0,
        shouldRetry: (e) => (e as Error).message === 'custom',
      })
    ).rejects.toThrow('custom');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

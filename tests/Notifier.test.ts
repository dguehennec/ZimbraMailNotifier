import { resetChromeMocks } from './setup';
import { EventNotifier } from '../src/modules/service/Notifier';
import { BrowserService } from '../src/modules/service/BrowserService';

jest.mock('../src/modules/service/BrowserService', () => ({
  BrowserService: {
    notify: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('EventNotifier', () => {
  beforeEach(() => {
    resetChromeMocks();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const ACCOUNT_ID = 'acc-service-1';

  const account = {
    id: ACCOUNT_ID,
    alias: 'Work',
    login: 'user@example.com',
    passwordEncrypted: '',
    urlWebService: 'https://zimbra.example.com',
    urlWebInterface: 'https://zimbra.example.com/',
    savePassword: true,
  }

  const accounts = [account];

  const makeEvent = (startInMs: number) => ({
    id: 'evt-1',
    name: 'Team meeting',
    duration: 3600000,
    startDate: new Date(Date.now() + startInMs),
    endDate: new Date(Date.now() + startInMs + 3600000),
    allDay: false,
    startWeek: 1,
    location: 'Room A',
  });

  it('fires a reminder before the event starts', () => {

    const notifier = new EventNotifier(makeEvent(10 * 60_000), accounts, account, [5], 1);
    jest.advanceTimersByTime(5 * 60_000);
    expect(BrowserService.notify).toHaveBeenCalledWith(
      'Event: Team meeting',
      '5 minutes before'
    );
    notifier.stop();
  });

  it('uses atTime when reminder is at start time', () => {
    const notifier = new EventNotifier(makeEvent(60_000), accounts, account, [0], 1);
    jest.advanceTimersByTime(60_000);
    expect(BrowserService.notify).toHaveBeenCalledWith(
      'Event: Team meeting',
      'at time'
    );
    notifier.stop();
  });

  it('uses hourBefore for a one-hour reminder', () => {
    const notifier = new EventNotifier(makeEvent(2 * 60 * 60_000), accounts, account, [60], 1);
    jest.advanceTimersByTime(60 * 60_000);
    expect(BrowserService.notify).toHaveBeenCalledWith(
      'Event: Team meeting',
      '1 hour before'
    );
    notifier.stop();
  });

  it('uses minuteBefore for a one-minute reminder', () => {
    const notifier = new EventNotifier(makeEvent(2 * 60_000), [account,account], account, [1], 1);
    jest.advanceTimersByTime(60_000);
    expect(BrowserService.notify).toHaveBeenCalledWith(
      'Event: Team meeting',
      '1 minute before (Work)'
    );
    notifier.stop();
  });

  it('stop cancels pending reminders', () => {
    const notifier = new EventNotifier(makeEvent(10 * 60_000), accounts, account, [5], 1);
    notifier.stop();
    jest.advanceTimersByTime(10 * 60_000);
    expect(BrowserService.notify).not.toHaveBeenCalled();
  });

  it('does not schedule reminders for past offsets', () => {
    const notifier = new EventNotifier(makeEvent(2 * 60_000), accounts, account, [5, 15], 1);
    jest.advanceTimersByTime(5 * 60_000);
    expect(BrowserService.notify).not.toHaveBeenCalled();
    notifier.stop();
  });
});

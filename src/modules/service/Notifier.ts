// ============================================================
// modules/service/Notifier.ts — Calendar event reminder
// ============================================================

import { CalendarEvent, AccountConfig } from '../../types';
import { Logger } from './Logger';
import { BrowserService } from './BrowserService';
import { i18n } from '../service/Util';

const log = new Logger('Notifier');

export class EventNotifier {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private repeatCount = 0;

  constructor(
    private readonly event: CalendarEvent,
    private readonly accounts: AccountConfig[],
    private readonly account: AccountConfig,
    private readonly reminderMinutes: number[],
    private readonly maxRepeat: number
  ) {
    this.schedule();
  }

  private schedule(): void {
    const now = Date.now();
    for (const minutes of this.reminderMinutes) {
      const fireAt = this.event.startDate.getTime() - minutes * 60_000;
      const delay = fireAt - now;
      if (delay > 0) {
        const t = setTimeout(() => this.fire(minutes), delay);
        this.timers.push(t);
      }
    }
  }

  /** Format a calendar reminder delay using existing locale keys. */
  private formatReminderDelay(minutesBefore: number): string {
    if (minutesBefore === 0) {
      return i18n('atTime');
    }
    if (minutesBefore % 60 === 0) {
      const hours = minutesBefore / 60;
      return `${hours} ${i18n(hours === 1 ? 'hourBefore' : 'hoursBefore')}`;
    }
    let accountName = '';
    if (this.accounts.length > 1) {
      accountName = ` (${this.account.alias || this.account.login || this.account.id})`;
    }
    return `${minutesBefore} ${i18n(minutesBefore === 1 ? 'minuteBefore' : 'minutesBefore')}${accountName}`;
  }

  private fire(minutesBefore: number): void {
    if (this.repeatCount >= this.maxRepeat) return;
    this.repeatCount++;
    log.info('Calendar reminder', { event: this.event.name, minutesBefore });
    const title = i18n('connector_notification_event') + ' ' + this.event.name;
    BrowserService.notify(title, this.formatReminderDelay(minutesBefore));
  }

  stop(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}

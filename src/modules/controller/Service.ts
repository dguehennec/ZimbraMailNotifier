// ============================================================
// modules/controller/Service.ts — Zimbra polling state machine
// ============================================================

import {
  ServiceState, ServiceEventType,
  CalendarEvent, MailMessage, DraftMessage, Task, MailboxInfo,
  RequestStatus, SessionInfo,
  ZimbraError, AuthError, NetworkError, ErrorEntry
} from '../../types';
import { Logger } from '../service/Logger';
import { ZimbraWebservice } from '../service/ZimbraWebservice';
import { Prefs } from '../service/Prefs';
import { BrowserService } from '../service/BrowserService';
import { EventNotifier } from '../service/Notifier';
import { ErrorInfo } from '../service/ErrorInfo';
import { Constants } from '../constant/constants';
import { i18n, filterNewItemsById, filterMessagesByRegex } from '../service/Util';
import type { AppPrefs, AccountConfig } from '../../types';

const log = new Logger('Service');

export interface ServiceDelegate {
  readonly accountId: string;
  onEvent(event: ServiceEventType, data?: unknown): void;
  onSessionChanged(info: SessionInfo): void;
}

export class Service {
  // ─── State ──────────────────────────────────────────────
  private state: ServiceState = ServiceState.NOTHING_TO_DO;
  private webservice: ZimbraWebservice | null = null;
  private stateTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private waitStatePromise: Promise<boolean> | null = null;

  // ─── Data ────────────────────────────────────────────────
  private unreadMessages: MailMessage[] = [];
  private calendarEvents: CalendarEvent[] = [];
  private tasks: Task[] = [];
  private draftMessages: DraftMessage[] = [];
  private mailboxInfo: MailboxInfo | null = null;
  private eventNotifiers: EventNotifier[] = [];

  // ─── Error tracking ──────────────────────────────────────
  private errors = new ErrorInfo();
  private connectRetryDelay = 0;

  // ─── First-run ───────────────────────────────────────────
  private firstCallback = true;

  constructor(private readonly delegate: ServiceDelegate) {}

  // ─── Public API ───────────────────────────────────────────

  getAccount(): AccountConfig | null  {
    const prefs = Prefs.get();
    const account = prefs.accounts.find((a) => a.id === this.delegate.accountId);
    return account ?? null;
  }

  isConnected(): boolean {
    return this.webservice?.isAuthenticated ?? false;
  }

  isConnecting(): boolean {
    return this.state === ServiceState.CONNECT_RUN;
  }

  getUnreadMessages(): MailMessage[] { return this.unreadMessages; }
  getCalendarEvents(): CalendarEvent[] { return this.calendarEvents; }
  getTasks(): Task[] { return this.tasks; }
  getDraftMessages(): DraftMessage[] { return this.draftMessages; }
  getMailboxInfo(): MailboxInfo | null { return this.mailboxInfo; }
  getLastErrorMessage(): ErrorEntry | null { return this.errors.getLastMessage(); }

  /** Start connecting. Returns immediately; state machine takes over. */
  async initializeConnection(password: string | undefined): Promise<void> {
    log.info('initializeConnection for account ' + this.delegate.accountId);
    this.shutdown();
    this.running = true;
    this.firstCallback = true;
    this.connectRetryDelay = 0;
    if(!password) {
      password = await Prefs.loadPassword(this.delegate.accountId)
    }
    if (password) {
      this.planState(ServiceState.CONNECT_RUN, 0, password);
    } else {
      this.delegate.onEvent(ServiceEventType.INVALID_LOGIN);
      this.errors.add(RequestStatus.LOGIN_INVALID, `Password not set for account ${this.delegate.accountId}`);
    }
  }

  sendTwoFactorToken(token: string): void {
    this.planState(ServiceState.CONNECT_RUN, 0, token, true);
  }

  checkNow(): void {
    if (!this.isConnected()) return;
    this.stopStateTimer();
    this.planState(ServiceState.REFRESH_START, 0);
  }

  closeConnection(): void {
    log.info('closeConnection for account ' + this.delegate.accountId);
    this.shutdown();
    this.delegate.onEvent(ServiceEventType.DISCONNECTED);
  }

  shutdown(): void {
    this.running = false;
    this.stopStateTimer();
    this.clearEventNotifiers();
    this.unreadMessages = [];
    this.calendarEvents = [];
    this.tasks = [];
    this.draftMessages = [];
    this.mailboxInfo = null;
    this.errors.clearAll();
    this.connectRetryDelay = 0;
    this.firstCallback = true;

    if (this.webservice) {
      this.webservice.abort();
      this.webservice = null;
    }

    // Clear cookies
    const prefs = Prefs.get();
    if (prefs.accounts.length > 0) {
      const account = prefs.accounts.find((a) => a.id === this.delegate.accountId);
      if (account) BrowserService.clearCookies(account.urlWebService);
    }
  }

  // ─── State machine ────────────────────────────────────────

  private planState(state: ServiceState, delayMs: number, ...extra: unknown[]): void {
    log.info('planState changed for account ' + this.delegate.accountId, { state, delayMs, extra });
    this.stopStateTimer();
    this.stateTimer = setTimeout(() => {
      this.stateTimer = null;
      this.runState(state, ...extra).catch((e) => {
        log.error('Unhandled state error', e);
        this.planState(ServiceState.NOTHING_TO_DO, 500);
      });
    }, delayMs);
  }

  private stopStateTimer(): void {
    if (this.stateTimer !== null) {
      clearTimeout(this.stateTimer);
      this.stateTimer = null;
    }
  }

  private async runState(state: ServiceState, ...extra: unknown[]): Promise<void> {
    log.info('runState for account ' + this.delegate.accountId, { state, running: this.running });
    if (!this.running && state !== ServiceState.NOTHING_TO_DO) return;
    this.state = state;
    log.trace(`State → ${state}`);

    switch (state) {
      case ServiceState.CONNECT_RUN:
        await this.stateConnect(extra[0] as string, extra[1] as boolean | undefined);
        break;
      case ServiceState.CONNECT_WAIT:
        this.connectRetryDelay = Math.min(
          (this.connectRetryDelay || 0) + Constants.SERVICE.CONNECT_BASE_WAIT_AFTER_FAILURE,
          Constants.SERVICE.CONNECT_MAX_WAIT_AFTER_FAILURE
        );
        this.delegate.onEvent(ServiceEventType.CONNECT_ERR);
        const password = await Prefs.loadPassword(this.delegate.accountId) ?? '';
        this.planState(ServiceState.CONNECT_RUN, this.connectRetryDelay, password);
        break;
      case ServiceState.REFRESH_START:
        await this.stateRefresh();
        break;
      case ServiceState.WAITSET_LOOP_START:
        await this.stateWaitSetLoop();
        break;
      case ServiceState.NOTHING_TO_DO:
        this.delegate.onEvent(ServiceEventType.STOPPED);
        break;
      default:
        break;
    }
  }

  // ─── Connect ──────────────────────────────────────────────

  private async stateConnect(credential: string, isTwoFa = false): Promise<void> {
    this.delegate.onEvent(ServiceEventType.CONNECTING);
    const prefs = Prefs.get();
    const account = prefs.accounts.find((a) => a.id === this.delegate.accountId);
    if (!account) {
      this.delegate.onEvent(ServiceEventType.INVALID_LOGIN);
      this.errors.add(RequestStatus.LOGIN_INVALID, `Account ${this.delegate.accountId} not found`);
      return;
    }

    try {
      if (!this.webservice) {
        const device = await Prefs.loadDeviceTrusted(this.delegate.accountId);
        this.webservice = new ZimbraWebservice(
          account.urlWebService,
          device,
          prefs.requestQueryTimeout,
          prefs.requestWaitTimeout,
          (info) => {
            this.delegate.onSessionChanged(info);
            Prefs.saveWaitSet(this.delegate.accountId, info.waitSetId ? {
              id: info.waitSetId,
              seq: info.waitSetSeq,
              urlWebService: info.urlWebService,
              user: info.user,
            } : null);
            if (info.deviceTrustedToken && info.deviceId) {
              Prefs.saveDeviceTrusted(this.delegate.accountId, {
                id: info.deviceTrustedToken,
                deviceId: info.deviceId,
              });
            }
          }
        );

        // Restore persisted WaitSet
        const ws = await Prefs.loadWaitSet(this.delegate.accountId);
        if (ws) this.webservice.restoreWaitSet(ws.id, ws.seq);
      }

      if (isTwoFa) {
        await this.webservice.authenticateTwoFactor(credential);
      } else {
        await this.webservice.authenticate(
          account.urlWebService,
          account.urlWebInterface,
          account.login,
          credential
        );
        if (account.savePassword) {
          await Prefs.savePassword(this.delegate.accountId, credential);
        }
      }

      // Set cookie
      if (prefs.browserSetCookies) {
        const { authToken, sid } = this.webservice.sessionInfo;
        if (authToken) await BrowserService.updateCookies(account.urlWebService, authToken, sid);
      }

      if (this.webservice.sessionInfo.twoFactorAuthRequired) {
        this.delegate.onEvent(ServiceEventType.TWOFA_AUTHENTICATION_REQUIRED);
        this.errors.add(RequestStatus.TWOFA_AUTHENTICATION_REQUIRED, '');
      } else {
        this.errors.clearAll();
        this.connectRetryDelay = 0;
        this.delegate.onEvent(ServiceEventType.CONNECTED);
        log.info('Connected', { accountId: this.delegate.accountId });
        // Immediately do a refresh then enter wait loop
        this.planState(ServiceState.REFRESH_START, 0);
      }

    } catch (e) {
      log.error('Connect failed for account ' + this.delegate.accountId, e);
      if (e instanceof AuthError || (e instanceof ZimbraError && e.code === RequestStatus.LOGIN_INVALID)) {
        this.delegate.onEvent(ServiceEventType.INVALID_LOGIN);
        this.errors.add(RequestStatus.LOGIN_INVALID, (e as Error).message);
        this.planState(ServiceState.NOTHING_TO_DO, 0);
      } else if (e instanceof ZimbraError && e.code === RequestStatus.AUTH_REQUIRED) {
        // 2FA needed
        this.delegate.onEvent(ServiceEventType.TWOFA_AUTHENTICATION_REQUIRED);
        this.errors.add(RequestStatus.TWOFA_AUTHENTICATION_REQUIRED, '');
      } else {
        if (e instanceof NetworkError) {
          this.errors.add(RequestStatus.NETWORK_ERROR, (e as Error).message);
        }
        this.planState(ServiceState.CONNECT_WAIT, 0);
      }
    }
  }

  // ─── Refresh ──────────────────────────────────────────────

  private async stateRefresh(): Promise<void> {
    const prefs = Prefs.get();
    log.info('Refresh started for account ' + this.delegate.accountId);
    try {
      // get mailbox information
      this.delegate.onEvent(ServiceEventType.CHECKING_MAILBOX_INFO);
      this.mailboxInfo = await this.webservice!.getMailboxInfo();
      this.delegate.onEvent(ServiceEventType.MAILBOX_INFO_UPDATED);
      // get Unread messages
      if (prefs.messageEnabled) {
        this.delegate.onEvent(ServiceEventType.CHECKING_UNREAD_MSG);
        const msgs = await this.webservice!.getUnreadMessages(prefs.unrealMessageOnlyInbox);
        const newMsgs = filterMessagesByRegex(
          this.collectNewMessages(msgs),
          prefs.messageFilterRegex ?? '',
        );
        this.unreadMessages = msgs;
        this.delegate.onEvent(ServiceEventType.UNREAD_MSG_UPDATED);
        if (newMsgs.length > 0 && prefs.emailNotificationEnabled) {
          await this.notifyNewMessages(newMsgs);
        }
      }
      // get calndar events
      if (prefs.calendarEnabled) {
        this.delegate.onEvent(ServiceEventType.CHECKING_CALENDAR);
        const events = await this.webservice!.getCalendarEvents(
          prefs.calendarPeriodDisplayed,
        );
        this.calendarEvents = events;
        this.clearEventNotifiers();
        this.scheduleEventNotifiers(events, prefs);
        this.delegate.onEvent(ServiceEventType.CALENDAR_UPDATED);
      }
      // get tasks list
      if (prefs.taskEnabled) {
        this.delegate.onEvent(ServiceEventType.CHECKING_TASK);
        const tasks = await this.webservice!.getTasks();
        this.tasks = tasks;
        this.delegate.onEvent(ServiceEventType.TASK_UPDATED);
      }
      // get draft messages
      if (prefs.draftEnabled) {
        this.delegate.onEvent(ServiceEventType.CHECKING_DRAFT);
        const drafts = await this.webservice!.getDraftMessages();
        this.draftMessages = drafts;
        this.delegate.onEvent(ServiceEventType.DRAFT_UPDATED);
      }
      this.errors.clearAll();
      log.info('Refresh complete for account ' + this.delegate.accountId);
    } catch (e) {
      log.error('Refresh failed for account ' + this.delegate.accountId, e);
      if (e instanceof ZimbraError && e.code === RequestStatus.AUTH_REQUIRED) {
        // retry to connect with password
        const password = await Prefs.loadPassword(this.delegate.accountId) ?? '';
        this.planState(ServiceState.CONNECT_RUN, 0, password);
        return;
      }
      this.errors.add(
        (e instanceof ZimbraError ? e.code : RequestStatus.INTERNAL_ERROR),
        (e as Error).message
      );
      this.delegate.onEvent(ServiceEventType.REQUEST_FAILED);
    }
    // Schedule next refresh
    this.planState(ServiceState.WAITSET_LOOP_START, 0);
  }

  // ─── WaitSet loop ─────────────────────────────────────────

  private async stateWaitSetLoop(): Promise<void> {
    const prefs = Prefs.get();
    if (!prefs.queryLoopEnabled) {
      this.planState(ServiceState.REFRESH_START, prefs.queryLoopPeriod);
      return;
    }
    log.info('Starting WaitSetLoop for account ' + this.delegate.accountId);
    try {
      if (!this.webservice!.waitSetInfo) {
        await this.webservice!.createWaitSet();
      }

      if (this.waitStatePromise) {
        log.info('WaitSetLoop already in progress for account ' + this.delegate.accountId);
        return
      }
      this.waitStatePromise = this.webservice!.waitForEvents(true);
      const hasEvents = await this.waitStatePromise;
      this.waitStatePromise = null
      if (hasEvents) {
        log.info('WaitSet: new events, refreshing for account ' + this.delegate.accountId);
        this.planState(ServiceState.REFRESH_START, 0);
      } else {
        // No events but also no error: loop again
        this.planState(ServiceState.WAITSET_LOOP_START, 0);
      }
    } catch (e) {
      this.waitStatePromise = null
      log.warn('WaitSet error, falling back to polling for account ' + this.delegate.accountId, e);
      if (e instanceof ZimbraError && e.code === RequestStatus.WAITSET_INVALID) {
        // Recreate WaitSet on next loop
        this.webservice!.restoreWaitSet('', 0);
      }
      if (e instanceof ZimbraError && e.code === RequestStatus.AUTH_REQUIRED) {
        // retry to connect with password
        const password = await Prefs.loadPassword(this.delegate.accountId) ?? '';
        this.planState(ServiceState.CONNECT_RUN, 0, password);
        return;
      }
      // Fall back to timed polling
      this.planState(ServiceState.REFRESH_START, prefs.queryLoopPeriod);
    }
  }

  // ─── Notifications ────────────────────────────────────────

  private collectNewMessages(newMsgs: MailMessage[]): MailMessage[] {
    if (this.firstCallback) {
      this.firstCallback = false;
      return [];
    }
    return filterNewItemsById(this.unreadMessages, newMsgs);
  }

  private async notifyNewMessages(msgs: MailMessage[]): Promise<void> {
    const prefs = Prefs.get();
    const account = prefs.accounts.find((a) => a.id === this.delegate.accountId);
    if (!account) {
      return
    }
    if (prefs.emailSoundEnabled) {
      this.delegate.onEvent(ServiceEventType.NEED_PLAY_SOUND, {
        selected: prefs.emailSoundSelected,
        customSound: prefs.emailSoundFile,
        volumeSound: prefs.emailSoundVolume,
      });
    }
    let accountName = '';
    if (prefs.accounts.length > 1) {
      accountName = `(${account.alias || account.login || account.id})`;
    }
    if (msgs.length <= 3 ) {
      for (const msg of msgs.slice(0, 3)) {
        const title = i18n('connector_notification_NewMessage').replace('%EMAIL%', msg.from);
        await BrowserService.notify(title, msg.subject + " - " + msg.abstract + ' ' + accountName, prefs.emailNotificationDuration);
      }
    } else {
      const title = i18n('connector_notification_nbUnreadMessages').replace('%NB%', `${msgs.length}`);
      await BrowserService.notify(title, accountName, prefs.emailNotificationDuration);
    }
  }

  private scheduleEventNotifiers(events: CalendarEvent[], prefs: AppPrefs): void {
    if (!prefs.calendarNotificationEnabled) return;
    const account = prefs.accounts.find((a) => a.id === this.delegate.accountId);
    if (!account) {
      return
    }
    const limitedEvents = events.sort((a,b) => a.startDate.getTime() - b.startDate.getTime()).slice(0, Constants.SERVICE.MAX_EVENT_NOTIFIERS)
    for (const event of limitedEvents) {
      const notifier = new EventNotifier(
        event,
        prefs.accounts,
        account,
        prefs.calendarReminderTimeConf,
        prefs.calendarReminderNbRepeat
      );
      this.eventNotifiers.push(notifier);
    }
  }

  private clearEventNotifiers(): void {
    this.eventNotifiers.forEach((n) => n.stop());
    this.eventNotifiers = [];
  }
}

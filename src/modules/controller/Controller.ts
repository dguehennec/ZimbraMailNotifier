// ============================================================
// modules/controller/Controller.ts
// ============================================================

import {
  ServiceEventType, ControllerInfo,
  CalendarEvent, MailMessage, DraftMessage, Task, MailboxInfo,
  SessionInfo, ErrorEntry, AccountConfig,
} from '../../types';
import { Logger } from '../service/Logger';
import { Service, ServiceDelegate } from './Service';
import { BrowserService } from '../service/BrowserService';
import { Prefs } from '../service/Prefs';

const log = new Logger('Controller');

export type RefreshCallback = (event: ServiceEventType, data?: unknown) => void;

export class Controller implements ServiceDelegate {
  private service: Service;
  private callbacks: RefreshCallback[] = [];
  private _needTwoFactorAuth = false;

  constructor(public readonly id: string, public readonly accountId: string) {
    this.service = new Service(this);
  }

  // ─── ServiceDelegate ────────────────────────────────────

  onEvent(event: ServiceEventType, data?: unknown): void {
    if (event === ServiceEventType.TWOFA_AUTHENTICATION_REQUIRED) {
      this._needTwoFactorAuth = true;
    } else if (event === ServiceEventType.CONNECTED || event === ServiceEventType.INVALID_LOGIN) {
      this._needTwoFactorAuth = false;
    }
    log.trace(`Event: ${event}`);
    this.callbacks.forEach((cb) => cb(event, data));
  }

  onSessionChanged(info: SessionInfo): void {
    const prefs = Prefs.get();
    const account = this.service.getAccount();
    if (account && prefs.browserSetCookies && info.authToken) {
      BrowserService.updateCookies(account.urlWebService, info.authToken);
    }
  }

  // ─── Public API ────────────────────────────────────────

  getAccount(): AccountConfig | null { return this.service.getAccount() }
  isConnected(): boolean { return this.service.isConnected(); }
  isConnecting(): boolean { return this.service.isConnecting(); }
  needTwoFactorAuth(): boolean { return this._needTwoFactorAuth; }
  getUnreadMessages(): MailMessage[] { return this.service.getUnreadMessages(); }
  getCalendarEvents(): CalendarEvent[] { return this.service.getCalendarEvents(); }
  getTasks(): Task[] { return this.service.getTasks(); }
  getDraftMessages(): DraftMessage[] { return this.service.getDraftMessages(); }
  getMailboxInfo(): MailboxInfo | null { return this.service.getMailboxInfo(); }
  getLastErrorMessage(): ErrorEntry | null { return this.service.getLastErrorMessage(); }
  getAccountId(): string { return this.accountId; }

  initializeConnection(password: string | undefined): void {
    this.service.initializeConnection(password);
  }

  sendTwoFactorToken(token: string): void {
    this.service.sendTwoFactorToken(token);
  }

  closeConnection(): void {
    this.service.closeConnection();
  }

  checkNow(): void {
    this.service.checkNow();
  }

  openZimbraWebInterface(): void {
    const account = this.getAccount();
    const webUrl = account?.urlWebInterface || account?.urlWebService;
    if (webUrl) {
      BrowserService.openWebInterface(webUrl);
    }
  }

  addCallback(fn: RefreshCallback): void {
    this.callbacks.push(fn);
  }

  removeCallback(fn: RefreshCallback): void {
    const i = this.callbacks.indexOf(fn);
    if (i >= 0) this.callbacks.splice(i, 1);
  }

  toInfo(): ControllerInfo {
    const account = this.getAccount();
    return {
      id: this.id,
      accountId: this.accountId,
      accountAlias: account?.alias ?? '',
      accountLogin: account?.login ?? '',
      accountServiceUrl: account?.urlWebService ?? '',
      isConnected: this.isConnected(),
      isConnecting: this.isConnecting(),
      needTwoFactorAuth: this._needTwoFactorAuth,
      unreadMessages: this.getUnreadMessages(),
      calendarEvents: this.getCalendarEvents(),
      tasks: this.getTasks(),
      draftMessages: this.getDraftMessages(),
      lastErrorMessage: this.getLastErrorMessage(),
      mailBoxInfo: this.getMailboxInfo(),
    };
  }

  shutdown(): void {
    this.service.shutdown();
    this.callbacks = [];
  }
}

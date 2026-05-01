// ============================================================
// modules/controller/SuperController.ts
// ============================================================

import { ServiceEventType, ControllerInfo, CalendarEvent, Task, ErrorEntry } from '../../types';
import { Logger } from '../service/Logger';
import { Controller, RefreshCallback } from './Controller';
import { Prefs } from '../service/Prefs';
import { randomHex, filterMessagesByRegex } from '../service/Util';

const log = new Logger('SuperController');

class SuperControllerImpl {
  private controllers: Controller[] = [];
  private globalCallbacks: RefreshCallback[] = [];

  /** (Re)load controllers from persisted prefs. */
  async initialize(): Promise<void> {
    await Prefs.load();
    this.controllers.forEach((c) => c.shutdown());
    this.controllers = [];

    const accounts = Prefs.getAccounts();
    for (const account of accounts) {
      const ctrl = new Controller(account.id, account.id);
      ctrl.addCallback(this.onControllerEvent.bind(this));
      this.controllers.push(ctrl);
    }
    log.info('Initialized', { controllers: this.controllers.length });

    // Auto-connect if enabled
    if (Prefs.get().autoConnect) {
      for (const ctrl of this.controllers) {
        const password = await Prefs.loadPassword(ctrl.accountId);
        if (password) ctrl.initializeConnection(password);
      }
    }
  }

  private onControllerEvent(event: ServiceEventType, data?: unknown): void {
    this.globalCallbacks.forEach((cb) => cb(event, data));
  }

  getControllers(): Controller[] {
    return this.controllers;
  }

  addGlobalCallback(fn: RefreshCallback): void {
    this.globalCallbacks.push(fn);
  }

  removeGlobalCallback(fn: RefreshCallback): void {
    const i = this.globalCallbacks.indexOf(fn);
    if (i >= 0) this.globalCallbacks.splice(i, 1);
  }

  hasConnectionActivated(): boolean {
    return this.controllers.some((c) => c.isConnected() || c.isConnecting());
  }

  getNbMessageUnread(): number {
    const filter = Prefs.get().messageFilterRegex ?? '';
    return this.controllers.reduce(
      (sum, c) => sum + filterMessagesByRegex(c.getUnreadMessages(), filter).length,
      0,
    );
  }

  getAllControllerInfos(): ControllerInfo[] {
    return this.controllers.map((c) => c.toInfo());
  }

  getEvents(): CalendarEvent[] {
    return this.controllers.flatMap((c) => c.getCalendarEvents());
  }

  getTasks(): Task[] {
    return this.controllers.flatMap((c) => c.getTasks());
  }

  getLastErrorMessage(): ErrorEntry | null {
    return this.controllers.flatMap((c) => c.getLastErrorMessage()).find((error) => error) ?? null;
  }

  async addNewAccount(): Promise<string> {
    const newId = randomHex(8);
    await Prefs.addAccount({
      id: newId,
      alias: '',
      login: '',
      passwordEncrypted: '',
      urlWebService: '',
      urlWebInterface: '',
      savePassword: false,
    });
    const ctrl = new Controller(newId, newId);
    ctrl.addCallback(this.onControllerEvent.bind(this));
    this.controllers.push(ctrl);
    return newId;
  }

  async removeController(ctrl: Controller): Promise<void> {
    ctrl.shutdown();
    const i = this.controllers.indexOf(ctrl);
    if (i >= 0) this.controllers.splice(i, 1);
    await Prefs.removeAccount(ctrl.accountId);
  }
}

export const SuperController = new SuperControllerImpl();

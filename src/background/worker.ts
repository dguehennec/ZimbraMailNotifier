// ============================================================
// background/worker.ts — MV3 service worker entry point
// ============================================================

import { Logger } from '../modules/service/Logger';
import { SuperController } from '../modules/controller/SuperController';
import { ServiceEventType, BackgroundMessage, CalendarEvent } from '../types';
import { Constants } from '../modules/constant/constants';

const log = new Logger('Worker');

// ─── Keep-alive (MV3 service worker) ─────────────────────────

let keepAliveTimer: ReturnType<typeof setTimeout> | undefined;

async function keepAlive(): Promise<void> {
  const info = await chrome.runtime.getPlatformInfo();
  log.trace(`KeepAlive on ${info.os}`);
  await ensureOffscreenDocument();
}

async function ensureOffscreenDocument(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
    justification: 'Needed to play sound notifications',
  });
}

// ─── Badge / icon refresh ─────────────────────────────────────

function refreshBadge(): void {
  const nbUnread = SuperController.getNbMessageUnread();
  const hasError = SuperController.getLastErrorMessage() !== null;
  const hasConnection = SuperController.hasConnectionActivated();

  let icon = '../skin/images/icon_disabled.png';
  if (hasConnection) {
    icon = hasError ? '../skin/images/icon_warning.png' : '../skin/images/icon_default.png';
  }
  chrome.action.setIcon({ path: icon });
  chrome.action.setBadgeText({ text: nbUnread > 0 ? `${nbUnread}` : '' });
}

// ─── Event → badge + forward to popup/options ─────────────────

function onServiceEvent(event: ServiceEventType, data?: unknown): void {
  if (event === ServiceEventType.NEED_PLAY_SOUND) {
    const payload = data as { selected: string; customSound: string; volumeSound: number };
    ensureOffscreenDocument().then(() => {
      setTimeout(() => {
        chrome.runtime.sendMessage({
          source: 'worker',
          func: 'playSound',
          args: [payload.selected, payload.customSound, payload.volumeSound],
        }).catch(() => { 
          log.trace(`popup/offscreen may not be open`);
        });
      }, 200);
    });
    return;
  }

  if (event === ServiceEventType.CONNECTING || event === ServiceEventType.CHECKING_CALENDAR || event === ServiceEventType.CHECKING_UNREAD_MSG || event === ServiceEventType.CHECKING_TASK || event === ServiceEventType.CHECKING_MAILBOX_INFO) {
    chrome.action.setIcon({ path: '../skin/images/icon_refresh.png' });
  } else {
    refreshBadge();
  }

  // Notify popup / options
  chrome.runtime.sendMessage({ source: 'worker', func: 'needRefresh', args: [event] }).catch(() => { 
    log.trace(`popup/offscreen may not be open`);
  });
}

// ─── Message handler ──────────────────────────────────────────

const handlers: Record<string, (...args: unknown[]) => unknown> = {
  getControllers: () => SuperController.getAllControllerInfos(),
  getEvents: () => SuperController.getEvents().map((e: CalendarEvent) => ({
    id: e.id, name: e.name, duration: e.duration,
    startDate: e.startDate, endDate: e.endDate, startWeek: e.startWeek,
  })),
  getTasks: () => SuperController.getTasks(),

  testSound: async (selected: unknown, customSound: unknown, volume: unknown) => {
    await ensureOffscreenDocument();
    setTimeout(() => {
      chrome.runtime.sendMessage({
        source: 'worker',
        func: 'playSound',
        args: [selected, customSound, volume],
      }).catch(() => { 
        log.trace(`offscreen may not be open`);
      });
    }, 150);
    return true;
  },

  initializeConnection: (id: unknown, password: unknown) => {
    const ctrl = SuperController.getControllers().find((c) => c.id === id);
    ctrl?.initializeConnection(password as string);
    return !!ctrl;
  },

  sendTwoFactorToken: (id: unknown, token: unknown) => {
    const ctrl = SuperController.getControllers().find((c) => c.id === id);
    ctrl?.sendTwoFactorToken(token as string);
    return !!ctrl;
  },

  closeConnection: (id: unknown) => {
    const ctrl = SuperController.getControllers().find((c) => c.id === id);
    ctrl?.closeConnection();
    return !!ctrl;
  },

  checkNow: (id: unknown) => {
    const ctrl = SuperController.getControllers().find((c) => c.id === id);
    ctrl?.checkNow();
    return !!ctrl;
  },

  removeController: async (id: unknown) => {
    const ctrl = SuperController.getControllers().find((c) => c.id === id);
    if (ctrl) await SuperController.removeController(ctrl);
    return !!ctrl;
  },

  addNewAccount: async () => SuperController.addNewAccount(),

  openZimbraWebInterface: (accountId: unknown) => {
    const ctrl = SuperController.getControllers().find((c) => c.getAccountId() === accountId);
    ctrl?.openZimbraWebInterface();
    return !!ctrl;
  },

  getPrefs: async () => {
    const { Prefs } = await import('../modules/service/Prefs');
    if (!Prefs.isLoaded()) await Prefs.load();
    return Prefs.get();
  },

  savePassword: async (accountId: unknown, password: unknown) => {
    const { Prefs } = await import('../modules/service/Prefs');
    await Prefs.savePassword(accountId as string, password as string);
    return true;
  },

  updateAccount: async (accountId: unknown, patch: unknown) => {
    const { Prefs } = await import('../modules/service/Prefs');
    await Prefs.updateAccount(accountId as string, patch as Partial<import('../types').AccountConfig>);
    return true;
  },

  updatePref: async (key: unknown, value: unknown) => {
    const { Prefs } = await import('../modules/service/Prefs');
    await Prefs.update(key as keyof import('../types').AppPrefs, value as never);
    return true;
  },
};

chrome.runtime.onMessage.addListener((msg: BackgroundMessage, _sender: any, sendResponse: any) => {
  if (!msg?.func) return false;

  if (msg.func === 'needKeepAlive') {
    clearTimeout(keepAliveTimer);
    keepAliveTimer = setTimeout(keepAlive, 5000);
    return false;
  }

  const fn = handlers[msg.func];
  if (!fn) {
    log.warn(`Unknown message function: ${msg.func}`);
    return false;
  }

  Promise.resolve(fn(...(msg.args ?? []))).then(sendResponse).catch((e) => {
    log.error('Handler error', e);
    sendResponse(null);
  });
  return true; // async response
});

// ─── Boot ─────────────────────────────────────────────────────

async function boot(): Promise<void> {
  try {
    log.info('Service worker starting');
    SuperController.addGlobalCallback(onServiceEvent);
    await SuperController.initialize();

    chrome.alarms.create({ periodInMinutes: Constants.SERVICE.KEEP_ALIVE_ALARM_PERIOD });
    chrome.alarms.onAlarm.addListener(keepAlive);

    await keepAlive();
    log.info('Service worker ready');
  } catch (e) {
    log.error('FATAL in boot', e);
  }
}

boot();
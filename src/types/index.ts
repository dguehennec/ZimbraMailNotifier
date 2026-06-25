// ============================================================
// types/index.ts — Shared types for Zimbra Mail Notifier
// ============================================================

// ─── Enums ───────────────────────────────────────────────────

export enum RequestStatus {
  NOT_STARTED = -2,
  RUNNING = -1,
  NO_ERROR = 0,
  INTERNAL_ERROR = 1,
  CANCELED = 2,
  TIMEOUT = 3,
  SERVER_ERROR = 4,
  NETWORK_ERROR = 5,
  AUTH_REQUIRED = 6,
  LOGIN_INVALID = 7,
  WAITSET_INVALID = 8,
  REQUEST_INVALID = 9,
  TWOFA_AUTHENTICATION_REQUIRED = 10,
}

export enum ServiceState {
  NOTHING_TO_DO = 'NOTHING_TO_DO',
  CONNECT_RUN = 'CONNECT_RUN',
  CONNECT_WAIT = 'CONNECT_WAIT',
  REFRESH_START = 'REFRESH_START',
  WAITSET_LOOP_START = 'WAITSET_LOOP_START',
}

export enum ServiceEventType {
  STOPPED = 'STOPPED',
  CONNECTING = 'CONNECTING',
  INVALID_LOGIN = 'INVALID_LOGIN',
  CONNECT_ERR = 'CONNECT_ERR',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  CHECKING_UNREAD_MSG = 'CHECKING_UNREAD_MSG',
  UNREAD_MSG_UPDATED = 'UNREAD_MSG_UPDATED',
  CHECKING_CALENDAR = 'CHECKING_CALENDAR',
  CALENDAR_UPDATED = 'CALENDAR_UPDATED',
  CHECKING_TASK = 'CHECKING_TASK',
  TASK_UPDATED = 'TASK_UPDATED',
  CHECKING_DRAFT = 'CHECKING_DRAFT',
  DRAFT_UPDATED = 'DRAFT_UPDATED',
  CHECKING_MAILBOX_INFO = 'CHECKING_MAILBOX_INFO',
  MAILBOX_INFO_UPDATED = 'MAILBOX_INFO_UPDATED',
  REQUEST_FAILED = 'REQUEST_FAILED',
  TWOFA_AUTHENTICATION_REQUIRED = 'TWOFA_AUTHENTICATION_REQUIRED',
  NEED_PLAY_SOUND = 'NEED_PLAY_SOUND',
}

export enum LogLevel {
  ERROR = 1,
  WARNING = 2,
  INFO = 3,
  TRACE = 4,
}

export enum SoundType {
  DING = 'ding',
  DRAIN = 'drain',
  HEAL = 'heal',
  PING = 'ping',
  CUSTOM = 'custom',
}

export enum SoundPath {
  DING = 'skin/ding.ogg',
  DRAIN = 'skin/drain.ogg',
  HEAL = 'skin/heal.ogg',
  PING = 'skin/ping.ogg',
}

export enum TaskPriority {
  HIGH = '1',
  NORMAL = '5',
  LOW = '9',
}

// ─── Domain interfaces ────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  name: string;
  duration: number;
  startDate: Date;
  endDate: Date;
  allDay: boolean,
  startWeek: number;
  location?: string;
}

export interface MailMessage {
  id: string;
  subject: string;
  from: string;
  date: Date;
  abstract: string;
  folderId: string;
  conversationId: string;
}


export interface DraftMessage {
  id: string;
  subject: string;
  to: string;
  date: Date;
  abstract: string;
}

export interface Task {
  id: string;
  name: string;
  priority: TaskPriority;
  percentComplete: number;
  dueDate?: Date;
}

export interface MailboxInfo {
  quotaUsed: number;
  quotaLimit: number;
  email: string;
  displayName: string;
}

export interface SessionInfo {
  authToken: string | null;
  sid: string | null;
  lifetime: number;
  urlWebService: string;
  urlWebInterface: string;
  user: string;
  waitSetId: string | null;
  waitSetSeq: number;
  deviceTrustedToken: string | null;
  deviceId: string;
  twoFactorAuthRequired: boolean;
  connectionDate: Date| null;
}

export interface WaitSetInfo {
  id: string;
  seq: number;
  urlWebService: string;
  user: string;
}

export interface DeviceTrustedInfos {
  id: string | null;
  deviceId: string;
}

// ─── Account / Prefs ─────────────────────────────────────────

export interface AccountConfig {
  id: string;
  alias: string;
  login: string;
  passwordEncrypted: string;
  urlWebService: string;
  urlWebInterface: string;
  savePassword: boolean;
}

export interface AppPrefs {
  isFirstLaunch: boolean;
  previousVersion: number;
  currentVersion: number;
  autoConnect: boolean;
  // Notifications
  emailNotificationEnabled: boolean;
  emailSoundEnabled: boolean;
  emailSoundSelected: SoundType;
  emailSoundFile: string;
  emailSoundVolume: number;
  emailNotificationDuration: number;
  // Browser
  browserSetCookies: boolean;
  browserCookieHttpOnly: boolean;
  // Popup
  popupColor: string;
  popupWidth: number;
  // Messages
  messageEnabled: boolean;
  unrealMessageOnlyInbox: boolean;
  messageNbDisplayed: number;
  messageNbCharsDisplayed: number;
  messageFilterRegex: string;
  // Calendar
  calendarEnabled: boolean;
  calendarPeriodDisplayed: number;
  calendarNbDisplayed: number;
  calendarNotificationEnabled: boolean;
  calendarSoundEnabled: boolean;
  calendarSoundSelected: SoundType;
  calendarSoundFile: string;
  calendarSoundVolume: number;
  calendarReminderTimeConf: number[];
  calendarReminderNbRepeat: number;
  // Tasks
  taskEnabled: boolean;
  taskNbDisplayed: number;
  taskPriorities: TaskPriority[];
  // Drafts
  draftEnabled: boolean;
  draftNbDisplayed: number;
  // Accounts list
  accounts: AccountConfig[];
  // Per account (keyed by accountId)
  requestQueryTimeout: number;
  requestWaitTimeout: number;
  queryLoopEnabled: boolean;
  queryLoopPeriod: number;
}

// ─── Messaging types ─────────────────────────────────────────

export type BackgroundFuncName =
  | 'getControllers'
  | 'getEvents'
  | 'getTasks'
  | 'testSound'
  | 'initializeConnection'
  | 'sendTwoFactorToken'
  | 'closeConnection'
  | 'checkNow'
  | 'removeController'
  | 'addNewAccount'
  | 'openZimbraWebInterface'
  | 'getPrefs'
  | 'savePassword'
  | 'updateAccount'
  | 'updatePref';

export interface BackgroundMessage {
  source: string;
  func: BackgroundFuncName | 'log' | 'needKeepAlive' | 'needRefresh' | 'playSound';
  args: unknown[];
}

export interface ErrorEntry {
  status: RequestStatus;
  message: string;
  ts: number;
}

export interface ControllerInfo {
  id: string;
  accountId: string;
  accountAlias: string;
  accountLogin: string;
  isConnected: boolean;
  isConnecting: boolean;
  needTwoFactorAuth: boolean;
  unreadMessages: MailMessage[];
  calendarEvents: CalendarEvent[];
  tasks: Task[];
  draftMessages: DraftMessage[];
  lastErrorMessage: ErrorEntry | null;
  mailBoxInfo: MailboxInfo | null;
}

// ─── Error types ─────────────────────────────────────────────

export class ZimbraError extends Error {
  constructor(
    public readonly code: RequestStatus,
    message: string,
    public readonly zimbraCode?: string
  ) {
    super(message);
    this.name = 'ZimbraError';
  }
}

export class NetworkError extends ZimbraError {
  constructor(message: string, public readonly retriable = true) {
    super(RequestStatus.NETWORK_ERROR, message);
    this.name = 'NetworkError';
  }
}

export class AuthError extends ZimbraError {
  constructor(message: string) {
    super(RequestStatus.AUTH_REQUIRED, message);
    this.name = 'AuthError';
  }
}

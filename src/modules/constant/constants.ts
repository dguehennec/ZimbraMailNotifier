// ============================================================
// modules/constant/constants.ts
// ============================================================

import { LogLevel, SoundType, TaskPriority } from '../../types';

export const Constants = {
  VERSION: 4,

  LOGGER: {
    LEVEL: LogLevel.WARNING,
    PRINT_STACK: false,
    PRINT_DATA_REQUEST: false,
  },

  SERVICE: {
    /** ms between periodic "check now" loops */
    QUERY_WAIT_LOOP: 2 * 60 * 1000,
    /** min wait after a connection failure */
    CONNECT_BASE_WAIT_AFTER_FAILURE: 30_000,
    /** max wait cap */
    CONNECT_MAX_WAIT_AFTER_FAILURE: 15 * 60_000,
    /** default request timeout */
    DEFAULT_QUERY_TIMEOUT: 30_000,
    /** default wait-set block timeout */
    DEFAULT_WAIT_TIMEOUT: 310_000,
    /** keep-alive alarm period (minutes) */
    KEEP_ALIVE_ALARM_PERIOD: 1,
    /** max event notifier accepted */
    MAX_EVENT_NOTIFIERS: 100,
  },

  RETRY: {
    MAX_ATTEMPTS: 4,
    BASE_DELAY_MS: 1_000,
    MAX_DELAY_MS: 30_000,
    BACKOFF_FACTOR: 2,
    JITTER_MS: 500,
  },

  DEFAULT_PREFS: {
    AUTO_CONNECT: false,
    EMAIL_NOTIFICATION_ENABLED: true,
    EMAIL_SOUND_ENABLED: false,
    EMAIL_SOUND_SELECTED: SoundType.DING,
    EMAIL_SOUND_VOLUME: 80,
    EMAIL_NOTIFICATION_DURATION: 8,
    BROWSER_SET_COOKIES: true,
    BROWSER_COOKIE_HTTP_ONLY: false,
    POPUP_COLOR: '#ffffff',
    POPUP_WIDTH: 380,
    MESSAGE_ENABLED: true,
    UNREAL_MESSAGE_ONLY_INBOX: false,
    MESSAGE_NB_DISPLAYED: 5,
    MESSAGE_NB_CHARS_DISPLAYED: 50,
    MESSAGE_FILTER_REGEX: '',
    CALENDAR_ENABLED: true,
    CALENDAR_PERIOD_DISPLAYED: 7,
    CALENDAR_NB_DISPLAYED: 5,
    CALENDAR_NOTIFICATION_ENABLED: true,
    CALENDAR_SOUND_ENABLED: false,
    CALENDAR_SOUND_SELECTED: SoundType.DING,
    CALENDAR_SOUND_VOLUME: 80,
    CALENDAR_REMINDER_TIME_CONF: [5, 15],
    CALENDAR_REMINDER_NB_REPEAT: 2,
    TASK_ENABLED: true,
    TASK_NB_DISPLAYED: 5,
    TASK_PRIORITIES: [TaskPriority.HIGH, TaskPriority.NORMAL, TaskPriority.LOW],
    DRAFT_ENABLED: false,
    DRAFT_NB_DISPLAYED: 5,
    REQUEST_QUERY_TIMEOUT: 30_000,
    REQUEST_WAIT_TIMEOUT: 310_000,
    QUERY_LOOP_ENABLED: true,
    QUERY_LOOP_PERIOD: 5 * 60_000,
  },

  ZIMBRA: {
    SOAP_URL_SUFFIX: '/service/soap/',
    /** Extra ms safety margin on token expiry */
    TOKEN_LIFETIME_SAFETY_MARGIN_MS: 60000,
    /** Free/Alice mail servers hosts */
    FREE_HOSTS: ['zimbra.free.fr', 'zimbra.aliceadsl.fr'],
    /** Free/Alice token lifetime (12 h) */
    FREE_TOKEN_LIFETIME_MS: 43_200_000,
  },
} as const;

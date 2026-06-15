// ============================================================
// modules/service/ZimbraWebservice.ts
// All Zimbra SOAP calls, using fetch + async/await + retry/backoff
// ============================================================

import {
  RequestStatus,
  CalendarEvent, MailMessage, DraftMessage, Task, MailboxInfo,
  SessionInfo, WaitSetInfo, DeviceTrustedInfos,
  ZimbraError, NetworkError, AuthError,
} from '../../types';
import { Logger } from './Logger';
import { withRetry, safeJson, weekDate } from './Util';
import { Constants } from '../constant/constants';

const log = new Logger('Webservice');

// ─── SOAP helpers ─────────────────────────────────────────────

function soapEnvelope(body: object, token?: string | null): string {
  return JSON.stringify({
    Header: { context: token ? {  _jsns: 'urn:zimbra', authToken: token, session: {}, format: { type: 'js' } } : { _jsns: 'urn:zimbra', format: { type: 'js' } } },
    Body: body,
  });
}

type SoapContent = string | { _content: string };

function soapContent(v?: SoapContent): string | null {
  if (!v) return null;
  return typeof v === 'string' ? v : v._content;
}

type AuthResponseBody = {
  twoFactorAuthRequired?: { _content: string };
  authToken?: Array<{ _content: string }>;
  lifetime?: number;
  trustedToken?: SoapContent;
  deviceId?: SoapContent;
};

function applyTrustedDevice(session: ZimbraSession, ar: AuthResponseBody): void {
  const trustedToken = soapContent(ar.trustedToken);
  const deviceId = soapContent(ar.deviceId);
  if (trustedToken) {
    session.deviceTrustedToken = trustedToken;
    session.deviceTrustedInfos.id = trustedToken;
  }
  if (deviceId) {
    session.deviceTrustedInfos.deviceId = deviceId;
  }
}

// ─── Session ──────────────────────────────────────────────────

export class ZimbraSession {
  authToken: string | null = null;
  tokenExpiry: number = 0;
  urlWebService = '';
  urlWebInterface = '';
  user = '';
  waitSetId: string | null = null;
  waitSetSeq = 0;
  deviceTrustedToken: string | null = null;
  twoFactorAuthRequired: boolean = false;
  connectionDate: Date| null = null;

  deviceTrustedInfos: DeviceTrustedInfos;

  constructor(deviceTrustedInfos: DeviceTrustedInfos) {
    this.deviceTrustedInfos = { ...deviceTrustedInfos };
  }

  isAuthenticated(): boolean {
    if (!this.authToken || this.twoFactorAuthRequired) return false;
    return Date.now() < this.tokenExpiry - Constants.ZIMBRA.TOKEN_LIFETIME_SAFETY_MARGIN_MS;
  }

  toWaitSetInfo(): WaitSetInfo | null {
    if (!this.waitSetId) return null;
    return { id: this.waitSetId, seq: this.waitSetSeq, urlWebService: this.urlWebService, user: this.user };
  }

  isTwoFactorAuthRequired(): boolean {
    return this.twoFactorAuthRequired;
  }

  toSessionInfo(): SessionInfo {
    return {
      authToken: this.authToken,
      lifetime: this.tokenExpiry,
      urlWebService: this.urlWebService,
      urlWebInterface: this.urlWebInterface,
      user: this.user,
      waitSetId: this.waitSetId,
      waitSetSeq: this.waitSetSeq,
      deviceTrustedToken: this.deviceTrustedToken,
      deviceId: this.deviceTrustedInfos.deviceId,
      twoFactorAuthRequired: this.twoFactorAuthRequired,
      connectionDate: this.connectionDate,
    };
  }
}

// ─── HTTP layer ───────────────────────────────────────────────

interface FetchOptions {
  token?: string | null;
  timeout?: number;
}

async function callSoap<T = unknown>(
  url: string,
  bodyObj: object,
  opts: FetchOptions = {}
): Promise<T> {
  const { token, timeout = Constants.SERVICE.DEFAULT_QUERY_TIMEOUT } = opts;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeout);
  const payload = soapEnvelope(bodyObj, token);

  log.traceRequest(`SOAP → ${url}`, payload);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
      credentials: 'include',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      body: payload,
      signal: ac.signal,
    });

    const text = await resp.text();
    log.traceRequest(`SOAP ← ${resp.status}`, text);

    if (!resp.ok) {
      const parsed = safeJson<{ Body?: { Fault?: { Detail?: { Error?: { Code?: string } }; Reason?: { Text?: string } } } }>(text);
      const zimbraCode = parsed?.Body?.Fault?.Detail?.Error?.Code;
      const reason = parsed?.Body?.Fault?.Reason?.Text ?? '';
      const status = mapZimbraCode(zimbraCode);
      log.error(`SOAP error ${resp.status}`, { zimbraCode, reason });

      if (status === RequestStatus.AUTH_REQUIRED) throw new AuthError(`Auth required: ${reason}`);
      if (status === RequestStatus.NETWORK_ERROR) throw new NetworkError(`Network: ${reason}`);
      throw new ZimbraError(status, `${zimbraCode ?? resp.status}: ${reason}`, zimbraCode);
    }

    const json = safeJson<{ Body: T }>(text);
    if (!json) throw new ZimbraError(RequestStatus.INTERNAL_ERROR, 'Invalid JSON response');
    return json.Body;
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new ZimbraError(RequestStatus.TIMEOUT, 'Request timed out');
    }
    if (e instanceof ZimbraError) throw e;
    throw new NetworkError((e as Error).message);
  } finally {
    clearTimeout(timer);
  }
}

function mapZimbraCode(code?: string): RequestStatus {
  if (!code) return RequestStatus.SERVER_ERROR;
  switch (code) {
    case 'service.TOO_MANY_HOPS':
    case 'service.WRONG_HOST':
    case 'service.PROXY_ERROR':
    case 'mail.TRY_AGAIN':
      return RequestStatus.NETWORK_ERROR;
    case 'service.PERM_DENIED':
    case 'service.AUTH_REQUIRED':
    case 'service.AUTH_EXPIRED':
      return RequestStatus.AUTH_REQUIRED;
    case 'account.AUTH_FAILED':
    case 'account.CHANGE_PASSWORD':
    case 'account.NO_SUCH_ACCOUNT':
    case 'account.TWO_FACTOR_AUTH_FAILED':
      return RequestStatus.LOGIN_INVALID;
    case 'mail.NO_SUCH_WAITSET':
    case 'admin.NO_SUCH_WAITSET':
      return RequestStatus.WAITSET_INVALID;
    default:
      return RequestStatus.SERVER_ERROR;
  }
}

// ─── ZimbraWebservice public API ──────────────────────────────

export class ZimbraWebservice {
  private readonly session: ZimbraSession;
  private currentAbortCtrl: AbortController | null = null;

  constructor(
    private readonly urlWebService: string,
    deviceTrustedInfos: DeviceTrustedInfos,
    private readonly queryTimeout: number,
    private readonly waitTimeout: number,
    public readonly onSessionChanged: (info: SessionInfo) => void
  ) {
    this.session = new ZimbraSession(deviceTrustedInfos);
    this.session.urlWebService = urlWebService;
  }

  get isAuthenticated(): boolean {
    return this.session.isAuthenticated();
  }

  get sessionInfo(): SessionInfo {
    return this.session.toSessionInfo();
  }

  get waitSetInfo(): WaitSetInfo | null {
    return this.session.toWaitSetInfo();
  }

  abort(): void {
    this.currentAbortCtrl?.abort();
    this.currentAbortCtrl = null;
  }

  private getZimbraSoapUrl(url: string): string {
    return url.replace(/\/$/, '') + Constants.ZIMBRA.SOAP_URL_SUFFIX;
  }

  /** Authenticate (username + password). Returns true on success. */
  async authenticate(
    urlWebService: string,
    urlWebInterface: string,
    user: string,
    password: string
  ): Promise<void> {
    log.info('authenticate', { urlWebService, urlWebInterface, user });
        await withRetry(async () => {
      log.info('withRetry');
      const soapUrl = this.getZimbraSoapUrl(urlWebService);
      const trusted = this.session.deviceTrustedInfos;

      type AuthResp = { AuthResponse?: AuthResponseBody };
      const body = await callSoap<AuthResp>(soapUrl, {
        AuthRequest: {
          _jsns: 'urn:zimbraAccount',
          account: { by: 'name', _content: user },
          password: { _content: password },
          ...(trusted.id && trusted.deviceId
            ? {
                trustedToken: { _content: trusted.id },
                deviceId: { _content: trusted.deviceId },
              }
            : {
                generateDeviceId: '1',
              }),
        },
      }, { timeout: this.queryTimeout });

      const ar = body.AuthResponse;
      if (!ar?.authToken?.[0]?._content) {
        throw new ZimbraError(RequestStatus.INTERNAL_ERROR, 'No auth token in response');
      }
      this.session.authToken = soapContent(ar.authToken[0]);
      this.session.tokenExpiry = Date.now() + (ar.lifetime ?? 3_600_000);
      this.session.urlWebService = urlWebService;
      this.session.urlWebInterface = urlWebInterface;
      this.session.twoFactorAuthRequired = soapContent(ar.twoFactorAuthRequired) === "true";
      this.session.user = user;
      this.session.connectionDate = new Date();
      applyTrustedDevice(this.session, ar);

      this.onSessionChanged(this.session.toSessionInfo());
      log.info('Authenticated', { user });
    }, { shouldRetry: (e) => e instanceof NetworkError && e.retriable });
  }

  /** Authenticate with 2FA token. */
  async authenticateTwoFactor(token: string): Promise<void> {
    log.info('authenticateTwoFactor', { token });
    const soapUrl = this.getZimbraSoapUrl(this.session.urlWebService);
    const deviceId = this.session.deviceTrustedInfos.deviceId;

    type TwoFAResp = { AuthResponse?: AuthResponseBody };
    const body = await callSoap<TwoFAResp>(soapUrl, {
      AuthRequest: {
        _jsns: 'urn:zimbraAccount',
        deviceTrusted: '1',
        ...(deviceId
          ? { deviceId: { _content: deviceId } }
          : { generateDeviceId: '1' }),
        account: { by: 'name', _content: this.session.user },
        authToken: { _content: this.session.authToken },
        twoFactorCode: { _content: token },
      },
    }, { token: this.session.authToken, timeout: this.queryTimeout });

    const ar = body.AuthResponse;
    if (!ar?.authToken?.[0]?._content) {
      throw new ZimbraError(RequestStatus.LOGIN_INVALID, 'No auth token in 2FA response');
    }
    this.session.authToken = soapContent(ar.authToken[0]);
    this.session.tokenExpiry = Date.now() + (ar.lifetime ?? 3_600_000);
    this.session.twoFactorAuthRequired = false;
    applyTrustedDevice(this.session, ar);
    this.onSessionChanged(this.session.toSessionInfo());
    log.info('Authenticated', { user: this.session.user, token });
  }

  /** Get mailbox info (quota, email, displayName). */
  async getMailboxInfo(): Promise<MailboxInfo> {
    log.info('getMailboxInfo');
    const soapUrl = this.getZimbraSoapUrl(this.session.urlWebService);

    type InfoResp = { GetInfoResponse?: { name?: string; displayName?: string; used?: number; limit?: number; domainMaxAccounts?: number } };
    const body = await callSoap<InfoResp>(soapUrl, {
      GetInfoResponse: undefined,
      GetInfoRequest: { _jsns: 'urn:zimbraAccount', sections: 'mbox' },
    }, { token: this.session.authToken, timeout: this.queryTimeout });

    const r = body.GetInfoResponse ?? {};
    return {
      email: r.name ?? this.session.user,
      displayName: r.displayName ?? '',
      quotaUsed: r.used ?? 0,
      quotaLimit: r.limit ?? 0,
    };
  }

  /** Fetch unread messages. */
  async getUnreadMessages(): Promise<MailMessage[]> {
    log.info('getUnreadMessages');
    const soapUrl = this.getZimbraSoapUrl(this.session.urlWebService);

    type SearchResp = { SearchResponse?: { m?: Array<Record<string, unknown>> } };
    const body = await callSoap<SearchResp>(soapUrl, {
      SearchRequest: {
        _jsns: 'urn:zimbraMail',
        types: 'message',
        query: 'in:inbox is:unread',
        fetch: 'all',
        limit: 200,
        sortBy: 'dateDesc',
      },
    }, { token: this.session.authToken, timeout: this.queryTimeout });

    return (body.SearchResponse?.m ?? []).map((m) => parseMessage(m));
  }

  /** Fetch calendar events for the next N days. */
  async getCalendarEvents(periodDays: number): Promise<CalendarEvent[]> {
    log.info('getCalendarEvents', { periodDays});
    const soapUrl = this.getZimbraSoapUrl(this.session.urlWebService);
    const now = new Date();
    const end = new Date(now.getTime() + periodDays * 86_400_000);

    type ApptResp = { SearchResponse?: { appt?: Array<Record<string, unknown>> } };
    const body = await callSoap<ApptResp>(soapUrl, {
      SearchRequest: {
        _jsns: 'urn:zimbraMail',
        types: 'appointment',
        calExpandInstStart: now.getTime(),
        calExpandInstEnd: end.getTime(),
        limit: 200,
        sortBy: 'dateAsc',
        query: 'in:calendar',
      },
    }, { token: this.session.authToken, timeout: this.queryTimeout });

    return (body.SearchResponse?.appt ?? []).flatMap((a) => parseAppointment(a));
  }

  /** Fetch tasks. */
  async getTasks(): Promise<Task[]> {
    log.info('getTasks');
    const soapUrl = this.getZimbraSoapUrl(this.session.urlWebService);

    type TaskResp = { SearchResponse?: { task?: Array<Record<string, unknown>> } };
    const body = await callSoap<TaskResp>(soapUrl, {
      SearchRequest: {
        _jsns: 'urn:zimbraMail',
        types: 'task',
        query: 'in:tasks',
        limit: 200,
        sortBy: 'taskDueAsc',
      },
    }, { token: this.session.authToken, timeout: this.queryTimeout });

    return (body.SearchResponse?.task ?? []).map((t) => parseTask(t));
  }

  /** Fetch draft messages. */
  async getDraftMessages(): Promise<DraftMessage[]> {
    log.info('getDraftMessages');
    const soapUrl = this.getZimbraSoapUrl(this.session.urlWebService);

    type SearchResp = { SearchResponse?: { m?: Array<Record<string, unknown>> } };
    const body = await callSoap<SearchResp>(soapUrl, {
      SearchRequest: {
        _jsns: 'urn:zimbraMail',
        types: 'message',
        query: 'in:drafts',
        fetch: 'all',
        limit: 200,
        sortBy: 'dateDesc',
      },
    }, { token: this.session.authToken, timeout: this.queryTimeout });

    return (body.SearchResponse?.m ?? []).map((m) => parseDraftMessage(m));
  }

  /** Create a WaitSet. */
  async createWaitSet(): Promise<void> {
    log.info('createWaitSet');
    const soapUrl = this.getZimbraSoapUrl(this.session.urlWebService);

    type WSResp = { CreateWaitSetResponse?: { waitSet?: string; seq?: number } };
    const body = await callSoap<WSResp>(soapUrl, {
      CreateWaitSetRequest: {
        _jsns: 'urn:zimbraMail',
        defTypes: 'f',
        add: { a: [{ name: this.session.user, t: 'all' }] },
      },
    }, { token: this.session.authToken, timeout: this.queryTimeout });

    const r = body.CreateWaitSetResponse;
    if (!r?.waitSet) throw new ZimbraError(RequestStatus.INTERNAL_ERROR, 'No WaitSet id in response');
    this.session.waitSetId = r.waitSet;
    this.session.waitSetSeq = r.seq ?? 0;
    this.onSessionChanged(this.session.toSessionInfo());
    log.info('WaitSet created', { id: this.session.waitSetId });
  }

  /** Wait for server-push events (blocking). Returns true if new events. */
  async waitForEvents(block: boolean): Promise<boolean> {
    log.info('waitForEvents', { block });
    if (!this.session.waitSetId) {
      throw new ZimbraError(RequestStatus.WAITSET_INVALID, 'No WaitSet');
    } 
    const soapUrl = this.getZimbraSoapUrl(this.session.urlWebService);
    const timeout = block ? this.waitTimeout : this.queryTimeout;

    type WaitResp = { WaitSetResponse?: { seq?: number; a?: unknown[] } };
    const body = await callSoap<WaitResp>(soapUrl, {
      WaitSetRequest: {
        _jsns: 'urn:zimbraMail',
        waitSet: this.session.waitSetId,
        seq: this.session.waitSetSeq,
        block: block ? '1' : '0',
      },
    }, { token: this.session.authToken, timeout });

    const r = body.WaitSetResponse;
    if (r?.seq !== undefined) {
      this.session.waitSetSeq = r.seq;
    }
    this.onSessionChanged(this.session.toSessionInfo());
    return (r?.a?.length ?? 0) > 0;
  }

  /** Restore a saved WaitSet from storage. */
  restoreWaitSet(id: string, seq: number): void {
    log.info('restoreWaitSet', { id, seq });
    this.session.waitSetId = id;
    this.session.waitSetSeq = seq;
  }
}

// ─── SOAP response parsers ────────────────────────────────────

function parseMessage(m: Record<string, unknown>): MailMessage {
  const e = Array.isArray(m['e']) ? m['e'] as Array<Record<string, string>> : [];
  const from = e.find((x) => x['t'] === 'f');
  return {
    id: String(m['id'] ?? ''),
    subject: String(m['su'] ?? ''),
    from: from ? (from['p'] || from['a'] || '') : '',
    date: new Date(Number(m['d'] ?? 0)),
    abstract: String(m['fr'] ?? ''),
    folderId: String(m['l'] ?? ''),
    conversationId: String(m['cid'] ?? ''),
  };
}

function parseAppointment(a: Record<string, unknown>): CalendarEvent[] {
  const instances = Array.isArray(a['inst']) ? a['inst'] as Array<Record<string, unknown>> : [];
  return instances.map((inst) => ({
    id: String(a['id'] ?? ''),
    name: String(a['name'] ?? ''),
    duration: Number(a['dur'] ?? '0'),
    startDate: new Date(Number(inst['s'] ?? 0)),
    endDate: new Date(Number(inst['s'] ?? 0) + Number(a['dur'] ?? 0)),
    allDay: Boolean(inst['allDay']),
    startWeek: weekDate(new Date(Number(inst['s'] ?? 0))),
    location: String(a['loc'] ?? ''),
  }));
}

function parseTask(t: Record<string, unknown>): Task {
  return {
    id: String(t['id'] ?? ''),
    name: String(t['name'] ?? ''),
    priority: String(t['priority'] ?? '5') as import('../../types').TaskPriority,
    percentComplete: Number(t['percentComplete'] ?? 0),
  };
}

function parseDraftMessage(m: Record<string, unknown>): DraftMessage {
  const e = Array.isArray(m['e']) ? m['e'] as Array<Record<string, string>> : [];
  const to = e.filter((x) => x['t'] === 't').map((x) => x['p'] || x['a'] || '').join(', ');
  return {
    id: String(m['id'] ?? ''),
    subject: String(m['su'] ?? ''),
    to,
    date: new Date(Number(m['d'] ?? 0)),
    abstract: String(m['fr'] ?? ''),
  };
}

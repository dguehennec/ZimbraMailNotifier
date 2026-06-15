// ============================================================
// ui/popup.ts
// ============================================================

import { ControllerInfo, AppPrefs, RequestStatus } from '../types';
import { filterMessagesByRegex } from '../modules/service/Util';
import { getContrastColor, i18n, sendToBackground, formatAccountName, formatLastErrorMessage, formatRelativeDate, formatRelativeTime, formatRelativeDateTime, formatPercentageQuotaUsed, formatBytes, escHtml, maxStringLength} from './uiutil';

let controllers: ControllerInfo[] = [];
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

async function refresh(): Promise<void> {
  const [prefs, ctrlList] = await Promise.all([
    sendToBackground('getPrefs'),
    sendToBackground('getControllers'),
  ]);
  controllers    = (ctrlList as ControllerInfo[])  ?? [];
  applyPopupPrefs(prefs as AppPrefs | null);
  render();
}

function applyPopupPrefs(prefs: AppPrefs | null): void {
  if (!prefs) return;
  const body = document.body;
  if (prefs.popupColor) {
    body.style.setProperty('--popup-bg', prefs.popupColor);
    body.style.setProperty('--color-text', getContrastColor(prefs.popupColor));
    body.style.setProperty('--color-text-muted', getContrastColor(prefs.popupColor, '#bca3af', '#4b7280'));
  }
  if (prefs.popupWidth) body.style.width = `${prefs.popupWidth}px`;
}

async function render(): Promise<void> {
  const prefs = await sendToBackground('getPrefs');
  renderHeader();
  renderAccounts(prefs as AppPrefs | null);
  renderMessages(prefs as AppPrefs | null);
  renderCalendar(prefs as AppPrefs | null);
  renderTasks(prefs as AppPrefs | null);
  renderDraftMessages(prefs as AppPrefs | null);
}

function renderHeader(): void {
  const btnCheckNow = document.getElementById('btn-check-now')!;
  btnCheckNow.style.display = controllers.some((ctrl) => ctrl.isConnected) ? '' : 'none';
}

function renderAccounts(prefs: AppPrefs | null): void {
  const container = document.getElementById('accounts-container')!;
  container.innerHTML = '';

  if (controllers.length === 0) {
    container.innerHTML = `<div class="empty-state">${i18n('tooltip_configuration_description')}</div>`;
    return;
  }

  for (const ctrl of controllers) {
    const div = document.createElement('div');
    div.className = `account-row ${ctrl.isConnected ? 'connected' : ctrl.isConnecting ? 'connecting' : 'disconnected'}`;
    const mailBoxInfo = ctrl.mailBoxInfo;

    const quotaMsg = (mailBoxInfo && mailBoxInfo.quotaLimit > 0) ?
      `<span class="quota-msg">${i18n('tooltip_connected_descriptionQuota').replace("%PERCENTAGE%", `${formatPercentageQuotaUsed(mailBoxInfo)}`).replace("%USED%", `${formatBytes(mailBoxInfo.quotaUsed)}`).replace("%SIZE%", `${formatBytes(mailBoxInfo.quotaLimit)}`)}</span>`
      : ''

    const statusDot = `<span class="status-dot"></span>`;
    const statusLabel = ctrl.isConnected
      ? `<span class="status-label connected">${i18n('tooltip_connected_descriptionStatus')}</span>`
      : ctrl.isConnecting
        ? `<span class="status-label connecting">${i18n('tooltip_connecting_descriptionStatus')}</span>`
        : `<span class="status-label disconnected">${i18n('tooltip_disconnected_descriptionStatus')}</span>`;

    const filteredCount = filterMessagesByRegex(
      ctrl.unreadMessages,
      prefs?.messageFilterRegex ?? '',
    ).length;
    const badge = filteredCount > 0
      ? `<span class="badge">${filteredCount}</span>` : '';

    const lastErrorMessage = ctrl.lastErrorMessage;
    const errorMsg = lastErrorMessage && lastErrorMessage.status !== RequestStatus.TWOFA_AUTHENTICATION_REQUIRED
      ? `<div class="account-error">${formatLastErrorMessage(lastErrorMessage)}</div>` : '';

    const actions = ctrl.isConnected
      ? `<button class="btn-icon" data-action="disconnect" data-id="${ctrl.id}" title="${i18n('main_disconnect')}">
           <svg class="icon"><use href="skin/icons.svg#icon-disconnect"/></svg>
         </button>`
      : `<button class="btn-icon" data-action="connect" data-id="${ctrl.id}" title="${i18n('main_connect')}">
           <svg class="icon"><use href="skin/icons.svg#icon-connect"/></svg>
         </button>`;

    const openWeb = ctrl.isConnected
      ? `<button class="btn-icon" data-action="open-web" data-account-id="${ctrl.accountId}" title="Open Zimbra">
           <svg class="icon"><use href="skin/icons.svg#icon-external-link"/></svg>
         </button>` : '';

    const twofa = ctrl.needTwoFactorAuth ? `
      <div class="twofa-row">
        <label class="twofa-label">${i18n('option_identifiant_2fatoken_label') || '2FA Token'}</label>
        <div class="twofa-input-row">
          <input type="text" class="twofa-input" placeholder="000000" maxlength="8"
                autocomplete="one-time-code" inputmode="numeric"/>
          <button class="btn-primary btn-twofa-send" data-action="twofa" data-id="${ctrl.id}" data-account-id="${ctrl.accountId}">
            ${i18n('option_identifiant_2fatoken_button') || 'Send'}
          </button>
        </div>
      </div>
    ` : '';

    div.innerHTML = `
      <div class="account-header">
        ${statusDot}
        <span class="account-id">${escHtml(ctrl.accountAlias || ctrl.accountLogin || ctrl.accountId)}</span>
        <div class="account-actions">${badge}${openWeb}${actions}</div>
      </div>
      <div class="account-state">
        ${statusLabel}
        ${quotaMsg}
      </div>
      ${twofa}
      ${errorMsg}
    `;
    container.appendChild(div);
  }
}

function renderMessages(prefs: AppPrefs | null): void {
  const group = document.getElementById('messages-group')!;
  if (!prefs?.messageEnabled) {
    group.style.display = 'none';
    return;
  }
  group.style.display = '';
  const container = document.getElementById('messages-list')!;
  container.innerHTML = '';

  const allMessages = controllers.flatMap((c) => c.unreadMessages).map((m) => {m.date = new Date(m.date); return m});
  const filteredMessages = filterMessagesByRegex(allMessages, prefs?.messageFilterRegex ?? '');
  if (filteredMessages.length === 0) {
    container.innerHTML = `<div class="no-items">${i18n('tooltip_noUnreadMessage')}</div>`;
    return;
  }

  const allSortedMessage = filteredMessages.sort((a,b) => b.date.getTime() - a.date.getTime()).slice(0, prefs?.messageNbDisplayed || 5)
  for (const currentMsg of allSortedMessage) {
    const ctrl = controllers.find((c) => c.unreadMessages.some((ev) => ev.id == currentMsg.id))
    const div = document.createElement('div');
    div.className = 'message-item';
    div.title = `${escHtml(currentMsg.subject + ' - ' + currentMsg.abstract + formatAccountName(ctrl, controllers.length))}`;
    if (ctrl != undefined) {
      div.setAttribute('data-action', 'open-web');
      div.setAttribute('data-account-id', `${ctrl.accountId}`);
    }
    div.innerHTML = `
      <div class="msg-from">${escHtml(i18n('tooltip_message_from').replace('%FROM%', currentMsg.from))}</div>
      <div class="msg-subject">${escHtml(currentMsg.subject || i18n('tooltip_no_subject'))}</div>
      <div class="msg-abstract">${escHtml(currentMsg.abstract.substring(0,prefs?.messageNbCharsDisplayed || 200))}</div>
      <div class="msg-date">${formatRelativeDateTime(currentMsg.date)}</div>
    `;
    container.appendChild(div);
  }
}

function renderCalendar(prefs: AppPrefs | null): void {
  const group = document.getElementById('calendar-group')!;
  if (!prefs?.calendarEnabled) {
    group.style.display = 'none';
    return;
  }
  group.style.display = '';
  const container = document.getElementById('calendar-list')!;
  container.innerHTML = '';

  const allCalendarEvents = controllers.flatMap((c) => c.calendarEvents).map((m) => {
    m.startDate = new Date(m.startDate);
    m.endDate = new Date(m.endDate);
    return m
  });
  if (allCalendarEvents.length === 0) {
    container.innerHTML = `<div class="no-items">${i18n('tooltip_noEvent')}</div>`;
    return;
  }

  const allSortedCalendarEvents = allCalendarEvents.sort((a,b) => a.startDate.getTime() - b.startDate.getTime()).slice(0, prefs?.calendarNbDisplayed || 5)
  let lastDate = "";
  for (const currentEvent of allSortedCalendarEvents) {
      const ctrl = controllers.find((c) => c.calendarEvents.some((ev) => ev.id == currentEvent.id))
      const startDate = currentEvent.startDate;
      const starttime = formatRelativeTime(startDate);
      const currentDate = i18n('tooltip_week').replace("%WEEK%", `${currentEvent.startWeek}`) + " - " + formatRelativeDate(startDate);
      if (lastDate !== currentDate) {
          lastDate = currentDate;
          const div = document.createElement('div');
          div.className = 'event-date';
          div.innerText = currentDate
          container.appendChild(div);
      }
      const endDate = currentEvent.endDate;
      const endTime = formatRelativeTime(endDate);
      let period = '';
      if (currentEvent.duration < 86400000) {
          period = starttime + "-" + endTime;
      }
      const div = document.createElement('div');
      div.className = 'event-item';
      div.title = `${escHtml(currentEvent.name + formatAccountName(ctrl, controllers.length))}`
      div.innerHTML = `
        <div class="event-item-name">${escHtml(maxStringLength(currentEvent.name, 50))}</div>
        <div class="event-item-date">${period}</div>
      `;
      container.appendChild(div);
  }
}

function renderTasks(prefs: AppPrefs | null): void {
  const group = document.getElementById('tasks-group')!;
  if (!prefs?.taskEnabled) {
    group.style.display = 'none';
    return;
  }
  group.style.display = '';
  const container = document.getElementById('tasks-list')!;
  container.innerHTML = '';

  const allTasks = controllers.flatMap((c) => c.tasks ?? []);
  if (allTasks.length === 0) {
    container.innerHTML = `<div class="no-items">${i18n('tooltip_noTask')}</div>`;
    return;
  }

  const allSortedTasks = allTasks.sort((a,b) => b.percentComplete - a.percentComplete).filter((a) => prefs ? prefs.taskPriorities.some((b) => b === a.priority) : true).slice(0, prefs?.taskNbDisplayed || 5)
  for (const currentTask of allSortedTasks) {
     const ctrl = controllers.find((c) => c.tasks.some((ev) => ev.id == currentTask.id))
    const div = document.createElement('div');
    div.className = 'task-item';
    div.title = `${escHtml(currentTask.name + formatAccountName(ctrl, controllers.length))}`
    div.innerHTML = `
      <span class="task-priority p${currentTask.priority}"></span>
      <span class="task-name">${escHtml(currentTask.name)}</span>
      <span class="task-pct">${currentTask.percentComplete}%</span>
    `;
    container.appendChild(div);
  }
}

function renderDraftMessages(prefs: AppPrefs | null): void {
  const group = document.getElementById('drafts-group')!;
  if (!prefs?.draftEnabled) {
    group.style.display = 'none';
    return;
  }
  group.style.display = '';
  const container = document.getElementById('drafts-list')!;
  container.innerHTML = '';

  const allDrafts = controllers.flatMap((c) => c.draftMessages ?? []).map((m) => { m.date = new Date(m.date); return m; });
  if (allDrafts.length === 0) {
    container.innerHTML = `<div class="no-items">${i18n('tooltip_noDraft')}</div>`;
    return;
  }

  const allSortedDrafts = allDrafts.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, prefs?.draftNbDisplayed || 5);
  for (const draft of allSortedDrafts) {
    const ctrl = controllers.find((c) => (c.draftMessages ?? []).some((d) => d.id === draft.id));
    const div = document.createElement('div');
    div.className = 'message-item draft-item';
    div.title = `${escHtml(draft.subject + formatAccountName(ctrl, controllers.length))}`;
    div.innerHTML = `
      <div class="msg-from">${escHtml(draft.to ? i18n('tooltip_draft_to').replace('%TO%', draft.to) : i18n('tooltip_draft_no_recipient'))}</div>
      <div class="msg-subject">${escHtml(draft.subject || i18n('tooltip_no_subject'))}</div>
      <div class="msg-date">${formatRelativeDateTime(draft.date)}</div>
      <div class="msg-abstract">${escHtml(draft.abstract.substring(0, prefs?.messageNbCharsDisplayed || 200))}</div>
    `;
    container.appendChild(div);
  }
}

// ─── Event delegation ─────────────────────────────────────────

document.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  const btn = target.closest('[data-action]') as HTMLElement;
  if (!btn) return;

  const action = btn.dataset['action'];
  const id = btn.dataset['id'];
  const accountId = btn.dataset['accountId'];

  switch (action) {
    case 'connect':
      await sendToBackground('initializeConnection', id);
      break;
    case 'disconnect':
      await sendToBackground('closeConnection', id);
      await refresh();
      break;
    case 'open-web':
      await sendToBackground('openZimbraWebInterface', accountId);
      break;
    case 'twofa':
      const token = (btn.parentElement?.querySelector('.twofa-input') as HTMLInputElement)?.value ?? '';
      if (token) {
        await sendToBackground('sendTwoFactorToken', accountId, token).then(refresh);
      }
      break;
    case 'check-now':
      controllers.filter((c) => c.isConnected).forEach((c) => sendToBackground('checkNow', c.id));
      break;
    case 'open-options':
      chrome.runtime.openOptionsPage();
      break;
  }
});

// ─── Message listener (push refresh from worker) ─────────────

chrome.runtime.onMessage.addListener(({ func }: { func: string }) => {
  if (func === 'needRefresh') {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 100);
  }
});

// ─── Init ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  i18n.applyAll(document);
  const versionEl = document.getElementById('popup-version');
  if (versionEl) {
    versionEl.textContent = `${i18n('about_version_label')} ${chrome.runtime.getManifest().version}`;
  }
  refresh();
});

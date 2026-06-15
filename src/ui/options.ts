// ============================================================
// ui/options.ts — Full settings page
// ============================================================

import { i18n, sendToBackground, formatLastErrorMessage } from './uiutil';
import { AppPrefs, SoundType, SoundPath, TaskPriority, ServiceEventType, RequestStatus } from '../types';

// ─── Custom sound dataUrl storage (email / cal) ───────────
const customSoundData: Record<string, { dataUrl: string; name: string }> = { email: { dataUrl: '', name: '' }, cal: { dataUrl: '', name: '' } };

// ─── Tab navigation ───────────────────────────────────────────

const tabs = document.querySelectorAll<HTMLElement>('[data-tab-target]');
const panels = document.querySelectorAll<HTMLElement>('[data-tab-panel]');

function activateTab(target: string): void {
  tabs.forEach((t) => t.classList.toggle('active', t.dataset['tabTarget'] === target));
  panels.forEach((p) => p.classList.toggle('hidden', p.dataset['tabPanel'] !== target));
}

tabs.forEach((t) => t.addEventListener('click', () => activateTab(t.dataset['tabTarget']!)));

// ─── Loader / per-card connection state ─────────────────────

// Map accountId → connection in progress
// Map controllerId → accountId to find the card from the event
const connectingAccounts = new Map<string, string>(); // controllerId → accountId

function setCardLoading(controllerId: string, loading: boolean): void {
  // Card is indexed by accountId (= controllerId in our impl)
  const accountId = controllerId;
  const card = document.querySelector<HTMLElement>(`.account-card[data-id="${accountId}"]`);
  if (!card) return;
  const btn = card.querySelector<HTMLButtonElement>('[data-action="connect-account"]');
  const statusEl = card.querySelector<HTMLElement>('.account-status');

  if (loading) {
    connectingAccounts.set(controllerId, accountId);
    card.classList.add('card--connecting');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="btn-spinner"></span>${i18n('tooltip_connecting_descriptionStatus') || 'Connecting…'}`;
    }
    if (statusEl) {
      statusEl.className = 'account-status connecting';
      statusEl.textContent = '◌ ' + (i18n('tooltip_connecting_descriptionStatus') || 'Connecting…');
    }
    clearCardError(accountId);
  } else {
    connectingAccounts.delete(controllerId);
    card.classList.remove('card--connecting');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = i18n('option_identifiant_connect_button') || 'Connect';
    }
    // Reset status from "connecting" to "disconnected" by default
    // (overwritten immediately by setCardConnected if called next)
    if (statusEl && statusEl.classList.contains('connecting')) {
      statusEl.className = 'account-status off';
      statusEl.textContent = '○ ' + (i18n('tooltip_disconnected_descriptionStatus') || 'State: Disconnected');
    }
  }
}

function setCardError(accountId: string, errorKey: string): void {
  const card = document.querySelector<HTMLElement>(`.account-card[data-id="${accountId}"]`);
  if (!card) return;
  clearCardError(accountId);
  const errDiv = document.createElement('div');
  errDiv.className = 'error-msg error-msg--connect';
  errDiv.dataset['errorFor'] = accountId;
  const msg = i18n(errorKey);
  errDiv.innerHTML = `<svg class="icon icon--sm"><use href="skin/icons.svg#icon-info"/></svg> ${msg}`;
  card.querySelector('.account-actions-row')?.insertAdjacentElement('afterend', errDiv);
}

function clearCardError(accountId: string): void {
  document.querySelectorAll(`[data-error-for="${accountId}"]`).forEach((el) => el.remove());
}

function setCardConnected(accountId: string, connected: boolean): void {
  const card = document.querySelector<HTMLElement>(`.account-card[data-id="${accountId}"]`);
  if (!card) return;
  const statusEl = card.querySelector<HTMLElement>('.account-status');
  if (!statusEl) return;
  if (connected) {
    statusEl.className = 'account-status ok';
    statusEl.textContent = '● ' + (i18n('tooltip_connected_descriptionStatus') || 'State: Connected');
  } else {
    statusEl.className = 'account-status off';
    statusEl.textContent = '○ ' + (i18n('tooltip_disconnected_descriptionStatus') || 'State: Disconnected');
  }
}

/** Maps a ServiceEventType to the corresponding i18n error key */
function eventToErrorKey(event: ServiceEventType): string | null {
  switch (event) {
    case ServiceEventType.INVALID_LOGIN:
      return 'connector_error_req_logininvalid';
    case ServiceEventType.CONNECT_ERR:
      return 'connector_error_req_network';
    case ServiceEventType.REQUEST_FAILED:
      return 'connector_error_req_server';
    case ServiceEventType.TWOFA_AUTHENTICATION_REQUIRED:
      return 'option_identifiant_2fatoken_label';
    default:
      return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function el<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function onCheck(id: string, key: keyof AppPrefs, onChange?: (v: boolean) => void): void {
  const input = el<HTMLInputElement>(id);
  if (!input) return;
  input.addEventListener('change', () => {
    updatePref(key, input.checked);
    onChange?.(input.checked);
  });
}

function onText(id: string, key: keyof AppPrefs): void {
  const input = el<HTMLInputElement>(id);
  if (!input) return;
  input.addEventListener('input', () => updatePref(key, input.value));
}

function onNumber(id: string, key: keyof AppPrefs): void {
  const input = el<HTMLInputElement>(id);
  if (!input) return;
  input.addEventListener('input', () => updatePref(key, Number(input.value)));
}

function onColor(id: string, key: keyof AppPrefs): void {
  const input = el<HTMLInputElement>(id);
  if (!input) return;
  input.addEventListener('input', () => updatePref(key, input.value));
}

function onVolume(sliderId: string, labelId: string, key: keyof AppPrefs): void {
  const slider = el<HTMLInputElement>(sliderId);
  const label  = el<HTMLElement>(labelId);
  if (!slider) return;
  slider.addEventListener('input', () => {
    if (label) label.textContent = `${slider.value}%`;
    updatePref(key, Number(slider.value));
  });
}

function onSoundRadio(name: string, key: keyof AppPrefs): void {
  document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        updatePref(key, radio.value as SoundType);
        const prefix = name === 'emailSound' ? 'opt-email' : 'opt-cal';
        toggleCustomFile(prefix, radio.value === 'custom');
      }
    });
  });
}

function toggleCustomFile(prefix: string, show: boolean): void {
  const row = el(`${prefix}-sound-file-row`);
  if (row) row.classList.toggle('disabled', !show);
}

function toggleSoundOptions(prefix: string, enabled: boolean): void {
  // Show/hide the sound group body
  const groupId = prefix === 'opt-email' ? 'group-email-sound' : 'group-cal-sound';
  const groupBody = document.querySelector<HTMLElement>(`#${groupId} .group-body`);
  if (groupBody) {
    groupBody.classList.toggle('group-body--disabled', !enabled);
    groupBody.classList.toggle('group-body--hidden', !enabled);
  }
  // Also show/hide the custom file row
  if (enabled) toggleCustomFile(prefix, 
    (document.querySelector<HTMLInputElement>(`input[name="${prefix === 'opt-email' ? 'emailSound' : 'calSound'}"]:checked`)?.value === 'custom')
  );
}

function toggleNotifOptions(groupId: string, enabled: boolean): void {
  const groupBody = document.querySelector<HTMLElement>(`#${groupId} .group-body`);
  if (groupBody) {
    groupBody.classList.toggle('group-body--disabled', !enabled);
    groupBody.classList.toggle('group-body--hidden', !enabled);
  }
}

// ─── Populate the form ────────────────────────────────────

async function loadPrefs(): Promise<void> {
  const prefs = (await sendToBackground('getPrefs') as AppPrefs | null) ?? ({} as AppPrefs);
  populateForm(prefs);
  // For accounts: merge AccountConfig (data) + ControllerInfo (connection state)
  const controllers = (await sendToBackground('getControllers') as import('../types').ControllerInfo[]) ?? [];
  const accounts    = prefs.accounts ?? [];
  renderAccounts(accounts, controllers);
}

function populateForm(p: AppPrefs): void {
  // General
  setCheck('opt-auto-connect', p.autoConnect);
  setCheck('opt-set-cookies', p.browserSetCookies);
  setColor('opt-popup-color', p.popupColor);
  setNum('opt-popup-width', p.popupWidth);

  // Messages — display
  setCheck('opt-msg-enabled', p.messageEnabled);
  setNum('opt-msg-nb', p.messageNbDisplayed);
  setNum('opt-msg-chars', p.messageNbCharsDisplayed);
  setVal('opt-msg-filter', p.messageFilterRegex ?? '');
  // Messages — notifications
  setCheck('opt-email-notif', p.emailNotificationEnabled);
  setNum('opt-email-duration', p.emailNotificationDuration);
  // Messages — sound
  setCheck('opt-email-sound', p.emailSoundEnabled);
  setRadio('emailSound', p.emailSoundSelected ?? SoundType.DING);
  setVolume('opt-email-volume', 'opt-email-volume-val', p.emailSoundVolume ?? 80);
  setVal('opt-email-sound-file', p.emailSoundFile ?? '');
  toggleCustomFile('opt-email', p.emailSoundSelected === SoundType.CUSTOM);
  toggleSoundOptions('opt-email', p.emailSoundEnabled);
  toggleNotifOptions('group-email-notif', p.emailNotificationEnabled);

  // Calendar — display
  setCheck('opt-cal-enabled', p.calendarEnabled);
  setNum('opt-cal-period', p.calendarPeriodDisplayed);
  setNum('opt-cal-nb', p.calendarNbDisplayed);
  // Calendar — notifications
  setCheck('opt-cal-notif', p.calendarNotificationEnabled);
  // Reminder combobox
  const reminderConf = p.calendarReminderTimeConf ?? [5];
  const reminderSel = el<HTMLSelectElement>('opt-cal-reminder-select');
  if (reminderSel) reminderSel.value = String(reminderConf[0] ?? 5);
  // Repeat chips
  const repeatVal = String(p.calendarReminderNbRepeat ?? 2);
  const repeatRadio = document.querySelector<HTMLInputElement>(`input[name="calRepeat"][value="${repeatVal}"]`);
  if (repeatRadio) repeatRadio.checked = true;
  // Restore dataUrl in memory from prefs (after page reload)
  if (p.emailSoundFile?.startsWith('data:') && !customSoundData['email'].dataUrl) {
    customSoundData['email'].dataUrl = p.emailSoundFile;
    customSoundData['email'].name = i18n('custom') || 'Personnalisé';
  }
  if (p.calendarSoundFile?.startsWith('data:') && !customSoundData['cal'].dataUrl) {
    customSoundData['cal'].dataUrl = p.calendarSoundFile;
    customSoundData['cal'].name = i18n('custom') || 'Personnalisé';
  }
  // Custom sound file names
  setUploadFilename('email', customSoundData['email'].name || (p.emailSoundFile ? '(fichier sauvegardé)' : ''));
  setUploadFilename('cal', customSoundData['cal'].name || (p.calendarSoundFile ? '(fichier sauvegardé)' : ''));
  // Calendar — sound
  setCheck('opt-cal-sound', p.calendarSoundEnabled);
  setRadio('calSound', p.calendarSoundSelected ?? SoundType.DING);
  setVolume('opt-cal-volume', 'opt-cal-volume-val', p.calendarSoundVolume ?? 80);
  setVal('opt-cal-sound-file', p.calendarSoundFile ?? '');
  toggleCustomFile('opt-cal', p.calendarSoundSelected === SoundType.CUSTOM);
  toggleSoundOptions('opt-cal', p.calendarSoundEnabled);
  toggleNotifOptions('group-cal-notif', p.calendarNotificationEnabled);

  // Tasks
  setCheck('opt-task-enabled', p.taskEnabled);
  setNum('opt-task-nb', p.taskNbDisplayed);
  const prios = p.taskPriorities ?? [];
  (el<HTMLInputElement>('opt-task-prio-high'))!.checked   = prios.includes(TaskPriority.HIGH);
  (el<HTMLInputElement>('opt-task-prio-normal'))!.checked = prios.includes(TaskPriority.NORMAL);
  (el<HTMLInputElement>('opt-task-prio-low'))!.checked    = prios.includes(TaskPriority.LOW);

  // Drafts
  setCheck('opt-draft-enabled', p.draftEnabled);
  setNum('opt-draft-nb', p.draftNbDisplayed);
}

function setCheck(id: string, v: boolean)  { const e = el<HTMLInputElement>(id); if (e) e.checked = !!v; }
function setNum(id: string, v: number)     { const e = el<HTMLInputElement>(id); if (e) e.value = String(v ?? ''); }
function setVal(id: string, v: string)     { const e = el<HTMLInputElement>(id); if (e) e.value = v; }
function setColor(id: string, v: string)   { const e = el<HTMLInputElement>(id); if (e) e.value = v ?? '#ffffff'; }
function setRadio(name: string, v: string) {
  const r = document.querySelector<HTMLInputElement>(`input[name="${name}"][value="${v}"]`);
  if (r) r.checked = true;
}
function setVolume(sliderId: string, labelId: string, v: number) {
  const s = el<HTMLInputElement>(sliderId); if (s) s.value = String(v);
  const l = el<HTMLElement>(labelId);      if (l) l.textContent = `${v}%`;
}

// ─── Bind controls ────────────────────────────────────

function bindControls(): void {
  // General
  onCheck('opt-auto-connect', 'autoConnect');
  onCheck('opt-set-cookies', 'browserSetCookies');
  onColor('opt-popup-color', 'popupColor');
  onNumber('opt-popup-width', 'popupWidth');

  // Messages — display
  onCheck('opt-msg-enabled', 'messageEnabled');
  onNumber('opt-msg-nb', 'messageNbDisplayed');
  onNumber('opt-msg-chars', 'messageNbCharsDisplayed');
  onText('opt-msg-filter', 'messageFilterRegex');
  // Messages — notifications
  onCheck('opt-email-notif', 'emailNotificationEnabled', (v) => toggleNotifOptions('group-email-notif', v));
  onNumber('opt-email-duration', 'emailNotificationDuration');
  // Messages — sound
  onCheck('opt-email-sound', 'emailSoundEnabled', (v) => toggleSoundOptions('opt-email', v));
  onSoundRadio('emailSound', 'emailSoundSelected');
  onVolume('opt-email-volume', 'opt-email-volume-val', 'emailSoundVolume');
  bindSoundUpload('email', 'emailSoundFile');

  // Calendar — display
  onCheck('opt-cal-enabled', 'calendarEnabled');
  onNumber('opt-cal-period', 'calendarPeriodDisplayed');
  onNumber('opt-cal-nb', 'calendarNbDisplayed');
  // Calendar — notifications + reminders
  onCheck('opt-cal-notif', 'calendarNotificationEnabled', (v) => toggleNotifOptions('group-cal-notif', v));
  // Reminder select
  el<HTMLSelectElement>('opt-cal-reminder-select')?.addEventListener('change', (e) => {
    const val = Number((e.target as HTMLSelectElement).value);
    updatePref('calendarReminderTimeConf', [val]);
  });
  // Repeat chips
  document.querySelectorAll<HTMLInputElement>('input[name="calRepeat"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.checked) updatePref('calendarReminderNbRepeat', Number(radio.value));
    });
  });
  // Calendar — sound
  onCheck('opt-cal-sound', 'calendarSoundEnabled', (v) => toggleSoundOptions('opt-cal', v));
  onSoundRadio('calSound', 'calendarSoundSelected');
  onVolume('opt-cal-volume', 'opt-cal-volume-val', 'calendarSoundVolume');
  bindSoundUpload('cal', 'calendarSoundFile');

  // Tasks
  onCheck('opt-task-enabled', 'taskEnabled');
  onNumber('opt-task-nb', 'taskNbDisplayed');
  ['opt-task-prio-high', 'opt-task-prio-normal', 'opt-task-prio-low'].forEach((id) => {
    el<HTMLInputElement>(id)?.addEventListener('change', savePriorities);
  });

  // Drafts
  onCheck('opt-draft-enabled', 'draftEnabled');
  onNumber('opt-draft-nb', 'draftNbDisplayed');

  // Test sound buttons — play directly in the options page
  document.querySelectorAll<HTMLElement>('.btn-test-sound').forEach((btn) => {
    btn.addEventListener('click', () => {
      const g        = btn.dataset['soundGroup']!;
      _lastTestGroup = g;
      const name     = g === 'email' ? 'emailSound' : 'calSound';
      const radio    = document.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`);
      const vol      = el<HTMLInputElement>(`opt-${g}-volume`);
      const selected : SoundType = radio?.value as SoundType ?? SoundType.DING;
      const dataUrl  = selected === SoundType.CUSTOM ? (customSoundData[g]?.dataUrl ?? '') : '';
      playTestSound(selected, dataUrl, Number(vol?.value ?? 80));
    });
  });
}

function savePriorities(): void {
  const priorities: TaskPriority[] = [];
  if (el<HTMLInputElement>('opt-task-prio-high')?.checked)   priorities.push(TaskPriority.HIGH);
  if (el<HTMLInputElement>('opt-task-prio-normal')?.checked)  priorities.push(TaskPriority.NORMAL);
  if (el<HTMLInputElement>('opt-task-prio-low')?.checked)     priorities.push(TaskPriority.LOW);
  updatePref('taskPriorities', priorities);
}

// ─── Custom sound upload ───────────────────────────────────────

const MAX_SOUND_SIZE = 300 * 1024; // 300 KB

function setUploadFilename(group: string, name: string): void {
  const nameEl = document.getElementById(`opt-${group}-sound-filename`);
  if (nameEl) nameEl.textContent = name || '—';
}

function showUploadError(group: string, msg: string): void {
  const errEl = document.getElementById(`opt-${group}-sound-error`);
  if (errEl) { errEl.textContent = msg; errEl.style.display = msg ? 'block' : 'none'; }
}

function bindSoundUpload(group: string, key: keyof AppPrefs): void {
  const input   = document.getElementById(`opt-${group}-sound-upload`) as HTMLInputElement | null;
  const clearBtn = document.getElementById(`opt-${group}-sound-clear`);

  input?.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    showUploadError(group, '');

    // MIME type validation
    if (!file.type.startsWith('audio/')) {
      showUploadError(group, i18n('file_sound_error_type') + file.type);
      input.value = '';
      return;
    }
    // Size validation
    if (file.size > MAX_SOUND_SIZE) {
      const kb = Math.round(file.size / 1024);
      showUploadError(group, i18n('file_sound_error_size') + `${kb} Ko`);
      input.value = '';
      return;
    }

    // Read as base64 data URL for storage and audio playback
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      customSoundData[group] = { dataUrl, name: file.name };
      setUploadFilename(group, file.name);
      updatePref(key, dataUrl);
    };
    reader.readAsDataURL(file);
  });

  clearBtn?.addEventListener('click', () => {
    if (input) input.value = '';
    customSoundData[group] = { dataUrl: '', name: '' };
    setUploadFilename(group, '');
    showUploadError(group, '');
    updatePref(key, '');
  });
}

// ─── Test sound playback directly in the page ───────────────

let _testAudio: HTMLAudioElement | null = null;

function playTestSound(selected: SoundType, customDataUrl: string, volume: number): void {
  if (_testAudio) { _testAudio.pause(); _testAudio = null; }

  let src: string;
  switch (selected) {
    case SoundType.DRAIN:  
      src = chrome.runtime.getURL(SoundPath.DRAIN);
      break;
    case SoundType.HEAL:
      src = chrome.runtime.getURL(SoundPath.HEAL);
      break;
    case SoundType.PING:
      src = chrome.runtime.getURL(SoundPath.PING);
      break;
    case SoundType.CUSTOM:
      if (!customDataUrl) {
        // Try to read from customSoundData (if called before populateForm)
        const fallback = customSoundData[_lastTestGroup ?? 'email']?.dataUrl ?? '';
        if (!fallback) {
          showUploadError(
            _lastTestGroup ?? 'email',
            i18n('custom') + ' : ' + (i18n('uploadFile') || 'aucun fichier chargé')
          );
          return;
        }
        src = fallback;
        break;
      }
      src = customDataUrl;
      break;
    case SoundType.DING:
    default:
      src = chrome.runtime.getURL(SoundPath.DING);
  }

  _testAudio = new Audio(src);
  _testAudio.volume = Math.max(0, Math.min(1, volume / 100));
  _testAudio.play().catch((err) => {
    console.error('[Options] test sound failed', err);
  });
}

let _lastTestGroup = 'email';

async function updatePref(key: keyof AppPrefs, value: unknown): Promise<void> {
  await sendToBackground('updatePref', key, value);
}

// ─── Account rendering ────────────────────────────────────────

function renderAccounts(accounts: import('../types').AccountConfig[], controllers: import('../types').ControllerInfo[]): void {
  const container = document.getElementById('accounts-list')!;
  container.innerHTML = '';

  if (accounts.length === 0) {
    container.innerHTML = `<div class="empty-accounts">${i18n('tooltip_configuration_description') || 'Please configure your account(s).'}</div>`;
    return;
  }

  for (const account of accounts) {
    const ctrl = controllers.find((c) => c.accountId === account.id);
    const isConnected  = ctrl?.isConnected  ?? false;
    const isConnecting = ctrl?.isConnecting ?? false;
    const errorMsg     = ctrl?.lastErrorMessage ?? null;

    const card = document.createElement('div');
    card.className = 'account-card';
    card.dataset['id']        = account.id;
    card.dataset['accountId'] = account.id;

    const statusClass = isConnected ? 'ok' : isConnecting ? 'connecting' : 'off';
    const statusLabel = isConnected
      ? '● ' + i18n('tooltip_connected_descriptionStatus')
      : isConnecting
        ? '◌ ' + i18n('tooltip_connecting_descriptionStatus')
        : '○ ' + i18n('tooltip_disconnected_descriptionStatus');

    card.innerHTML = `
      <div class="account-card-header">
        <span class="account-badge">${(account.alias || account.login || account.id).substring(0, 30)}</span>
        <span class="account-status ${statusClass}">${statusLabel}</span>
        <button class="btn-remove" data-action="remove-account" data-id="${account.id}" title="${i18n('option_identifiant_remove_button')}">✕</button>
      </div>
      <div class="account-fields">

        <label class="field-label">${i18n('option_identifiant_alias_label') || 'Alias'}
          <input type="text" class="account-input" data-field="alias" data-account-id="${account.id}"
                 value="${escAttr(account.alias ?? '')}" placeholder="Mon compte Zimbra" />
        </label>

        <div class="field-group-row">
          <label class="field-label">${i18n('option_identifiant_login_label') || 'Login'}
            <input type="text" class="account-input" data-field="login" data-account-id="${account.id}"
                   value="${escAttr(account.login ?? '')}" placeholder="user@domain.com" autocomplete="username" />
          </label>
          <label class="field-label">${i18n('option_identifiant_password_label') || 'Password'}
            <input type="password" class="account-input" data-field="password" data-account-id="${account.id}"
                   value="" placeholder="••••••••" autocomplete="current-password" />
            <label class="save-password-row">
              <input type="checkbox" class="account-input" data-field="savePassword" data-account-id="${account.id}"
                     ${account.savePassword ? 'checked' : ''} />
              <span>${i18n('option_identifiant_savePassword_label') || 'Remember password'}</span>
            </label>
          </label>
        </div>

        <label class="field-label">${i18n('option_identifiant_urlwebservice_label') || 'Web service URL'}
          <input type="url" class="account-input" data-field="urlWebService" data-account-id="${account.id}"
                 value="${escAttr(account.urlWebService ?? '')}" placeholder="https://zimbra.example.com" pattern="^(http|https)://.*" />
        </label>

        <label class="field-label">${i18n('option_identifiant_urlwebinterface_label') || 'Web interface URL'}
          <input type="url" class="account-input" data-field="urlWebInterface" data-account-id="${account.id}"
                 value="${escAttr(account.urlWebInterface ?? '')}" placeholder="https://zimbra.example.com" pattern="^(http|https)://.*" />
        </label>


        <div class="account-actions-row">
          ${!isConnected && !isConnecting ? `
          <button class="btn-primary" data-action="connect-account" data-id="${account.id}">
            ${i18n('option_identifiant_connect_button') || 'Connect'}
          </button>` : ''}
          ${isConnected && !isConnecting ? `
          <button class="btn-secondary" data-action="disconnect-account" data-id="${account.id}">
            ${i18n('option_identifiant_disconnect_button') || 'Disconnect'}
          </button>` : ''}
          ${isConnecting ? `
            <button class="btn-secondary" data-action="disconnect-account" data-id="${account.id}" disabled>
              <span class="btn-spinner"></span>${i18n('tooltip_connecting_descriptionStatus') || 'Connecting…'}</span>
            </button>` : ''}
        </div>

        ${errorMsg && errorMsg.status !== RequestStatus.TWOFA_AUTHENTICATION_REQUIRED ? `<div class="error-msg">${formatLastErrorMessage(errorMsg)}</div>` : ''}
        </div>
    `;
    container.appendChild(card);

    if (errorMsg && errorMsg.status === RequestStatus.TWOFA_AUTHENTICATION_REQUIRED) {
      showTwoFaPrompt(account.id);
    }
  }

  // Single listener on the container — save field by field
  container.querySelectorAll<HTMLInputElement>('.account-input').forEach((input) => {
    const event = input.type === 'checkbox' ? 'change' : 'change';
    input.addEventListener(event, () => saveAccountField(input));
  });
}

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

async function saveAccountField(input: HTMLInputElement): Promise<void> {
  const accountId = input.dataset['accountId'];
  const field     = input.dataset['field'];
  if (!accountId || !field) return;

  // Password: separate encryption
  if (field === 'password') {
    if (input.value) await sendToBackground('savePassword', accountId, input.value);
    return;
  }

  const value: string | boolean = input.type === 'checkbox' ? input.checked : input.value;
  await sendToBackground('updateAccount', accountId, { [field]: value });

  // If "remember password" was just checked, persist the current password too
  const card = input.closest('.account-card');
  const pwInput = card?.querySelector<HTMLInputElement>('[data-field="password"]');
  if (field === 'savePassword') {
    if (input.checked) {
      if (pwInput?.value) {
        await sendToBackground('savePassword', accountId, pwInput.value);
      }
    } else {
      await sendToBackground('savePassword', accountId, undefined);
    }
  }
}

// ─── Account action delegation ──────────────────────────

document.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  const btn = target.closest('[data-action]') as HTMLElement;
  if (!btn) return;

  const action = btn.dataset['action'];
  const id     = btn.dataset['id'] ?? '';

  switch (action) {
    case 'add-account':
      await sendToBackground('addNewAccount');
      await loadPrefs();
      break;
    case 'remove-account':
      if (confirm(i18n('option_identifiant_remove_button') || 'Remove')) {
        await sendToBackground('removeController', id);
        await loadPrefs();
      }
      break;
    case 'connect-account': {
      const card = document.querySelector(`.account-card[data-id="${id}"]`);
      const pw   = (card?.querySelector('[data-field="password"]') as HTMLInputElement)?.value ?? '';
      setCardLoading(id, true);
      clearCardError(id);
      await sendToBackground('initializeConnection', id, pw);
      // Result arrives via needRefresh — release loader after 30s max
      setTimeout(() => {
        if (connectingAccounts.has(id)) {
          setCardLoading(id, false);
          setCardError(id, 'connector_error_req_timeout');
          connectingAccounts.delete(id);
        }
      }, 30_000);
      break;
    }
    case 'disconnect-account':
      await sendToBackground('closeConnection', id);
      setTimeout(loadPrefs, 500);
      break;
  }
});

// ─── Push from service worker ───────────────────────────

chrome.runtime.onMessage.addListener(({ func, args }: { func: string; args: unknown[] }) => {
  if (func !== 'needRefresh') return;

  const event = args?.[0] as ServiceEventType | undefined;

  // Find the account currently connecting (first entry in the Map)
  const firstEntry    = connectingAccounts.entries().next().value;
  const controllerId  = firstEntry?.[0];
  const accountId     = firstEntry?.[1];

  if (event && controllerId && accountId) {
    const errKey = eventToErrorKey(event);

    switch (event) {
      case ServiceEventType.CONNECTED:
        setCardLoading(controllerId, false);
        setCardConnected(accountId, true);
        clearCardError(accountId);
        connectingAccounts.delete(controllerId);
        break;

      case ServiceEventType.INVALID_LOGIN:
      case ServiceEventType.CONNECT_ERR:
      case ServiceEventType.REQUEST_FAILED:
        setCardLoading(controllerId, false);
        setCardConnected(accountId, false);
        if (errKey) setCardError(accountId, errKey);
        connectingAccounts.delete(controllerId);
        break;

      case ServiceEventType.TWOFA_AUTHENTICATION_REQUIRED:
        setCardLoading(controllerId, false);
        if (errKey) setCardError(accountId, errKey);
        showTwoFaPrompt(accountId);
        connectingAccounts.delete(controllerId);
        break;

      default:
        // Other events (CHECKING_*, UNREAD_MSG_UPDATED…) → silent refresh
        break;
    }
  }

  // Light refresh without full card re-render (keeps focus/loader state)
  if (event === ServiceEventType.CONNECTED || event === ServiceEventType.STOPPED || event === ServiceEventType.DISCONNECTED) {
    loadPrefs();
  }
});

function showTwoFaPrompt(accountId: string): void {
  const card = document.querySelector<HTMLElement>(`.account-card[data-id="${accountId}"]`);
  if (!card || card.querySelector('.twofa-row')) return;

  const row = document.createElement('div');
  row.className = 'twofa-row';
  row.innerHTML = `
    <label class="field-label">${i18n('option_identifiant_2fatoken_label') || '2FA Token'}
      <div class="twofa-input-row">
        <input type="text" class="twofa-input" placeholder="000000" maxlength="8"
               autocomplete="one-time-code" inputmode="numeric" />
        <button class="btn-primary btn-twofa-send">
          ${i18n('option_identifiant_2fatoken_button') || 'Send'}
        </button>
      </div>
    </label>
  `;

  card.querySelector('.account-actions-row')?.insertAdjacentElement('afterend', row);

  row.querySelector('.btn-twofa-send')?.addEventListener('click', async () => {
    const token = (row.querySelector('.twofa-input') as HTMLInputElement)?.value ?? '';
    if (!token) return;
    setCardLoading(accountId, true);
    row.remove();
    connectingAccounts.set(accountId, accountId);
    await sendToBackground('sendTwoFactorToken', accountId, token);
    setTimeout(() => {
      if (connectingAccounts.has(accountId)) {
        setCardLoading(accountId, false);
        connectingAccounts.delete(accountId);
      }
    }, 30_000);
  });
}

// ─── Init ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  i18n.applyAll(document);
  activateTab('general');
  bindControls();
  loadPrefs();
});
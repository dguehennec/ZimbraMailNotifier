import { resetChromeMocks, mockSyncStorage, mockLocalStorage } from './setup';
import { AccountConfig, SoundType, TaskPriority } from '../src/types';

const makeAccount = (id: string): AccountConfig => ({
  id,
  alias: `alias-${id}`,
  login: `user-${id}@example.com`,
  passwordEncrypted: '',
  urlWebService: 'https://zimbra.example.com',
  urlWebInterface: 'https://zimbra.example.com/',
  savePassword: true,
});

describe('Prefs', () => {
  beforeEach(async () => {
    resetChromeMocks();
    jest.resetModules();
  });

  async function loadPrefs() {
    const { Prefs } = await import('../src/modules/service/Prefs');
    await Prefs.load();
    return Prefs;
  }

  it('loads defaults when storage is empty', async () => {
    const Prefs = await loadPrefs();
    expect(Prefs.isLoaded()).toBe(true);
    expect(Prefs.get().accounts).toEqual([]);
    expect(Prefs.get().emailNotificationEnabled).toBe(true);
  });

  it('persists preference updates via sync storage', async () => {
    const Prefs = await loadPrefs();
    await Prefs.update('popupWidth', 420);
    expect(mockSyncStorage.set).toHaveBeenCalled();
    expect(Prefs.get().popupWidth).toBe(420);

    jest.resetModules();
    const Prefs2 = await loadPrefs();
    expect(Prefs2.get().popupWidth).toBe(420);
  });

  it('adds and removes accounts', async () => {
    const Prefs = await loadPrefs();
    const account = makeAccount('acc-1');
    await Prefs.addAccount(account);
    expect(Prefs.getAccounts()).toHaveLength(1);

    await Prefs.removeAccount('acc-1');
    expect(Prefs.getAccounts()).toHaveLength(0);
  });

  it('encrypts and loads saved passwords', async () => {
    const Prefs = await loadPrefs();
    await Prefs.addAccount(makeAccount('acc-1'));
    await Prefs.savePassword('acc-1', 'secret-pass');

    const stored = Prefs.getAccounts()[0].passwordEncrypted;
    expect(stored).toBeTruthy();
    expect(stored).not.toBe('secret-pass');

    const loaded = await Prefs.loadPassword('acc-1');
    expect(loaded).toBe('secret-pass');
  });

  it('returns empty password when savePassword is disabled', async () => {
    const Prefs = await loadPrefs();
    const account = { ...makeAccount('acc-2'), savePassword: false };
    await Prefs.addAccount(account);
    await Prefs.savePassword('acc-2', 'ignored');
    expect(await Prefs.loadPassword('acc-2')).toBe('');
  });

  it('stores waitset and device trusted data in local storage only', async () => {
    const Prefs = await loadPrefs();
    const waitSet = {
      id: 'ws-1',
      seq: 3,
      urlWebService: 'https://zimbra.example.com',
      user: 'user@example.com',
    };
    await Prefs.saveWaitSet('acc-1', waitSet);
    expect(mockLocalStorage.set).toHaveBeenCalledWith({ 'zmn_waitset_acc-1': waitSet });
    expect(await Prefs.loadWaitSet('acc-1')).toEqual(waitSet);

    const device = { id: 'trusted-token', deviceId: 'device-abc' };
    await Prefs.saveDeviceTrusted('acc-1', device);
    expect(mockLocalStorage.set).toHaveBeenCalledWith({ 'zmn_device_acc-1': device });
    expect(await Prefs.loadDeviceTrusted('acc-1')).toEqual(device);
  });

  it('notifies change listeners on update', async () => {
    const Prefs = await loadPrefs();
    const listener = jest.fn();
    const unsubscribe = Prefs.onChange(listener);
    await Prefs.update('taskEnabled', false);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    await Prefs.update('taskEnabled', true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('updates previousVersion on first launch migration path', async () => {
    mockSyncStorage._data.zmn_prefs = {
      isFirstLaunch: true,
      currentVersion: 3,
      previousVersion: 0,
      emailSoundSelected: SoundType.DING,
      taskPriorities: [TaskPriority.HIGH],
    };
    const Prefs = await loadPrefs();
    expect(Prefs.get().previousVersion).toBe(3);
  });
});

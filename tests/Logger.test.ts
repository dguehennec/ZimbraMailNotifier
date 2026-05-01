// tests/Logger.test.ts
import { Logger } from '../src/modules/service/Logger';
import { LogLevel } from '../src/types';

describe('Logger', () => {
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let traceSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy  = jest.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy  = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    traceSpy = jest.spyOn(console, 'trace').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Logger.configure(LogLevel.INFO);
  });

  it('emits INFO messages at INFO level', () => {
    Logger.configure(LogLevel.INFO);
    const log = new Logger('TestModule');
    log.info('hello');
    expect(infoSpy).toHaveBeenCalledTimes(1);
    const arg = JSON.parse(infoSpy.mock.calls[0][1]);
    expect(arg.level).toBe('INFO');
    expect(arg.msg).toBe('hello');
    expect(arg.module).toBe('TestModule');
  });

  it('does NOT emit TRACE at INFO level', () => {
    Logger.configure(LogLevel.INFO);
    const log = new Logger('TestModule');
    log.trace('should not appear');
    expect(traceSpy).not.toHaveBeenCalled();
  });

  it('emits TRACE messages at TRACE level', () => {
    Logger.configure(LogLevel.TRACE);
    const log = new Logger('TestModule');
    log.trace('trace message');
    expect(traceSpy).toHaveBeenCalledTimes(1);
    const arg = JSON.parse(traceSpy.mock.calls[0][1]);
    expect(arg.level).toBe('TRACE');
  });

  it('emits WARN at WARNING level', () => {
    Logger.configure(LogLevel.WARNING);
    const log = new Logger('TestModule');
    log.warn('warning');
    log.info('should not appear');
    log.trace('should not appear');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('includes data field when provided', () => {
    Logger.configure(LogLevel.INFO);
    const log = new Logger('TestModule');
    log.info('msg', { key: 'value' });
    const arg = JSON.parse(infoSpy.mock.calls[0][1]);
    expect(arg.data).toEqual({ key: 'value' });
  });

  it('does not include data field when not provided', () => {
    Logger.configure(LogLevel.INFO);
    const log = new Logger('TestModule');
    log.info('msg');
    const arg = JSON.parse(infoSpy.mock.calls[0][1]);
    expect(arg.data).toBeUndefined();
  });

  it('traceRequest does not log body when printData=false', () => {
    Logger.configure(LogLevel.TRACE, false, false);
    const log = new Logger('TestModule');
    log.traceRequest('request', { secret: 'password' });
    if (traceSpy.mock.calls.length > 0) {
      const arg = JSON.parse(traceSpy.mock.calls[0][1]);
      expect(arg.data).toBeUndefined();
    }
  });

  it('includes stack on ERROR when printStack=true', () => {
    Logger.configure(LogLevel.ERROR, true);
    const log = new Logger('TestModule');
    log.error('error occurred');
    const arg = JSON.parse(errorSpy.mock.calls[0][1]);
    expect(arg.stack).toBeDefined();
  });

  it('ts field is valid ISO date', () => {
    Logger.configure(LogLevel.INFO);
    const log = new Logger('TestModule');
    log.info('ts test');
    const arg = JSON.parse(infoSpy.mock.calls[0][1]);
    expect(() => new Date(arg.ts)).not.toThrow();
    expect(new Date(arg.ts).toISOString()).toBe(arg.ts);
  });
});

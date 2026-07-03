import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createLogger } from '../logger';

describe('logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not write logs when DEV is false', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const logger = createLogger(false);

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('writes prefixed logs when DEV is true', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const logger = createLogger(true);

    logger.debug('d', 1);
    logger.info('i', 2);
    logger.warn('w', 3);
    logger.error('e', 4);

    expect(debugSpy).toHaveBeenCalledWith('[DEBUG]', 'd', 1);
    expect(infoSpy).toHaveBeenCalledWith('[INFO]', 'i', 2);
    expect(warnSpy).toHaveBeenCalledWith('[WARN]', 'w', 3);
    expect(errorSpy).toHaveBeenCalledWith('[ERROR]', 'e', 4);
  });
});

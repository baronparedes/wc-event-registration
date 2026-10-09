import { describe, expect, it, vi } from 'vitest';

import { ensureResourcesReady } from '../resources';

describe('ensureResourcesReady', () => {
  it('resolves when all images are already loaded', async () => {
    const div = document.createElement('div');
    const img = document.createElement('img');
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: 100 });
    div.appendChild(img);

    await expect(ensureResourcesReady(div)).resolves.toBeUndefined();
  });

  it('waits for an incomplete image to load', async () => {
    const div = document.createElement('div');
    const img = document.createElement('img');
    Object.defineProperty(img, 'complete', { value: false });
    Object.defineProperty(img, 'naturalWidth', { value: 0 });
    div.appendChild(img);

    const promise = ensureResourcesReady(div);
    img.dispatchEvent(new Event('load'));
    await expect(promise).resolves.toBeUndefined();
  });

  it('does not overwrite existing onload handlers', async () => {
    const div = document.createElement('div');
    const img = document.createElement('img');
    const existingHandler = vi.fn();
    img.onload = existingHandler;
    Object.defineProperty(img, 'complete', { value: false });
    Object.defineProperty(img, 'naturalWidth', { value: 0 });
    div.appendChild(img);

    const promise = ensureResourcesReady(div);
    img.dispatchEvent(new Event('load'));
    await promise;

    expect(existingHandler).toHaveBeenCalledTimes(1);
  });

  it('resolves on image error instead of blocking forever', async () => {
    const div = document.createElement('div');
    const img = document.createElement('img');
    Object.defineProperty(img, 'complete', { value: false });
    Object.defineProperty(img, 'naturalWidth', { value: 0 });
    div.appendChild(img);

    const promise = ensureResourcesReady(div);
    img.dispatchEvent(new Event('error'));
    await expect(promise).resolves.toBeUndefined();
  });
});

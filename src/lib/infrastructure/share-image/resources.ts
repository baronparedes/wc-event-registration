const IMAGE_READY_TIMEOUT_MS = 2500;
const RENDER_FLUSH_DELAY_MS = 200;

function waitForImage(img: HTMLImageElement): Promise<void> {
  if (img.complete && img.naturalWidth > 0) {
    if ('decode' in img && typeof img.decode === 'function') {
      return img.decode().catch(() => {});
    }
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let isResolved = false;
    const finish = () => {
      if (isResolved) return;
      isResolved = true;
      img.removeEventListener('load', finish);
      img.removeEventListener('error', finish);
      if ('decode' in img && typeof img.decode === 'function') {
        img.decode().then(resolve).catch(resolve);
      } else {
        resolve();
      }
    };

    // Listeners (not onload/onerror) so existing handlers are never overwritten.
    img.addEventListener('load', finish);
    img.addEventListener('error', finish); // resolve on error so we never block forever

    if ('decode' in img && typeof img.decode === 'function') {
      img
        .decode()
        .then(finish)
        .catch(() => {});
    }

    // Safety timeout in case no events fire
    setTimeout(finish, IMAGE_READY_TIMEOUT_MS);
  });
}

/** Waits for fonts and images inside `element` so a capture does not run on half-loaded content. */
export async function ensureResourcesReady(element: HTMLElement): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font readiness errors
    }
  }

  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(images.map(waitForImage));

  // Small delay so the browser has flushed rendering
  await new Promise((resolve) => setTimeout(resolve, RENDER_FLUSH_DELAY_MS));
}

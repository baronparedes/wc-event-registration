export function canCopyImageToClipboard(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard?.write === 'function' &&
    typeof ClipboardItem !== 'undefined'
  );
}

export async function copyPngToClipboard(blobOrPromise: Blob | Promise<Blob>): Promise<void> {
  let item: ClipboardItem;
  try {
    item = new ClipboardItem({ 'image/png': blobOrPromise });
  } catch {
    // Fallback for older browsers that do not support Promise inside ClipboardItem
    const resolvedBlob = await blobOrPromise;
    item = new ClipboardItem({ 'image/png': resolvedBlob });
  }

  // Initiate write immediately with the ClipboardItem (preserves iOS Safari user gesture)
  const writePromise = navigator.clipboard.write([item]);

  // Await write and blob resolution so errors are captured and handled cleanly
  if (blobOrPromise instanceof Promise) {
    await Promise.all([writePromise, blobOrPromise]);
  } else {
    await writePromise;
  }
}

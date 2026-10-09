import { isIOSDevice } from './device';

export type ShareFilesOptions = {
  files: File[];
  title?: string;
  text?: string;
};

/**
 * - `shared`: handed to the native share sheet (or user dismissed it)
 * - `unsupported`: device cannot share these files; caller should fall back to download
 */
export type ShareFilesResult = 'shared' | 'unsupported';

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function buildPayload(files: File[], title?: string, text?: string): ShareData {
  return {
    files,
    ...(title ? { title } : {}),
    ...(text ? { text } : {}),
  };
}

/**
 * Tries the Web Share API with all files, then (iOS only) one file at a time.
 * A user cancelling (`AbortError`) counts as handled so no fallback download is triggered.
 */
export async function shareFiles({
  files,
  title,
  text,
}: ShareFilesOptions): Promise<ShareFilesResult> {
  if (typeof navigator === 'undefined' || !navigator.canShare || files.length === 0) {
    return 'unsupported';
  }

  if (navigator.canShare({ files })) {
    try {
      await navigator.share(buildPayload(files, title, text));
      return 'shared';
    } catch (error) {
      if (isAbortError(error)) return 'shared';
    }
  }

  if (files.length > 1 && isIOSDevice()) {
    let sharedAny = false;
    for (const file of files) {
      if (!navigator.canShare({ files: [file] })) continue;
      try {
        await navigator.share(buildPayload([file], title, text));
        sharedAny = true;
      } catch (error) {
        if (isAbortError(error)) return 'shared';
      }
    }
    if (sharedAny) return 'shared';
  }

  return 'unsupported';
}

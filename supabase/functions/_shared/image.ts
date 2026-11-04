export const AVATAR_BUCKET = 'member_avatars';
export const MAX_IMAGE_BYTES = 1_048_576; // 1 MB
export const MAX_BASE64_LENGTH = 1_500_000;

export function decodeJpegDataUrl(dataUrl: string): Uint8Array | null {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) return null;

  try {
    const binary = atob(match[1]);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const isJpeg =
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[bytes.length - 2] === 0xff &&
      bytes[bytes.length - 1] === 0xd9;
    return isJpeg ? bytes : null;
  } catch {
    return null;
  }
}

export function isIOSDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor || '';
  const isIos = /iPad|iPhone|iPod/.test(userAgent);
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  return isIos || isIpadOs;
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isSafariOrIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return isIOSDevice() || (/Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Android/i.test(ua));
}

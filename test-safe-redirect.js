const ROUTE_PATHS = { adminEvents: '/admin/events', login: '/login' };

function getSafeRedirectTarget(search) {
  const params = new URLSearchParams(search);
  const redirectTarget = params.get('redirect');

  if (!redirectTarget || !redirectTarget.startsWith('/') || redirectTarget.startsWith('//')) {
    return ROUTE_PATHS.adminEvents;
  }

  if (redirectTarget.startsWith(ROUTE_PATHS.login)) {
    return ROUTE_PATHS.adminEvents;
  }

  return redirectTarget;
}

console.log(getSafeRedirectTarget("?redirect=//example.com"));
console.log(getSafeRedirectTarget("?redirect=/\\example.com"));
console.log(getSafeRedirectTarget("?redirect=\\\\example.com"));

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Welcome Hub Notification';
    const options = {
      body: data.body || data.message || '',
      icon: data.icon || '/android-chrome-192x192.png',
      badge: data.badge || '/favicon-32x32.png',
      data: {
        url: data.url || '/',
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error('Error handling push event:', error);
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Welcome Hub Notification', {
        body: text,
        icon: '/android-chrome-192x192.png',
        data: { url: '/' },
      }),
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || '/';
  const targetUrlObj = new URL(rawUrl, self.location.origin);
  targetUrlObj.searchParams.set('openDrawer', 'notifications');
  const targetUrl = targetUrlObj.pathname + targetUrlObj.search + targetUrlObj.hash;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }),
  );
});

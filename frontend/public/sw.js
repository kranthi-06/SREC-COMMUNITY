self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('push', function (event) {
    if (event.data) {
        try {
            const data = event.data.json();
            const options = {
                body: data.message,
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                vibrate: [200, 100, 200, 100, 200],
                data: {
                    url: data.url || '/'
                }
            };
            event.waitUntil(
                self.registration.showNotification(data.title, options)
            );
        } catch (err) {
            console.error('Error processing push event data', err);
        }
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// Allow foreground client to manually trigger SW notifications
self.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, message, iconUrl } = event.data.payload;
        try {
            await self.registration.showNotification(title, {
                body: message,
                icon: iconUrl || '/icons/icon-192.png',
                badge: iconUrl || '/icons/icon-192.png',
                vibrate: [200, 100, 200, 100, 200],
                requireInteraction: true,
                renotify: true,
                tag: 'pulse-' + Date.now()
            });
        } catch (e) {
            console.error('SW message notification failed:', e);
        }
    }
});

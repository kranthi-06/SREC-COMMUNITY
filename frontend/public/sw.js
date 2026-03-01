/**
 * CampusPulse Service Worker — Production Grade
 * Handles: install, activate, push, notificationclick, message
 * Safe for: Android, Desktop Chrome/Firefox/Edge, iOS PWA
 */

const CACHE_NAME = 'campuspulse-v1';

// ─── INSTALL ───────────────────────────────────────────────
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// ─── ACTIVATE ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            clients.claim(),
            // Clean old caches
            caches.keys().then((names) => {
                return Promise.all(
                    names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
                );
            })
        ])
    );
});

// ─── PUSH EVENT (from VAPID Web Push) ──────────────────────
self.addEventListener('push', function (event) {
    let data = {
        title: 'CampusPulse',
        body: 'You have a new notification',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        url: '/',
        type: 'GENERAL',
        timestamp: Date.now()
    };

    // Safely parse payload — never throw
    if (event.data) {
        try {
            const payload = event.data.json();
            data.title = payload.title || data.title;
            data.body = payload.body || payload.message || data.body;
            data.icon = payload.icon || data.icon;
            data.badge = payload.badge || data.badge;
            data.url = payload.url || data.url;
            data.type = payload.type || data.type;
            data.timestamp = payload.timestamp || data.timestamp;
        } catch (err) {
            // Malformed JSON — use defaults silently
            try {
                data.body = event.data.text() || data.body;
            } catch (e) {
                // Completely unreadable payload — use defaults
            }
        }
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        vibrate: [200, 100, 200, 100, 200],
        tag: 'campuspulse-' + data.type + '-' + Math.floor(data.timestamp / 10000),
        renotify: true,
        requireInteraction: false,
        data: {
            url: data.url,
            type: data.type,
            timestamp: data.timestamp
        },
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// ─── NOTIFICATION CLICK ────────────────────────────────────
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // Focus existing tab if open
            for (const client of windowClients) {
                if (client.url && 'focus' in client) {
                    try {
                        client.navigate(targetUrl);
                    } catch (e) {
                        // navigate() may not be available in all contexts
                    }
                    return client.focus();
                }
            }
            // Open new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// ─── MESSAGE (foreground → SW notification relay) ──────────
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, message, iconUrl } = event.data.payload || {};
        const notifBody = body || message || 'New notification';

        event.waitUntil(
            self.registration.showNotification(title || 'CampusPulse', {
                body: notifBody,
                icon: iconUrl || '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                vibrate: [200, 100, 200],
                tag: 'campuspulse-fg-' + Date.now()
            })
        );
    }
});

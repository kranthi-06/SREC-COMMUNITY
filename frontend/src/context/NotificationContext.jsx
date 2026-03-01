import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

// ─── VAPID Key Converter ───────────────────────────────────
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const token = localStorage.getItem('token');
    const [socketInstance, setSocketInstance] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toasts, setToasts] = useState([]);
    const pushRegistered = useRef(false);

    const [permission, setPermission] = useState(
        'Notification' in window ? Notification.permission : 'denied'
    );

    // ─── Watch for native permission changes ───────────────
    useEffect(() => {
        if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'notifications' }).then((status) => {
                setPermission(status.state);
                status.onchange = () => setPermission(status.state);
            }).catch(() => { });
        }
    }, []);

    // ─── Fetch initial notifications ───────────────────────
    useEffect(() => {
        if (!user || !token) return;
        const fetchNotifications = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/notifications`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setNotifications(res.data);
                setUnreadCount(res.data.filter(n => !n.is_read).length);
            } catch (err) {
                console.error("Error fetching notification history", err);
            }
        };
        fetchNotifications();
    }, [user, token]);

    // ─── WebSocket (graceful on Vercel) ────────────────────
    useEffect(() => {
        if (!user || !token) {
            if (socketInstance) {
                socketInstance.disconnect();
                setSocketInstance(null);
            }
            return;
        }

        const backendUrl = import.meta.env.VITE_API_URL.replace('/api', '');
        const newSocket = io(backendUrl, {
            transports: ['polling', 'websocket'],
            reconnectionAttempts: 3,
            reconnectionDelay: 2000,
            timeout: 5000
        });

        newSocket.on('connect', () => {
            newSocket.emit('authenticate', user.id);
        });

        newSocket.on('new_notification', (data) => {
            setNotifications(prev => [data, ...prev]);
            setUnreadCount(prev => prev + 1);
            showToast(data.title, data.message);
        });

        newSocket.on('connect_error', () => {
            // Silent — VAPID handles offline delivery
        });

        setSocketInstance(newSocket);
        return () => newSocket.disconnect();
    }, [user, token]);

    // ─── Register Web Push Subscription ────────────────────
    const registerPushSubscription = useCallback(async () => {
        if (pushRegistered.current) return;

        try {
            if (!('serviceWorker' in navigator)) return;
            if (!('PushManager' in window)) return;

            const registration = await navigator.serviceWorker.ready;

            if (!registration.pushManager) {
                console.warn('[Push] PushManager unavailable (iOS requires Add to Home Screen)');
                return;
            }

            const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) {
                console.error('[Push] Missing VITE_VAPID_PUBLIC_KEY');
                return;
            }

            // Check for existing subscription
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
                });
            }

            // Send subscription to backend
            if (token && subscription) {
                await axios.post(
                    `${import.meta.env.VITE_API_URL}/notifications/subscribe`,
                    subscription.toJSON(),
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                pushRegistered.current = true;
                console.log('[Push] Subscription saved to backend ✓');
            }
        } catch (err) {
            console.error('[Push] Registration failed:', err);
        }
    }, [token]);

    // ─── Auto-subscribe if already granted ─────────────────
    useEffect(() => {
        if (user && token && permission === 'granted') {
            const timeout = setTimeout(() => {
                registerPushSubscription();
            }, 2000);
            return () => clearTimeout(timeout);
        }
    }, [user, token, permission, registerPushSubscription]);

    // ─── Request Permission (user interaction) ─────────────
    const requestPermission = async () => {
        if (!('Notification' in window)) {
            alert("This browser does not support notifications.");
            return;
        }
        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm === 'granted') {
                showToast("Success", "Native notifications enabled!");
                await registerPushSubscription();
            }
        } catch (e) {
            console.error("Permission request failed", e);
        }
    };

    // ─── Show System Notification ──────────────────────────
    const showSystemNotification = async (title, message) => {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;

        try {
            const iconUrl = new URL('/icons/icon-192.png', window.location.origin).href;

            // Try Service Worker notification first (works better on Android)
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'SHOW_NOTIFICATION',
                    payload: { title, body: message, iconUrl }
                });
                return;
            }

            // Fallback: SW Registration
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                if (registration) {
                    await registration.showNotification(title, {
                        body: message,
                        icon: iconUrl,
                        badge: iconUrl,
                        vibrate: [200, 100, 200]
                    });
                    return;
                }
            }

            // Final fallback: Direct Notification API
            new Notification(title, { body: message, icon: iconUrl });
        } catch (e) {
            // Silent fail — notifications are not critical
        }
    };

    // ─── Toast System ──────────────────────────────────────
    const showToast = (title, message) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, title, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);

        showSystemNotification(title, message);
    };

    // ─── Notification Actions ──────────────────────────────
    const markAsRead = async (notificationId) => {
        try {
            await axios.patch(`${import.meta.env.VITE_API_URL}/notifications/${notificationId}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Failed to mark notification as read", err);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/notifications/mark-all-read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Failed to mark all as read", err);
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            await axios.delete(`${import.meta.env.VITE_API_URL}/notifications/${notificationId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/notifications/unread-count`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadCount(parseInt(res.data.count, 10));
        } catch (err) {
            console.error("Failed to delete notification", err);
        }
    };

    // ─── RENDER ────────────────────────────────────────────
    return (
        <NotificationContext.Provider value={{
            notifications, unreadCount, markAsRead, markAllAsRead,
            deleteNotification, requestPermission, permission
        }}>
            {/* Permission Banner — MUST render BEFORE children so it appears at the top */}
            {user && permission === 'default' && (
                <div style={{
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: 'white', padding: '12px 20px',
                    textAlign: 'center', fontSize: '0.9rem', display: 'flex', justifyContent: 'center',
                    alignItems: 'center', gap: '12px', position: 'fixed', top: 0, left: 0,
                    right: 0, zIndex: 99999, boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)',
                    flexWrap: 'wrap', minHeight: '50px'
                }}>
                    <span style={{ fontSize: '0.85rem' }}>🔔 Enable notifications to get instant alerts</span>
                    <button onClick={requestPermission} style={{
                        background: 'white', color: '#2563eb', border: 'none',
                        padding: '6px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer',
                        fontSize: '0.8rem'
                    }}>
                        Enable
                    </button>
                    <button onClick={() => setPermission('dismissed')} style={{
                        background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.5)',
                        padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'
                    }}>
                        ✕
                    </button>
                </div>
            )}

            {children}

            {/* Global Toast Container */}
            <div style={{
                position: 'fixed', bottom: '20px', right: '20px',
                display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 9999
            }}>
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{
                                background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)',
                                color: 'white', border: '1px solid var(--glass-border)',
                                borderLeft: '4px solid var(--accent-green)', borderRadius: '10px',
                                padding: '16px', minWidth: '300px', display: 'flex', gap: '12px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                            }}
                        >
                            <AlertCircle color="var(--accent-green)" />
                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: '0 0 5px', fontSize: '0.95rem' }}>{t.title}</h4>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.message}</p>
                            </div>
                            <button
                                onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                            >
                                <X size={16} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </NotificationContext.Provider>
    );
};

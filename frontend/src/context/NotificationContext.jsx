import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, AlertCircle } from 'lucide-react';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const token = localStorage.getItem('token');
    const [socket, setSocket] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toasts, setToasts] = useState([]);

    // Fetch initial notification history
    useEffect(() => {
        if (!user || !token) return;

        const fetchNotifications = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/notifications`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setNotifications(res.data);
                const unread = res.data.filter(n => !n.is_read).length;
                setUnreadCount(unread);
            } catch (err) {
                console.error("Error fetching notification history", err);
            }
        };

        fetchNotifications();
    }, [user, token]);

    // WebSocket Initialization
    useEffect(() => {
        if (!user || !token) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        const backendUrl = import.meta.env.VITE_API_URL.replace('/api', '');
        const newSocket = io(backendUrl, {
            transports: ['websocket', 'polling'] // Compatibility
        });

        newSocket.on('connect', () => {
            newSocket.emit('authenticate', user.id);
            console.log("WebSocket connected for notifications");
        });

        newSocket.on('new_notification', (data) => {
            setNotifications(prev => [data, ...prev]);
            setUnreadCount(prev => prev + 1);
            showToast(data.title, data.message);
        });

        newSocket.on('disconnect', () => {
            console.log("WebSocket disconnected");
        });

        setSocket(newSocket);

        return () => newSocket.disconnect();
    }, [user, token]);

    const [permission, setPermission] = useState('Notification' in window ? Notification.permission : 'denied');
    const [isSecure, setIsSecure] = useState(window.isSecureContext);

    // Helper to convert VAPID keys
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Request Notification Permission (On click)
    const requestPermission = async () => {
        if (!('Notification' in window)) {
            alert("This browser does not support desktop notifications.");
            return;
        }
        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm === 'granted') {
                showToast("Success", "Native notifications enabled!");

                // Subscribe to Web Push
                if ('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.ready;
                    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

                    if (!vapidPublicKey) {
                        console.error('Missing VAPID public key!');
                        return;
                    }

                    const subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
                    });

                    // Send to backend
                    if (token) {
                        await axios.post(`${import.meta.env.VITE_API_URL}/notifications/subscribe`, subscription, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        console.log('Web Push subscription saved to DB');
                    }
                }
            }
        } catch (e) {
            console.error("Permission request failed", e);
        }
    };

    const showSystemNotification = async (title, message) => {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            try {
                const iconUrl = new URL('/icons/icon-192.png', window.location.origin).href;

                // 1. Try passing it to the active Service Worker via postMessage
                // This forces Android PWA to register it as a proper background notification
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'SHOW_NOTIFICATION',
                        payload: { title, message, iconUrl }
                    });
                    return; // Avoid duplicate showing
                }

                // 2. Try the Service Worker Registration directly
                if ('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.ready;
                    if (registration) {
                        try {
                            await registration.showNotification(title, {
                                body: message,
                                icon: iconUrl,
                                badge: iconUrl,
                                vibrate: [200, 100, 200, 100, 200],
                                requireInteraction: true,
                                renotify: true,
                                tag: 'pulse-' + Date.now()
                            });
                            return;
                        } catch (e) {
                            console.warn("Direct SW notification failed:", e);
                        }
                    }
                }

                // 3. Absolute fallback (Desktop Safari, Firefox, generic Desktop Chrome)
                new Notification(title, {
                    body: message,
                    icon: iconUrl,
                    requireInteraction: true
                });
            } catch (e) {
                console.error("Native notification failed", e);
            }
        }
    };

    const showToast = (title, message) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, title, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000); // 5 sec toast

        // Also trigger native OS notification
        showSystemNotification(title, message);
    };

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
            // Optimistically update UI
            setNotifications(prev => prev.filter(n => n.id !== notificationId));

            await axios.delete(`${import.meta.env.VITE_API_URL}/notifications/${notificationId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Recalculate unread count
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/notifications/unread-count`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadCount(parseInt(res.data.count, 10));
        } catch (err) {
            console.error("Failed to delete notification", err);
        }
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, requestPermission, permission }}>
            {children}

            {/* Permission Banner */}
            {user && isSecure && permission === 'default' && (
                <div style={{
                    background: 'var(--accent-blue)', color: 'white', padding: '10px 20px',
                    textAlign: 'center', fontSize: '0.9rem', display: 'flex', justifyContent: 'center',
                    alignItems: 'center', gap: '15px', position: 'sticky', top: 0, zIndex: 9999
                }}>
                    <span>🔔 Enable native notifications to get instant alerts on your phone.</span>
                    <button onClick={requestPermission} style={{
                        background: 'white', color: 'var(--accent-blue)', border: 'none',
                        padding: '5px 12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer'
                    }}>
                        Enable
                    </button>
                    <button onClick={() => setPermission('dismissed')} style={{
                        background: 'transparent', color: 'white', border: '1px solid white',
                        padding: '4px 10px', borderRadius: '5px', cursor: 'pointer'
                    }}>
                        Dismiss
                    </button>
                </div>
            )}
            {user && !isSecure && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
                <div style={{
                    background: '#ef4444', color: 'white', padding: '10px',
                    textAlign: 'center', fontSize: '0.8rem', position: 'sticky', top: 0, zIndex: 9999
                }}>
                    ⚠️ Native push notifications require a secure connection (HTTPS). You will only receive in-app alerts.
                </div>
            )}

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

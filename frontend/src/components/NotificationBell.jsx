import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = async (notif) => {
        if (!notif.is_read) {
            await markAsRead(notif.id);
        }
        setIsOpen(false);

        // Routing logic based on type
        if (notif.type === 'MESSAGE' || notif.type === 'REVIEW') {
            navigate('/dashboard/inbox');
        } else if (notif.type === 'EVENT') {
            navigate('/events');
        } else if (notif.type === 'POST') {
            navigate('/community');
        }
    };

    return (
        <li ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                className="icon-btn"
                onClick={() => setIsOpen(!isOpen)}
                style={{ position: 'relative' }}
                title="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: '-5px', right: '-5px',
                        background: 'var(--accent-green)', color: '#fff',
                        fontSize: '0.65rem', fontWeight: 'bold',
                        padding: '2px 5px', borderRadius: '50%',
                        minWidth: '18px', textAlign: 'center'
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                    width: '320px', maxHeight: '400px', overflowY: 'auto',
                    background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                    borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    zIndex: 1000, display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{
                        padding: '12px 16px', borderBottom: '1px solid var(--glass-border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 2
                    }}>
                        <h4 style={{ margin: 0, fontSize: '1rem' }}>Notifications</h4>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                style={{
                                    background: 'none', border: 'none', padding: 0,
                                    color: 'var(--accent-green)', fontSize: '0.8rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div style={{ padding: '8px' }}>
                        {notifications.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px 0' }}>
                                No notifications yet.
                            </p>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    style={{
                                        padding: '12px', borderRadius: '8px', cursor: 'pointer',
                                        background: n.is_read ? 'transparent' : 'rgba(34, 197, 94, 0.05)',
                                        borderLeft: n.is_read ? '3px solid transparent' : '3px solid var(--accent-green)',
                                        marginBottom: '4px', transition: 'background 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(34, 197, 94, 0.05)'}
                                >
                                    <h5 style={{ margin: '0 0 4px', fontSize: '0.9rem', color: n.is_read ? 'var(--text-color)' : '#fff' }}>
                                        {n.title}
                                    </h5>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {n.message}
                                    </p>
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '6px', display: 'block' }}>
                                        {new Date(n.created_at).toLocaleString()}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </li>
    );
};

export default NotificationBell;

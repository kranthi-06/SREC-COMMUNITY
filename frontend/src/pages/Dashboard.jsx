/**
 * Dashboard.jsx — Admin Intelligence Hub
 * =========================================
 * Tabbed admin dashboard with:
 *  - Private Reviews Engine
 *  - Manage Events
 *  - User Roster
 *  - Audit Logs
 *  - Platform Statistics
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, FileText, Activity, Shield, BarChart3, Download } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ManageEvents from '../components/ManageEvents';
import AdminUsers from '../components/AdminUsers';
import AdminReviews from '../components/AdminReviews';

const API_URL = import.meta.env.VITE_API_URL;

const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="glass-card admin-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
        <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: `${color}15`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 0.8rem'
        }}>
            <Icon size={20} color={color} />
        </div>
        <div style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.2rem', color }}>{value}</div>
        <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
);

const AuditLogViewer = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetchLogs();
    }, [page]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/admin/audit-logs?page=${page}&limit=20`);
            setLogs(res.data.logs || []);
            setTotal(res.data.total || 0);
        } catch (err) {
            console.error('Error fetching audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const actionColors = {
        'LOGIN_SUCCESS': '#22c55e',
        'LOGIN_FAILED': '#ef4444',
        'USER_REGISTER': '#3b82f6',
        'ROLE_CHANGE': '#f59e0b',
        'USER_DELETE': '#ef4444',
        'REVIEW_CREATE': '#8b5cf6',
        'REVIEW_RESPONSE': '#22c55e',
        'POST_CREATE': '#3b82f6',
        'EVENT_CREATE': '#06b6d4',
        'MESSAGE_SEND': '#8b5cf6',
        'PROFILE_UPDATE': '#6b7280',
        'LOGOUT': '#6b7280'
    };

    return (
        <div className="glass-card admin-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.2rem' }}>
                    <Shield size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    Audit Trail
                </h3>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{total} total entries</span>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading audit logs...</div>
            ) : logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No audit logs recorded yet.</div>
            ) : (
                <>
                    <div style={{ overflowX: 'auto' }} className="audit-log-table">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Time</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actor</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Action</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(139,154,70,0.05)' }}>
                                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                            {log.actor_name || log.actor_email || 'System'}
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: '700',
                                                background: `${actionColors[log.action] || '#6b7280'}15`,
                                                color: actionColors[log.action] || '#6b7280',
                                                border: `1px solid ${actionColors[log.action] || '#6b7280'}25`
                                            }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {log.metadata?.email || log.metadata?.title || log.metadata?.targetEmail || log.metadata?.messagePreview || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {total > 20 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </button>
                            <span style={{ padding: '6px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Page {page} of {Math.ceil(total / 20)}
                            </span>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                                onClick={() => setPage(p => p + 1)}
                                disabled={page * 20 >= total}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const Dashboard = () => {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState('reviews');
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/stats`);
            setStats(res.data);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    const tabs = [
        { key: 'reviews', label: 'Private Reviews', icon: FileText },
        { key: 'events', label: 'Events', icon: Calendar },
        { key: 'users', label: 'Users', icon: Users },
        ...(user?.role === 'black_hat_admin' ? [{ key: 'audit', label: 'Audit Logs', icon: Shield }] : [])
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="container"
            style={{ padding: '4rem 0 8rem' }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontSize: 'clamp(1.8rem, 6vw, 3rem)', lineHeight: '1', marginBottom: '0.8rem' }}>
                        Command Centre
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', fontWeight: '500' }}>
                        Admin intelligence hub — reviews, events, users, and system audit.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ background: 'var(--glass-bg)', padding: '10px 20px', borderRadius: '100px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Calendar size={18} color="var(--primary)" />
                        <span style={{ fontWeight: '600' }}>Academic Session 2026</span>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                    <StatCard icon={Users} label="Students" value={stats.users?.students || 0} color="#22c55e" />
                    <StatCard icon={Users} label="Faculty" value={stats.users?.faculty || 0} color="#3b82f6" />
                    <StatCard icon={FileText} label="Reviews" value={stats.reviews?.total || 0} color="#8b5cf6" />
                    <StatCard icon={Activity} label="Posts" value={stats.posts?.total || 0} color="#f59e0b" />
                    <StatCard icon={Calendar} label="Events" value={stats.events?.total || 0} color="#06b6d4" />
                </div>
            )}

            {/* Tab Selector */}
            <div className="dashboard-tabs" style={{ display: 'flex', gap: '6px', marginBottom: '2rem', background: 'var(--glass-bg)', padding: '4px', borderRadius: '14px', border: '1px solid var(--glass-border)', flexWrap: 'wrap' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setViewMode(tab.key)}
                        style={{
                            padding: '10px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                            fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px',
                            background: viewMode === tab.key ? 'var(--primary)' : 'transparent',
                            color: viewMode === tab.key ? 'white' : 'var(--text-muted)',
                            transition: 'all 0.3s', fontFamily: 'inherit'
                        }}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {viewMode === 'events' ? (
                <ManageEvents />
            ) : viewMode === 'users' ? (
                <AdminUsers />
            ) : viewMode === 'audit' ? (
                <AuditLogViewer />
            ) : (
                <AdminReviews />
            )}
        </motion.div>
    );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Users, Filter, Shield, AlertCircle, Search, ShieldCheck, Mail, BookOpen } from 'lucide-react';

const AdminUsers = () => {
    const { user } = useAuth();
    const [usersList, setUsersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ role: '', department: '', year: '', search: '' });
    const [updatingRole, setUpdatingRole] = useState(null);
    const [status, setStatus] = useState({ type: '', text: '' });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Build query params
            const params = new URLSearchParams();
            if (filters.role) params.append('role', filters.role);
            if (filters.department) params.append('department', filters.department);
            if (filters.year) params.append('year', filters.year);

            const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/users?${params.toString()}`);
            setUsersList(res.data);
        } catch (error) {
            console.error('Failed to fetch users');
            setStatus({ type: 'error', text: 'Failed to load user list.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [filters.role, filters.department, filters.year]); // Refetch when strict filters change

    const handleRoleUpdate = async (targetUserId, newRole) => {
        if (!window.confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) return;

        setUpdatingRole(targetUserId);
        setStatus({ type: '', text: '' });

        try {
            const res = await axios.put(`${import.meta.env.VITE_API_URL}/admin/role`, {
                targetUserId,
                newRole
            });
            setStatus({ type: 'success', text: res.data.message });
            fetchUsers();
        } catch (error) {
            setStatus({ type: 'error', text: error.response?.data?.error || 'Failed to update role.' });
        } finally {
            setUpdatingRole(null);
        }
    };

    // Derived search filtering locally to avoid excessive API spam on keystrokes
    const displayedUsers = usersList.filter(u =>
    (u.full_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        u.email.toLowerCase().includes(filters.search.toLowerCase()))
    );

    const isBlackHat = user?.role === 'black_hat_admin';

    return (
        <div className="glass-card" style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users size={24} color="var(--primary)" />
                        User Management System
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px' }}>
                        Monitor and manage campus accounts.
                        {isBlackHat ? ' You have Super Admin access to modify roles.' : ' Role modification is restricted to Super Admins.'}
                    </p>
                </div>
            </div>

            {status.text && (
                <div className={`alert ${status.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '1.5rem' }}>
                    {status.type === 'error' ? <AlertCircle size={18} /> : <ShieldCheck size={18} />}
                    {status.text}
                </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, position: 'relative', minWidth: '250px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="form-input-wrapper"
                        style={{ width: '100%', paddingLeft: '45px', padding: '12px 12px 12px 45px' }}
                    />
                </div>

                <select
                    className="form-input-wrapper"
                    value={filters.role}
                    onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                    style={{ padding: '12px 20px', width: 'auto' }}
                >
                    <option value="">All Roles</option>
                    <option value="student">Students</option>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Admins</option>
                    <option value="editor_admin">Editor Admins</option>
                </select>

                <select
                    className="form-input-wrapper"
                    value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    style={{ padding: '12px 20px', width: 'auto' }}
                >
                    <option value="">All Departments</option>
                    <option value="cse">CSE</option>
                    <option value="ece">ECE</option>
                    <option value="aiml">AIML</option>
                    <option value="eee">EEE</option>
                    <option value="mech">MECH</option>
                    <option value="civil">CIVIL</option>
                </select>

                <select
                    className="form-input-wrapper"
                    value={filters.year}
                    onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                    style={{ padding: '12px 20px', width: 'auto' }}
                >
                    <option value="">All Years</option>
                    {/* Assuming batches like 23, 22, 21, 20 */}
                    <option value="26">1st Year (2026 Batch)</option>
                    <option value="25">2nd Year (2025 Batch)</option>
                    <option value="24">3rd Year (2024 Batch)</option>
                    <option value="23">4th Year (2023 Batch)</option>
                </select>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                    <div className="loader" style={{ margin: '0 auto' }}></div>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '2px solid var(--glass-border)' }}>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>User Identifier</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Role Access</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Department</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Verification</th>
                                {isBlackHat && <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>Admin Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {displayedUsers.length > 0 ? displayedUsers.map(u => (
                                    <motion.tr
                                        key={u.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        style={{ borderBottom: '1px solid var(--glass-border)' }}
                                    >
                                        <td style={{ padding: '1.2rem 1rem' }}>
                                            <div style={{ fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {u.full_name || 'Anonymous User'}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                                <Mail size={12} /> {u.email}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.2rem 1rem' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontSize: '0.75rem',
                                                fontWeight: '800',
                                                textTransform: 'uppercase',
                                                background: ['admin', 'black_hat_admin'].includes(u.role) ? 'rgba(239, 68, 68, 0.1)' : u.role === 'editor_admin' ? 'rgba(245, 158, 11, 0.1)' : u.role === 'faculty' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                                                color: ['admin', 'black_hat_admin'].includes(u.role) ? '#ef4444' : u.role === 'editor_admin' ? '#f59e0b' : u.role === 'faculty' ? '#10b981' : 'var(--primary)',
                                                border: `1px solid ${['admin', 'black_hat_admin'].includes(u.role) ? 'rgba(239, 68, 68, 0.2)' : u.role === 'editor_admin' ? 'rgba(245, 158, 11, 0.2)' : u.role === 'faculty' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)'}`
                                            }}>
                                                {u.role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.2rem 1rem' }}>
                                            {u.department ? (
                                                <span style={{ textTransform: 'uppercase', fontWeight: '700', fontSize: '0.85rem' }}>{u.department}</span>
                                            ) : '-'}
                                        </td>
                                        <td style={{ padding: '1.2rem 1rem' }}>
                                            {u.is_verified ? (
                                                <span style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', fontWeight: '600' }}><ShieldCheck size={16} /> Verified</span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pending</span>
                                            )}
                                        </td>
                                        {isBlackHat && (
                                            <td style={{ padding: '1.2rem 1rem', textAlign: 'right' }}>
                                                {updatingRole === u.id ? (
                                                    <div className="loader" style={{ width: '20px', height: '20px', margin: '0 0 0 auto', borderWidth: '3px' }}></div>
                                                ) : (
                                                    <select
                                                        value={u.role}
                                                        onChange={(e) => handleRoleUpdate(u.id, e.target.value)}
                                                        style={{
                                                            padding: '6px 10px',
                                                            borderRadius: '6px',
                                                            background: 'rgba(255,255,255,0.05)',
                                                            border: '1px solid var(--glass-border)',
                                                            color: 'var(--text-main)',
                                                            fontSize: '0.8rem',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <option value="student">Student</option>
                                                        <option value="faculty">Faculty</option>
                                                        <option value="editor_admin">Editor Admin</option>
                                                        <option value="admin">Full Admin</option>
                                                    </select>
                                                )}
                                            </td>
                                        )}
                                    </motion.tr>
                                )) : (
                                    <tr>
                                        <td colSpan={isBlackHat ? 5 : 4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                            No users matched your exact query filters.
                                        </td>
                                    </tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;

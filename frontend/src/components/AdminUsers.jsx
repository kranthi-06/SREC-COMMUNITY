import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Users, Filter, Shield, AlertCircle, Search, ShieldCheck, Mail, BookOpen, Plus, X, MessageSquare, Send, Paperclip, MoreVertical, FileText, CheckCircle } from 'lucide-react';

const AdminUsers = () => {
    const { user } = useAuth();
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', text: '' });
    const [searchQuery, setSearchQuery] = useState('');

    // Filter Groups State
    const [filterGroups, setFilterGroups] = useState([
        { id: 1, role: '', department: '', year: '' }
    ]);

    // Modal States
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [targetUserIds, setTargetUserIds] = useState([]); // Array of IDs to send to

    // Message State
    const [messageText, setMessageText] = useState('');
    const [messageFile, setMessageFile] = useState(null);
    const [sending, setSending] = useState(false);

    const fetchAllUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/users`);
            setAllUsers(res.data);
        } catch (error) {
            console.error('Failed to fetch users');
            setStatus({ type: 'error', text: 'Failed to load user list.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllUsers();
    }, []);

    const addFilterGroup = () => {
        setFilterGroups([...filterGroups, { id: Date.now(), role: '', department: '', year: '' }]);
    };

    const removeFilterGroup = (id) => {
        if (filterGroups.length === 1) {
            setFilterGroups([{ id: Date.now(), role: '', department: '', year: '' }]);
            return;
        }
        setFilterGroups(filterGroups.filter(g => g.id !== id));
    };

    const updateFilterGroup = (id, field, value) => {
        setFilterGroups(filterGroups.map(g => g.id === id ? { ...g, [field]: value } : g));
    };

    // Filter Logic
    const filteredUsers = useMemo(() => {
        return allUsers.filter(u => {
            // Check if user matches any of the filter groups
            const matchesGroups = filterGroups.some(group => {
                const roleMatch = !group.role || u.role === group.role;
                const deptMatch = !group.department || u.department === group.department;
                const yearMatch = !group.year || u.batch_year === group.year;

                // If any filter in the group is set, it must match. 
                // If no filters are set in a group, it matches everyone (we don't want this usually, 
                // but let's say an empty group matches nothing unless it's the only group)
                const isGroupEmpty = !group.role && !group.department && !group.year;
                if (isGroupEmpty) return filterGroups.length === 1; // Show all if only one empty group

                return roleMatch && deptMatch && yearMatch;
            });

            // Search Filter
            const matchesSearch = !searchQuery ||
                u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesGroups && matchesSearch;
        });
    }, [allUsers, filterGroups, searchQuery]);

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        setSending(true);
        const formData = new FormData();
        formData.append('message_text', messageText);
        formData.append('receiver_ids', JSON.stringify(targetUserIds));
        if (messageFile) formData.append('attachment', messageFile);

        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/messages/send`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setStatus({ type: 'success', text: `Message dispatched to ${targetUserIds.length} users.` });
            setIsMessageModalOpen(false);
            setMessageText('');
            setMessageFile(null);
        } catch (error) {
            setStatus({ type: 'error', text: 'Failed to transmit message.' });
        } finally {
            setSending(false);
        }
    };

    const handleSendQuickReview = async (title) => {
        setSending(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/reviews/admin/send-quick`, {
                title,
                user_ids: targetUserIds
            });
            setStatus({ type: 'success', text: `Review request "${title}" sent to ${targetUserIds.length} users.` });
            setIsReviewModalOpen(false);
        } catch (error) {
            setStatus({ type: 'error', text: 'Transmission failure for review request.' });
        } finally {
            setSending(false);
        }
    };

    const openActionModal = (type, users) => {
        const ids = users.map(u => u.id);
        setTargetUserIds(ids);
        if (type === 'message') setIsMessageModalOpen(true);
        if (type === 'review') setIsReviewModalOpen(true);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header Area */}
            <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Users size={32} color="var(--primary)" /> User Ecosystem
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginTop: '5px' }}>Direct administrative access to campus identifiers and analytics.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            disabled={filteredUsers.length === 0}
                            onClick={() => openActionModal('message', filteredUsers)}
                            className="btn btn-primary"
                            style={{ padding: '10px 20px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Mail size={18} /> Batch Message
                        </button>
                    </div>
                </div>

                {status.text && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`alert ${status.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '2rem' }}>
                        {status.type === 'error' ? <AlertCircle size={18} /> : <ShieldCheck size={18} />}
                        {status.text}
                    </motion.div>
                )}

                {/* Advanced Filter Groups */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '700' }}>
                        <Filter size={16} /> POPULATION SEGMENTATION
                    </div>

                    {filterGroups.map((group, idx) => (
                        <div key={group.id} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <select
                                className="form-input-wrapper"
                                value={group.role}
                                onChange={(e) => updateFilterGroup(group.id, 'role', e.target.value)}
                                style={{ flex: 1, padding: '12px' }}
                            >
                                <option value="">All Roles</option>
                                <option value="student">Students</option>
                                <option value="faculty">Faculty</option>
                                <option value="teacher">Teachers</option>
                                <option value="admin">Admins</option>
                            </select>
                            <select
                                className="form-input-wrapper"
                                value={group.department}
                                onChange={(e) => updateFilterGroup(group.id, 'department', e.target.value)}
                                style={{ flex: 1, padding: '12px' }}
                            >
                                <option value="">All Departments</option>
                                <option value="CSE">CSE</option>
                                <option value="ECE">ECE</option>
                                <option value="AIML">AIML</option>
                                <option value="EEE">EEE</option>
                                <option value="MECH">MECH</option>
                                <option value="CIVIL">CIVIL</option>
                            </select>
                            <select
                                className="form-input-wrapper"
                                value={group.year}
                                onChange={(e) => updateFilterGroup(group.id, 'year', e.target.value)}
                                style={{ flex: 1, padding: '12px' }}
                            >
                                <option value="">All Years</option>
                                <option value="2026">2026 Batch</option>
                                <option value="2025">2025 Batch</option>
                                <option value="2024">2024 Batch</option>
                                <option value="2023">2023 Batch</option>
                            </select>
                            <button
                                onClick={() => removeFilterGroup(group.id)}
                                style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={addFilterGroup}
                        style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed var(--glass-border)', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                        <Plus size={16} /> Add population group
                    </button>
                </div>

                {/* Search Bar */}
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search specifically by name or institutional email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="form-input-wrapper"
                        style={{ width: '100%', paddingLeft: '45px', background: 'rgba(0,0,0,0.2)' }}
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                                <th style={{ padding: '1.2rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>User Context</th>
                                <th style={{ padding: '1.2rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Department</th>
                                <th style={{ padding: '1.2rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Role</th>
                                <th style={{ padding: '1.2rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
                                <th style={{ padding: '1.2rem', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Interaction</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '4rem', textAlign: 'center' }}>
                                        <div className="loader" style={{ margin: '0 auto' }}></div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No users found in the selected population segments.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '1.2rem' }}>
                                            <div style={{ fontWeight: '700', color: 'white' }}>{u.full_name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</div>
                                        </td>
                                        <td style={{ padding: '1.2rem' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{u.department || 'N/A'}</span>
                                            {u.batch_year && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Batch of {u.batch_year}</span>}
                                        </td>
                                        <td style={{ padding: '1.2rem' }}>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase',
                                                background: u.role === 'admin' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                                                color: u.role === 'admin' ? '#ef4444' : '#60a5fa',
                                                border: `1px solid ${u.role === 'admin' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}`
                                            }}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.2rem' }}>
                                            {u.is_verified ? (
                                                <span style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: '600' }}><ShieldCheck size={14} /> Verified</span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pending</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1.2rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => openActionModal('message', [u])}
                                                    title="Send Direct Message"
                                                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                                >
                                                    <Mail size={18} />
                                                </button>
                                                <button
                                                    onClick={() => openActionModal('review', [u])}
                                                    title="Send Review Request"
                                                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#f59e0b', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                                >
                                                    <FileText size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Messaging Modal */}
            <AnimatePresence>
                {isMessageModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ maxWidth: '600px', width: '100%', padding: '2rem', position: 'relative' }}>
                            <button onClick={() => setIsMessageModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>

                            <h3 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Send Institutional Message</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Transmitting to {targetUserIds.length} target recipients.</p>

                            <form onSubmit={handleSendMessage}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Message Content</label>
                                    <textarea
                                        required
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        placeholder="Compose your secure message here..."
                                        style={{ width: '100%', minHeight: '150px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '15px', color: 'white', fontSize: '1rem', resize: 'none' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '10px 20px', borderRadius: '8px', width: 'fit-content' }}>
                                        <Paperclip size={18} />
                                        {messageFile ? messageFile.name : 'Attach Image or PDF'}
                                        <input type="file" onChange={(e) => setMessageFile(e.target.files[0])} style={{ display: 'none' }} accept="image/*,.pdf" />
                                    </label>
                                </div>

                                <button disabled={sending} type="submit" className="btn btn-primary" style={{ width: '100%', padding: '15px', borderRadius: '12px', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                                    {sending ? 'Transmitting...' : <><Send size={18} /> Dispatch Payload</>}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Quick Review Modal */}
            <AnimatePresence>
                {isReviewModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '2.5rem', position: 'relative' }}>
                            <button onClick={() => setIsReviewModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>

                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                    <FileText size={32} />
                                </div>
                                <h3 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Quick Review Dispatch</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Request performance feedback from {targetUserIds.length} users.</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <p style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Select Review Template</p>
                                {[
                                    'Academic Performance Review',
                                    'Campus Conduct Evaluation',
                                    'Project Milestone Feedback',
                                    'Mid-Term Progress Check'
                                ].map(title => (
                                    <button
                                        key={title}
                                        disabled={sending}
                                        onClick={() => handleSendQuickReview(title)}
                                        style={{
                                            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '16px 20px', color: 'white', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            fontWeight: '600'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    >
                                        {title}
                                        <Send size={16} color="var(--primary)" />
                                    </button>
                                ))}
                            </div>

                            {sending && (
                                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                                    <div className="loader" style={{ width: '25px', height: '25px', margin: '0 auto' }}></div>
                                    <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>Transmitting reviews...</p>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminUsers;

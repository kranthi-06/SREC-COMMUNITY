import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ManageEvents from '../components/ManageEvents';
import AdminUsers from '../components/AdminUsers';
import AdminReviews from '../components/AdminReviews';

const Dashboard = () => {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState('reviews');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="container"
            style={{ padding: '4rem 0 8rem' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontSize: '3.5rem', lineHeight: '1', marginBottom: '0.8rem' }}>Intelligence Hub</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', fontWeight: '500' }}>Deep-dive analysis of student sentiment and campus feedback.</p>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '1rem', background: 'var(--glass-bg)', padding: '4px', borderRadius: '12px', width: 'fit-content', border: '1px solid var(--glass-border)' }}>
                        <button
                            onClick={() => setViewMode('reviews')}
                            style={{
                                padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700',
                                background: viewMode === 'reviews' ? 'var(--primary)' : 'transparent',
                                color: viewMode === 'reviews' ? 'white' : 'var(--text-muted)',
                                transition: 'all 0.3s'
                            }}
                        >
                            Private Reviews Engine
                        </button>
                        <button
                            onClick={() => setViewMode('events')}
                            style={{
                                padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700',
                                background: viewMode === 'events' ? 'var(--primary)' : 'transparent',
                                color: viewMode === 'events' ? 'white' : 'var(--text-muted)',
                                transition: 'all 0.3s'
                            }}
                        >
                            Manage Events
                        </button>
                        <button
                            onClick={() => setViewMode('users')}
                            style={{
                                padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700',
                                background: viewMode === 'users' ? 'var(--primary)' : 'transparent',
                                color: viewMode === 'users' ? 'white' : 'var(--text-muted)',
                                transition: 'all 0.3s'
                            }}
                        >
                            User Roster
                        </button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ background: 'var(--glass-bg)', padding: '10px 20px', borderRadius: '100px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Calendar size={18} color="var(--primary)" />
                        <span style={{ fontWeight: '600' }}>Academic Session 2026</span>
                    </div>
                </div>
            </div>

            {viewMode === 'events' ? (
                <ManageEvents />
            ) : viewMode === 'users' ? (
                <AdminUsers />
            ) : (
                <AdminReviews />
            )}
        </motion.div>
    );
};

export default Dashboard;

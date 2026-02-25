import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { History as HistoryIcon, ArrowRight, Calendar, Users, BarChart3, Clock, Trash2 } from 'lucide-react';

const History = () => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/reviews/batches`);
            setBatches(res.data);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (batchId) => {
        if (!window.confirm('Are you sure you want to delete this session? All associated reviews will be permanently removed.')) {
            return;
        }

        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/reviews/batch/${batchId}`);
            fetchBatches();
        } catch (error) {
            console.error('Error deleting batch:', error);
            alert('Failed to delete session');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString(undefined, {
            weekday: 'short',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) return (
        <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
            <div className="loader"></div>
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading history records...</p>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="container"
            style={{ padding: '2rem 0 6rem' }}
        >
            <div style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
                    <div style={{ padding: '10px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '12px' }}>
                        <HistoryIcon size={24} />
                    </div>
                    <h1 style={{ color: 'var(--primary)', fontSize: '2.5rem' }}>Upload History</h1>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                    Browse and analyze previous sentiment analysis sessions.
                </p>
            </div>

            {batches.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <BarChart3 size={48} style={{ color: 'var(--glass-border)', marginBottom: '1.5rem' }} />
                    <h3 style={{ color: 'var(--text-main)' }}>No history found</h3>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Perform a bulk CSV import from the dashboard to see history records here.
                    </p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="btn btn-primary"
                        style={{ marginTop: '2rem' }}
                    >
                        Go to Dashboard
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
                    {batches.map((batch, index) => (
                        <motion.div
                            key={batch.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="glass-card"
                            style={{
                                padding: '1.5rem',
                                borderLeft: `6px solid ${batch.positive > batch.negative ? '#10b981' :
                                    batch.negative > batch.positive ? '#ef4444' : '#f59e0b'
                                    }`,
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>
                                        <Calendar size={14} />
                                        <span>{formatDate(batch.timestamp)}</span>
                                    </div>
                                    <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem' }}>
                                        {batch.id === 'legacy_data' ? 'Initial Data / Manual Entries' :
                                            batch.id.startsWith('batch_') ? 'Bulk Import Session' : 'Manual Entry Batch'}
                                    </h3>
                                </div>
                                <div style={{
                                    padding: '4px 10px',
                                    background: 'var(--glass-bg)',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    color: 'var(--primary)',
                                    border: '1px solid var(--glass-border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}>
                                    <span>{batch.total} Reviews</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(batch.id);
                                        }}
                                        style={{
                                            background: 'none',
                                            padding: '4px',
                                            borderRadius: '6px',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                        className="trash-btn"
                                        title="Delete Session"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
                                <div style={{ flex: 1, background: '#10b98122', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#10b981' }}>{batch.positive}</div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: '600', color: '#10b981', textTransform: 'uppercase' }}>Positive</div>
                                </div>
                                <div style={{ flex: 1, background: '#f59e0b22', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f59e0b' }}>{batch.neutral}</div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: '600', color: '#f59e0b', textTransform: 'uppercase' }}>Neutral</div>
                                </div>
                                <div style={{ flex: 1, background: '#ef444422', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ef4444' }}>{batch.negative}</div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: '600', color: '#ef4444', textTransform: 'uppercase' }}>Negative</div>
                                </div>
                            </div>

                            <div style={{
                                height: '6px',
                                background: 'var(--glass-border)',
                                borderRadius: '3px',
                                marginBottom: '2rem',
                                display: 'flex',
                                overflow: 'hidden'
                            }}>
                                <div style={{ width: `${(batch.positive / batch.total) * 100}%`, background: '#10b981' }}></div>
                                <div style={{ width: `${(batch.neutral / batch.total) * 100}%`, background: '#f59e0b' }}></div>
                                <div style={{ width: `${(batch.negative / batch.total) * 100}%`, background: '#ef4444' }}></div>
                            </div>

                            <button
                                onClick={() => navigate(`/dashboard?batchId=${batch.id}`)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--primary)',
                                    background: 'transparent',
                                    color: 'var(--primary)',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s'
                                }}
                                className="history-btn-hover"
                            >
                                View Detailed Report <ArrowRight size={16} />
                            </button>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

export default History;

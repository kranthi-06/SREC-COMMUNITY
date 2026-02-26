import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, MapPin, Tag, Download, Play, MessagesSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../utils/imageUtils';


const Events = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Upcoming Events');

    const CATEGORIES = [
        'Upcoming Events',
        'Ongoing Events',
        'Completed Events',
        'Department-specific Monthly Events'
    ];

    const fetchEvents = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/events`);
            setEvents(res.data);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const filteredEvents = events.filter(e => e.category === activeTab);

    return (
        <div className="container" style={{ padding: '4rem 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4rem', textAlign: 'center' }}>
                <h1 className="gradient-text" style={{ fontSize: '3.5rem', marginBottom: '1rem', display: 'flex', gap: '15px' }}>
                    <Calendar size={48} color="var(--primary)" /> Campus Events Board
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px' }}>
                    Explore activities, workshops, fests, and specialized department initiatives. Engage and review to actively shape the SREC culture.
                </p>
            </div>

            {/* Category Navigation */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '3rem' }}>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveTab(cat)}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '30px',
                            border: `1px solid ${activeTab === cat ? 'var(--primary)' : 'var(--glass-border)'}`,
                            background: activeTab === cat ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                            color: activeTab === cat ? 'white' : 'var(--text-main)',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '5rem 0' }}>
                    <div className="loader" style={{ margin: '0 auto' }}></div>
                </div>
            ) : filteredEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '6rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed var(--glass-border)' }}>
                    <Calendar size={64} style={{ opacity: 0.1, margin: '0 auto 1.5rem' }} />
                    <h3 style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>No {activeTab} scheduled right now.</h3>
                    <p style={{ color: 'var(--text-muted)', opacity: 0.7 }}>Check back later for updates from the administration.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
                    <AnimatePresence>
                        {filteredEvents.map((evt, idx) => (
                            <motion.div
                                key={evt.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="glass-card"
                                style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                            >
                                {evt.attachment_url ? (
                                    <div style={{ position: 'relative', height: '220px', background: 'rgba(0,0,0,0.5)' }}>
                                        {/* Using generic img tag if image or poster */}
                                        <img
                                            src={getImageUrl(evt.attachment_url)}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            alt={evt.title}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://via.placeholder.com/600x400?text=Image+Unavailable';
                                                e.target.style.opacity = '0.5';
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div style={{ height: '220px', background: 'linear-gradient(135deg, var(--glass-bg), rgba(139, 92, 246, 0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Calendar size={64} color="var(--primary)" opacity={0.2} />
                                    </div>
                                )}

                                <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: '800',
                                            textTransform: 'uppercase',
                                            background: 'rgba(139, 92, 246, 0.2)',
                                            color: 'var(--accent-purple-light)'
                                        }}>
                                            {evt.department || 'General'}
                                        </span>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: '800',
                                            textTransform: 'uppercase',
                                            background: evt.status === 'upcoming' ? 'rgba(59, 130, 246, 0.2)' : evt.status === 'ongoing' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                            color: evt.status === 'upcoming' ? '#60a5fa' : evt.status === 'ongoing' ? '#10b981' : '#f59e0b'
                                        }}>
                                            {evt.status}
                                        </span>
                                    </div>

                                    <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--text-main)', lineHeight: '1.3' }}>
                                        {evt.title}
                                    </h3>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Calendar size={16} />
                                            {new Date(evt.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                            {evt.event_end_date && new Date(evt.event_end_date).toDateString() !== new Date(evt.event_date).toDateString() &&
                                                ` - ${new Date(evt.event_end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                                            }
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Clock size={16} />
                                            {new Date(evt.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {evt.event_end_date && ` - ${new Date(evt.event_end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                        </div>
                                    </div>

                                    <p style={{ marginTop: '1.5rem', fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-main)', flex: 1, borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                                        {evt.description}
                                    </p>

                                    {/* Action Buttons for Students & Faculty */}
                                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                                        <Link
                                            to={`/event/${encodeURIComponent(evt.title)}`}
                                            className="btn btn-primary"
                                            style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px' }}
                                        >
                                            <MessagesSquare size={18} /> View Reviews
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default Events;

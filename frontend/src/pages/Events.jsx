import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, MapPin, Tag, Download, Play, MessagesSquare, X, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../utils/imageUtils';


const DESC_CHAR_LIMIT = 120;

const Events = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Upcoming Events');
    const [modalEvent, setModalEvent] = useState(null);

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

    const isDescriptionLong = (desc) => desc && desc.length > DESC_CHAR_LIMIT;

    return (
        <div className="container" style={{ padding: '4rem 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4rem', textAlign: 'center' }}>
                <h1 className="gradient-text" style={{ fontSize: '3.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
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

                                    {/* Description with View More */}
                                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', flex: 1 }}>
                                        <p style={{
                                            fontSize: '0.95rem',
                                            lineHeight: '1.6',
                                            color: 'var(--text-main)',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            margin: 0
                                        }}>
                                            {evt.description}
                                        </p>
                                        {isDescriptionLong(evt.description) && (
                                            <button
                                                onClick={() => setModalEvent(evt)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--primary)',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    padding: '6px 0',
                                                    marginTop: '6px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    transition: 'all 0.2s',
                                                    opacity: 0.9
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.opacity = '1';
                                                    e.currentTarget.style.gap = '8px';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.opacity = '0.9';
                                                    e.currentTarget.style.gap = '4px';
                                                }}
                                            >
                                                View More <ChevronDown size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {/* View More Button */}
                                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                                        <button
                                            onClick={() => setModalEvent(evt)}
                                            className="btn btn-primary"
                                            style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px', cursor: 'pointer', border: 'none' }}
                                        >
                                            <ChevronDown size={18} /> View More
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* ─── Description Modal ─── */}
            <AnimatePresence>
                {modalEvent && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={() => setModalEvent(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0, 0, 0, 0.7)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            padding: '2rem'
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '100%',
                                maxWidth: '640px',
                                maxHeight: '85vh',
                                overflowY: 'auto',
                                borderRadius: '24px',
                                background: 'var(--glass-bg, rgba(15, 23, 42, 0.95))',
                                border: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
                                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 80px rgba(139, 92, 246, 0.08)',
                                position: 'relative'
                            }}
                        >
                            {/* Modal Header Image */}
                            {modalEvent.attachment_url && (
                                <div style={{ position: 'relative', height: '220px' }}>
                                    <img
                                        src={getImageUrl(modalEvent.attachment_url)}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '24px 24px 0 0' }}
                                        alt={modalEvent.title}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://via.placeholder.com/600x300?text=Image+Unavailable';
                                            e.target.style.opacity = '0.5';
                                        }}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        height: '80px',
                                        background: 'linear-gradient(to top, var(--glass-bg, rgba(15, 23, 42, 0.95)), transparent)'
                                    }} />
                                </div>
                            )}

                            {/* Close Button */}
                            <button
                                onClick={() => setModalEvent(null)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    background: 'rgba(0, 0, 0, 0.5)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backdropFilter: 'blur(10px)',
                                    transition: 'all 0.2s',
                                    zIndex: 10
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.6)';
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                <X size={20} />
                            </button>

                            {/* Modal Content */}
                            <div style={{ padding: '2rem 2.5rem 2.5rem' }}>
                                {/* Badges */}
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                    <span style={{
                                        padding: '5px 14px',
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        fontWeight: '800',
                                        textTransform: 'uppercase',
                                        background: 'rgba(139, 92, 246, 0.2)',
                                        color: 'var(--accent-purple-light, #a78bfa)'
                                    }}>
                                        {modalEvent.department || 'General'}
                                    </span>
                                    <span style={{
                                        padding: '5px 14px',
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        fontWeight: '800',
                                        textTransform: 'uppercase',
                                        background: modalEvent.status === 'upcoming' ? 'rgba(59, 130, 246, 0.2)' : modalEvent.status === 'ongoing' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                        color: modalEvent.status === 'upcoming' ? '#60a5fa' : modalEvent.status === 'ongoing' ? '#10b981' : '#f59e0b'
                                    }}>
                                        {modalEvent.status}
                                    </span>
                                    {modalEvent.event_type && (
                                        <span style={{
                                            padding: '5px 14px',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem',
                                            fontWeight: '800',
                                            textTransform: 'uppercase',
                                            background: 'rgba(59, 130, 246, 0.15)',
                                            color: '#60a5fa'
                                        }}>
                                            {modalEvent.event_type}
                                        </span>
                                    )}
                                </div>

                                {/* Title */}
                                <h2 style={{
                                    fontSize: '1.8rem',
                                    fontWeight: '800',
                                    color: 'var(--text-main)',
                                    lineHeight: '1.3',
                                    marginBottom: '1.2rem'
                                }}>
                                    {modalEvent.title}
                                </h2>

                                {/* Date & Time */}
                                <div style={{
                                    display: 'flex',
                                    gap: '20px',
                                    flexWrap: 'wrap',
                                    padding: '14px 18px',
                                    borderRadius: '14px',
                                    background: 'rgba(139, 92, 246, 0.06)',
                                    border: '1px solid rgba(139, 92, 246, 0.12)',
                                    marginBottom: '1.5rem',
                                    fontSize: '0.95rem',
                                    color: 'var(--text-muted)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Calendar size={16} color="var(--primary)" />
                                        {new Date(modalEvent.event_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        {modalEvent.event_end_date && new Date(modalEvent.event_end_date).toDateString() !== new Date(modalEvent.event_date).toDateString() &&
                                            ` — ${new Date(modalEvent.event_end_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
                                        }
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Clock size={16} color="var(--primary)" />
                                        {new Date(modalEvent.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {modalEvent.event_end_date && ` — ${new Date(modalEvent.event_end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                    </div>
                                </div>

                                {/* Full Description */}
                                <div style={{
                                    borderTop: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
                                    paddingTop: '1.5rem'
                                }}>
                                    <h4 style={{
                                        fontSize: '0.85rem',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em',
                                        color: 'var(--primary)',
                                        marginBottom: '1rem'
                                    }}>
                                        Event Description
                                    </h4>
                                    <p style={{
                                        fontSize: '1rem',
                                        lineHeight: '1.8',
                                        color: 'var(--text-main)',
                                        whiteSpace: 'pre-wrap',
                                        margin: 0
                                    }}>
                                        {modalEvent.description}
                                    </p>
                                </div>

                                {/* Modal Action */}
                                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                                    <Link
                                        to={`/event/${encodeURIComponent(modalEvent.title)}`}
                                        className="btn btn-primary"
                                        style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '14px', fontSize: '1rem' }}
                                        onClick={() => setModalEvent(null)}
                                    >
                                        <MessagesSquare size={18} /> View Reviews
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Events;

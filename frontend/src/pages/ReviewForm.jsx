import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Star, Layout, MessageCircle, AlertCircle, Calendar, Clock, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../utils/imageUtils';


const ReviewForm = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryParams = new URLSearchParams(location.search);
    const preSelectedEvent = queryParams.get('event');

    const [formData, setFormData] = useState({
        studentName: user?.email?.split('@')[0] || '',
        eventName: preSelectedEvent || '',
        eventType: 'Workshop',
        rating: 5,
        description: ''
    });
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const [selectedEventData, setSelectedEventData] = useState(null);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/events`);
                setEvents(res.data);

                let initialEvent = null;
                if (preSelectedEvent) {
                    initialEvent = res.data.find(ev => ev.title === preSelectedEvent);
                }

                if (!initialEvent && res.data.length > 0) {
                    initialEvent = res.data[0];
                }

                if (initialEvent) {
                    setFormData(prev => ({
                        ...prev,
                        eventName: initialEvent.title,
                        eventType: initialEvent.type
                    }));
                    setSelectedEventData(initialEvent);
                }
            } catch (_) {
                console.error('Failed to fetch events');
            } finally {
                setLoadingEvents(false);
            }
        };
        fetchEvents();
    }, [preSelectedEvent]);

    const handleEventSelect = (e) => {
        const eventTitle = e.target.value;
        const selectedEvent = events.find(ev => ev.title === eventTitle);
        setFormData({
            ...formData,
            eventName: eventTitle,
            eventType: selectedEvent ? selectedEvent.type : 'Other'
        });
        setSelectedEventData(selectedEvent);
    };

    const handleDescriptionChange = (e) => {
        const text = e.target.value;
        setFormData({ ...formData, description: text });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.eventName) {
            setError('Please select an event first. If no events are available, wait for admin to publish one.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/reviews/submit`, formData);
            setSuccess(true);
            setFormData(prev => ({
                ...prev,
                description: ''
            }));
            setTimeout(() => setSuccess(false), 5000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to submit review. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingEvents) return <div className="loader" style={{ margin: '10rem auto' }}></div>;

    return (
        <div className="container" style={{ padding: '4rem 0' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '3rem', alignItems: 'start' }}>
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div style={{ position: 'sticky', top: '2rem' }}>
                        <h1 className="gradient-text" style={{ fontSize: '3.5rem', marginBottom: '1.5rem', lineHeight: '1.1' }}>
                            Your Feedback <br /> Matters
                        </h1>

                        <AnimatePresence mode="wait">
                            {selectedEventData ? (
                                <motion.div
                                    key={selectedEventData.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="glass-card"
                                    style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--primary-light)' }}
                                >
                                    {selectedEventData.attachment_url && (
                                        !(selectedEventData.attachment_url.toLowerCase().endsWith('.mp4') || selectedEventData.attachment_url.toLowerCase().endsWith('.mov')) ? (
                                            <img src={getImageUrl(selectedEventData.attachment_url)} style={{ width: '100%', height: '220px', objectFit: 'cover' }} alt={selectedEventData.title} />
                                        ) : (
                                            <video src={getImageUrl(selectedEventData.attachment_url)} style={{ width: '100%', height: '220px', objectFit: 'cover' }} controls />
                                        )
                                    )}

                                    <div style={{ padding: '1.5rem' }}>
                                        <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: '800', background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {selectedEventData.type}
                                            </span>
                                            {selectedEventData.event_date && (
                                                <span style={{ fontSize: '0.7rem', fontWeight: '700', background: 'rgba(255,255,255,0.08)', color: 'var(--text-main)', padding: '4px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Calendar size={12} /> {new Date(selectedEventData.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </span>
                                            )}
                                            {selectedEventData.event_time && (
                                                <span style={{ fontSize: '0.7rem', fontWeight: '700', background: 'rgba(255,255,255,0.08)', color: 'var(--text-main)', padding: '4px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Clock size={12} /> {selectedEventData.event_time}
                                                </span>
                                            )}
                                        </div>
                                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', lineHeight: '1.2' }}>{selectedEventData.title}</h2>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                            {selectedEventData.description}
                                        </p>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                                    <Layout size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                    <p style={{ color: 'var(--text-muted)' }}>Select an event to see details here</p>
                                </div>
                            )}
                        </AnimatePresence>

                        <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '2rem' }}>
                            <div style={{ background: 'var(--secondary)', padding: '8px', borderRadius: '10px', color: 'white' }}>
                                <MessageCircle size={20} />
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                                Your review will be analyzed by our sentiment engine to improve campus life.
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card"
                    style={{ padding: '2.5rem' }}
                >
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label>Student Name</label>
                                <input
                                    type="text"
                                    placeholder="Your full name"
                                    value={formData.studentName}
                                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label>Target Event</label>
                                <select
                                    value={formData.eventName}
                                    onChange={handleEventSelect}
                                    required
                                    disabled={loadingEvents}
                                >
                                    {events.length > 0 ? (
                                        events.map(ev => (
                                            <option key={ev.id} value={ev.title}>{ev.title}</option>
                                        ))
                                    ) : (
                                        <option value="">No events available</option>
                                    )}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label>Category (Auto-selected)</label>
                                <input
                                    type="text"
                                    value={formData.eventType}
                                    readOnly
                                    style={{ background: 'rgba(255,255,255,0.02)', cursor: 'default' }}
                                />
                            </div>
                            <div>
                                {/* Rating is auto-calculated from the sentiment of the description.
                                     This keeps the star rating and sentiment distribution always in sync. */}
                                <label>Rating</label>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginTop: '12px',
                                    padding: '10px 16px',
                                    borderRadius: '12px',
                                    background: 'rgba(139, 154, 70, 0.06)',
                                    border: '1px solid rgba(139, 154, 70, 0.15)',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-muted)',
                                    fontWeight: '600'
                                }}>
                                    <Star size={18} color="var(--accent-green)" />
                                    Auto-calculated from your review text
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem', position: 'relative' }}>
                            <label>Review Description</label>
                            <textarea
                                rows="6"
                                placeholder="Describe your experience at this event..."
                                value={formData.description}
                                onChange={handleDescriptionChange}
                                required
                                style={{ fontSize: '1rem' }}
                            ></textarea>
                        </div>

                        <AnimatePresence>
                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    style={{
                                        background: 'rgba(39, 174, 96, 0.1)',
                                        color: '#27ae60',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        marginBottom: '1.5rem',
                                        fontWeight: '600',
                                        textAlign: 'center',
                                        border: '1px solid rgba(39, 174, 96, 0.2)'
                                    }}
                                >
                                    Review submitted successfully! Thank you.
                                </motion.div>
                            )}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{
                                        background: 'rgba(231, 76, 60, 0.1)',
                                        color: '#e74c3c',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        marginBottom: '1.5rem',
                                        fontWeight: '600',
                                        textAlign: 'center',
                                        border: '1px solid rgba(231, 76, 60, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <AlertCircle size={20} />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            type="submit"
                            disabled={submitting || events.length === 0}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '1.2rem', fontSize: '1.1rem' }}
                        >
                            <Send size={20} /> {submitting ? 'Submitting...' : 'Submit Final Review'}
                        </button>

                        {events.length === 0 && (
                            <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Submission disabled: Please wait for admin to publish events.
                            </p>
                        )}
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

export default ReviewForm;

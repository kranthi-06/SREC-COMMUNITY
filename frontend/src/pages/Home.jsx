/**
 * Home.jsx
 * -------------------------------------------------
 * Landing page for CampusPulse — inspired by the Lucent website aesthetic.
 * Features:
 *   - Premium hero section with italic serif typography
 *   - Section labels with diamond bullet points
 *   - Event cards with "Check Review" button (not "Write Review")
 *     → "Check Review" opens the EventReviews page showing overall + student reviews
 *   - Feature cards with nature-inspired color palette
 *   - Stats section with smooth animations
 * -------------------------------------------------
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
// Import icons — Eye is used for the "Check Review" button
import { MessageSquare, BarChart3, ShieldCheck, Sparkles, ArrowRight, Activity, Zap, Eye, ChevronDown, FileText, Clock, CheckCircle } from 'lucide-react';
import { getImageUrl } from '../utils/imageUtils';

/* ============================================
   REVIEW FORM POPUP MODAL
   Opens when a student clicks a review card on the homepage.
   Supports all question types: TEXT_BASED, OPTION_BASED, EMOJI_BASED, RATING_BASED
   ============================================ */
const ReviewFormModal = ({ review, onClose, onSubmitted }) => {
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleOptionSelect = (qId, option) => {
        setAnswers(prev => ({ ...prev, [qId]: option }));
    };

    const handleSubmit = async () => {
        if (review.is_answered) return;

        // Validation
        for (const q of review.questions) {
            if (!answers[q.id] || (typeof answers[q.id] === 'string' && !answers[q.id].trim())) {
                alert('Please answer all questions before submitting.');
                return;
            }
            if (q.type === 'TEXT_BASED' && q.minChars && answers[q.id].length < q.minChars) {
                alert(`Your text response must be at least ${q.minChars} characters. Currently: ${answers[q.id].length}`);
                return;
            }
        }

        setSubmitting(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/reviews/student/submit/${review.id}`, { answers });
            setSubmitted(true);
            if (onSubmitted) onSubmitted();
        } catch (error) {
            alert(error.response?.data?.error || 'Submission failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                    background: 'linear-gradient(145deg, rgba(15,15,25,0.98), rgba(10,10,20,0.98))',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '24px',
                    width: '100%', maxWidth: '700px', maxHeight: '85vh',
                    overflowY: 'auto', padding: '0',
                    boxShadow: '0 30px 80px -15px rgba(0,0,0,0.5), 0 0 40px rgba(139, 92, 246, 0.08)'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '2rem 2.5rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    position: 'sticky', top: 0, background: 'rgba(15,15,25,0.98)', zIndex: 2, borderRadius: '24px 24px 0 0'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    background: 'rgba(139, 92, 246, 0.1)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', color: '#a78bfa'
                                }}>
                                    <FileText size={18} />
                                </div>
                                <span style={{
                                    fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.1em',
                                    textTransform: 'uppercase', color: '#a78bfa',
                                    background: 'rgba(139, 92, 246, 0.1)', padding: '3px 10px',
                                    borderRadius: '100px', border: '1px solid rgba(139, 92, 246, 0.2)'
                                }}>
                                    Institutional Review Form
                                </span>
                            </div>
                            <h2 style={{ margin: '0 0 6px', fontSize: '1.5rem', fontWeight: '800', lineHeight: '1.3' }}>
                                {review.title}
                            </h2>
                            {review.description && (
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                    {review.description}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px', padding: '8px', color: 'var(--text-muted)',
                                cursor: 'pointer', flexShrink: 0, marginLeft: '1rem'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Success State */}
                {submitted ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ padding: '4rem 2.5rem', textAlign: 'center' }}
                    >
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'rgba(16, 185, 129, 0.1)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.5rem', border: '2px solid rgba(16, 185, 129, 0.3)'
                        }}>
                            <CheckCircle size={40} color="#10b981" />
                        </div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '10px', color: '#10b981' }}>
                            Response Submitted Successfully!
                        </h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
                            Your feedback has been securely recorded and will be analyzed by our AI sentiment engine.
                            Results will appear in the admin's Analysis Dashboard.
                        </p>
                        <button
                            onClick={onClose}
                            className="btn btn-primary"
                            style={{ padding: '12px 32px', borderRadius: '100px', fontSize: '0.95rem' }}
                        >
                            Close
                        </button>
                    </motion.div>
                ) : review.is_answered ? (
                    /* Already Answered State */
                    <div style={{ padding: '3rem 2.5rem', textAlign: 'center' }}>
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)',
                            padding: '2rem', borderRadius: '16px', display: 'flex', alignItems: 'center',
                            gap: '15px', justifyContent: 'center'
                        }}>
                            <CheckCircle size={32} color="#10b981" />
                            <div style={{ textAlign: 'left' }}>
                                <h4 style={{ margin: '0 0 4px', color: '#10b981', fontWeight: '800' }}>Already Submitted</h4>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    You have already submitted your response for this form. Responses cannot be modified.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Questions */
                    <div style={{ padding: '2rem 2.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                            {review.questions.map((q, qIndex) => (
                                <div key={q.id}>
                                    <h4 style={{ fontSize: '1.05rem', marginBottom: '1rem', lineHeight: '1.4', fontWeight: '700' }}>
                                        <span style={{ color: '#a78bfa', marginRight: '8px' }}>Q{qIndex + 1}.</span>
                                        {q.text}
                                    </h4>

                                    {/* OPTION_BASED */}
                                    {q.type === 'OPTION_BASED' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {q.options.map(opt => (
                                                <button
                                                    key={opt} disabled={submitting}
                                                    onClick={() => handleOptionSelect(q.id, opt)}
                                                    style={{
                                                        padding: '14px 20px', fontSize: '0.95rem', borderRadius: '10px',
                                                        cursor: 'pointer', transition: 'all 0.2s', fontWeight: '600',
                                                        color: 'white', textAlign: 'left',
                                                        background: answers[q.id] === opt ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255,255,255,0.03)',
                                                        border: answers[q.id] === opt ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(255,255,255,0.08)',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                        <div style={{
                                                            width: '18px', height: '18px', borderRadius: '50%',
                                                            border: `2px solid ${answers[q.id] === opt ? '#a78bfa' : 'rgba(255,255,255,0.3)'}`,
                                                            background: answers[q.id] === opt ? '#a78bfa' : 'transparent',
                                                            display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0
                                                        }}>
                                                            {answers[q.id] === opt && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                                                        </div>
                                                        {opt}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* EMOJI_BASED */}
                                    {q.type === 'EMOJI_BASED' && (
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            {q.options.map(opt => (
                                                <button
                                                    key={opt} disabled={submitting}
                                                    onClick={() => handleOptionSelect(q.id, opt)}
                                                    style={{
                                                        flex: 1, minWidth: '120px', padding: '14px 20px', fontSize: '1.1rem',
                                                        borderRadius: '25px', cursor: 'pointer', transition: 'all 0.2s',
                                                        background: answers[q.id] === opt ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                                                        border: answers[q.id] === opt ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                                                    }}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* RATING_BASED */}
                                    {q.type === 'RATING_BASED' && (
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {q.options.map(opt => (
                                                <button
                                                    key={opt} disabled={submitting}
                                                    onClick={() => handleOptionSelect(q.id, opt)}
                                                    style={{
                                                        width: '50px', height: '50px', fontSize: '1rem', borderRadius: '50%',
                                                        cursor: 'pointer', transition: 'all 0.2s', fontWeight: '800',
                                                        background: answers[q.id] === opt ? '#8b5cf6' : 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        color: answers[q.id] === opt ? 'white' : '#a78bfa',
                                                    }}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* TEXT_BASED */}
                                    {q.type === 'TEXT_BASED' && (
                                        <div>
                                            <textarea
                                                value={answers[q.id] || ''}
                                                onChange={(e) => handleOptionSelect(q.id, e.target.value)}
                                                disabled={submitting}
                                                placeholder="Type your detailed feedback here..."
                                                rows={4}
                                                maxLength={q.maxChars || 1000}
                                                style={{
                                                    width: '100%', padding: '14px 16px', fontSize: '0.95rem',
                                                    borderRadius: '10px', background: 'rgba(0,0,0,0.3)',
                                                    border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                                                    resize: 'vertical', outline: 'none', lineHeight: '1.6',
                                                    fontFamily: 'inherit'
                                                }}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                <span style={{ color: (answers[q.id] || '').length < (q.minChars || 10) ? '#ef4444' : '#10b981' }}>
                                                    {(answers[q.id] || '').length} / {q.minChars || 10} min characters
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8b5cf6' }}>
                                                    🤖 AI sentiment analysis
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Submit Button */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '2rem', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={onClose} style={{
                                padding: '12px 24px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)',
                                cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem'
                            }}>
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit} disabled={submitting}
                                className="btn btn-primary"
                                style={{
                                    padding: '12px 32px', borderRadius: '100px', fontSize: '0.95rem',
                                    opacity: submitting ? 0.6 : 1
                                }}
                            >
                                {submitting ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};


/* ============================================
   PUBLISHED REVIEWS COMPONENT
   Shows review requests assigned to the logged-in user
   on the homepage as premium cards. Clicking opens a popup modal.
   ============================================ */
const PublishedReviews = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReview, setSelectedReview] = useState(null);
    const { user } = useAuth();

    const fetchPublished = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/reviews/student/published`);
            setReviews(res.data);
        } catch (err) {
            console.error('Failed to fetch published reviews');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) { setLoading(false); return; }
        fetchPublished();
    }, [user]);

    if (loading) return <div className="loader" style={{ margin: '2rem auto' }}></div>;
    if (!user || reviews.length === 0) return null;

    return (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {reviews.map((review, i) => (
                    <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -6, boxShadow: '0 20px 50px -15px rgba(139, 92, 246, 0.15)' }}
                        transition={{ delay: i * 0.08 }}
                        onClick={() => setSelectedReview(review)}
                        style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: review.is_answered ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(139, 92, 246, 0.2)',
                            borderRadius: '16px',
                            padding: '1.8rem',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'all 0.3s ease',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        {/* Status badge */}
                        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                            {review.is_answered ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '5px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' }}>
                                    <CheckCircle size={13} /> Completed
                                </span>
                            ) : (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', padding: '5px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' }}>
                                    <Clock size={13} /> Pending
                                </span>
                            )}
                        </div>

                        {/* Icon */}
                        <div style={{
                            width: '44px', height: '44px', borderRadius: '12px',
                            background: review.is_answered ? 'rgba(16, 185, 129, 0.08)' : 'rgba(139, 92, 246, 0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '1rem',
                            color: review.is_answered ? '#10b981' : '#a78bfa'
                        }}>
                            <FileText size={22} />
                        </div>

                        {/* Title */}
                        <h3 style={{
                            fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.6rem',
                            color: review.is_answered ? 'var(--text-muted)' : 'white',
                            lineHeight: '1.3', paddingRight: '80px'
                        }}>
                            {review.title}
                        </h3>

                        {/* Description */}
                        {review.description && (
                            <p style={{
                                color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6',
                                marginBottom: '1rem', display: '-webkit-box',
                                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                            }}>
                                {review.description}
                            </p>
                        )}

                        {/* Footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <span>{review.questions?.length || 1} Questions</span>
                            <span>By {review.creator_name}</span>
                        </div>

                        {/* Accent gradient line at bottom */}
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px',
                            background: review.is_answered
                                ? 'linear-gradient(90deg, #10b981, #34d399)'
                                : 'linear-gradient(90deg, #8b5cf6, #a78bfa, #c084fc)'
                        }} />
                    </motion.div>
                ))}
            </div>

            {/* Review Form Popup Modal */}
            <AnimatePresence>
                {selectedReview && (
                    <ReviewFormModal
                        review={selectedReview}
                        onClose={() => setSelectedReview(null)}
                        onSubmitted={() => fetchPublished()}
                    />
                )}
            </AnimatePresence>
        </>
    );
};


/* ============================================
   FEATURE CARD COMPONENT
   Displays a single feature with icon, title, description
   ============================================ */
const FeatureCard = ({ icon: Icon, title, description, delay, accentColor }) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        whileHover={{
            y: -10,
            boxShadow: "0 30px 60px -12px rgba(0, 0, 0, 0.3)"
        }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 300, delay }}
        className="glass-card"
        style={{ flex: 1, textAlign: 'center', cursor: 'default' }}
    >
        <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ delay: delay + 0.2, type: "spring" }}
            style={{
                width: '70px',
                height: '70px',
                background: `${accentColor}12`,
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 2rem',
                color: accentColor,
                border: `1px solid ${accentColor}25`
            }}
        >
            <Icon size={32} />
        </motion.div>
        <h3 style={{ fontSize: '1.4rem', marginBottom: '1.2rem', fontWeight: '800' }}>{title}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.7' }}>{description}</p>
    </motion.div>
);

/* ============================================
   STAT BADGE COMPONENT
   Displays a single stat (e.g. "500+", "98%")
   ============================================ */
const StatBadge = ({ value, label, delay }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay, type: 'spring' }}
        style={{ textAlign: 'center', padding: '1.5rem 2rem' }}
    >
        <div style={{
            fontSize: '2.5rem',
            fontWeight: '900',
            fontFamily: 'Outfit',
            background: 'linear-gradient(135deg, var(--accent-green), var(--accent-gold))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
        }}>
            {value}
        </div>
        <div style={{
            color: 'var(--text-muted)',
            fontSize: '0.82rem',
            fontWeight: '700',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginTop: '4px'
        }}>
            {label}
        </div>
    </motion.div>
);

/* ============================================
   EVENTS GRID COMPONENT
   Fetches and renders all campus event cards.
   Each card has a "Check Review" button instead of "Write Review"
   ============================================ */
const EventsGrid = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/events`);
                setEvents(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const navigate = useNavigate();

    if (loading) return <div className="loader" style={{ margin: '2rem auto' }}></div>;
    if (events.length === 0) return null;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem' }}>
            {events.map((event, i) => (
                <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card event-card"
                    style={{ padding: '0', overflow: 'hidden' }}
                >
                    {/* Event image/video with zoom-on-hover effect */}
                    {event.attachment_url && (
                        <div style={{ overflow: 'hidden' }}>
                            <img
                                src={getImageUrl(event.attachment_url)}
                                className="event-image"
                                style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
                                alt={event.title}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://via.placeholder.com/600x400?text=Image+Unavailable';
                                    e.target.style.opacity = '0.5';
                                }}
                            />
                        </div>
                    )}
                    <div style={{ padding: '1.5rem' }}>
                        {/* Event type badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <span style={{
                                fontSize: '0.68rem',
                                fontWeight: '800',
                                background: 'var(--accent-green)',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em'
                            }}>
                                {event.type}
                            </span>
                        </div>
                        <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', fontWeight: '800' }}>
                            {event.title}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                            {event.description}
                        </p>
                        {/* "Check Review" button — opens EventReviews page
                             showing overall review summary + individual student reviews */}
                        <button
                            onClick={() => navigate(`/event/${encodeURIComponent(event.title)}`)}
                            className="btn btn-secondary"
                            style={{ width: '100%', padding: '10px', fontSize: '0.9rem' }}
                        >
                            <Eye size={16} /> Check Review
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

/* ============================================
   HOME PAGE COMPONENT
   Main landing page with Lucent-inspired design:
   - Hero with italic serif text
   - Stats bar
   - Events grid with "Check Review" buttons
   - Feature cards (How it Works)
   ============================================ */
const Home = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <div className="home-page">
            {/* ========== HERO SECTION ========== */}
            <section className="hero" style={{ padding: '6rem 0 4rem', position: 'relative' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', maxWidth: '1100px', margin: '0 auto' }}>
                        {/* Small badge above the heading */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '10px',
                                background: 'rgba(139, 154, 70, 0.08)',
                                padding: '10px 24px',
                                borderRadius: '100px',
                                marginBottom: '3rem',
                                border: '1px solid rgba(139, 154, 70, 0.18)',
                                backdropFilter: 'blur(10px)'
                            }}
                        >
                            <span style={{ color: 'var(--accent-green)' }}><Activity size={16} /></span>
                            <span style={{
                                fontSize: '0.78rem',
                                fontWeight: '800',
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                color: 'var(--accent-green-light)'
                            }}>
                                AI-Powered Campus Intelligence
                            </span>
                        </motion.div>

                        {/* Main hero heading — Playfair Display italic for elegance */}
                        <motion.h1
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 1 }}
                            style={{
                                fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
                                lineHeight: '1.05',
                                marginBottom: '2.5rem',
                                fontWeight: '800',
                                fontFamily: 'Outfit, sans-serif',
                            }}
                        >
                            Student{' '}
                            <span style={{
                                fontFamily: 'Playfair Display, serif',
                                fontStyle: 'italic',
                                fontWeight: '500',
                            }} className="gradient-text">centered</span>
                            <br />
                            <span style={{
                                fontFamily: 'Playfair Display, serif',
                                fontStyle: 'italic',
                                fontWeight: '500',
                            }} className="gradient-text">sentiment</span>{' '}
                            analysis
                        </motion.h1>

                        {/* Sub-heading description */}
                        <motion.p
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 1 }}
                            style={{
                                fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                                color: 'var(--text-muted)',
                                marginBottom: '3.5rem',
                                maxWidth: '700px',
                                margin: '0 auto 3.5rem',
                                fontWeight: '400',
                                lineHeight: '1.8'
                            }}
                        >
                            Smarter, AI-powered feedback solutions for a better campus experience
                            at SREC Nandyal. Transforming student voices into actionable insights.
                        </motion.p>

                        {/* CTA Buttons */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 1 }}
                            style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}
                        >
                            {(!user || user.role === 'student') && (
                                <motion.button
                                    className="btn btn-primary"
                                    onClick={() => navigate('/submit')}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    style={{ padding: '1rem 2.5rem', fontSize: '1rem' }}
                                >
                                    Submit Your Review <ArrowRight size={18} />
                                </motion.button>
                            )}
                            {(!user || user.role === 'admin') && (
                                <motion.button
                                    className="btn btn-secondary"
                                    onClick={() => navigate('/dashboard')}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    style={{ padding: '1rem 2.5rem', fontSize: '1rem' }}
                                >
                                    <BarChart3 size={18} /> Admin Dashboard
                                </motion.button>
                            )}
                        </motion.div>

                        {/* Scroll indicator */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1 }}
                            style={{ marginTop: '4rem' }}
                        >
                            <div className="scroll-indicator" style={{ justifyContent: 'center' }}>
                                Scroll to explore
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ========== STATS SECTION ========== */}
            <section style={{ padding: '2rem 0 4rem' }}>
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="glass-card auth-card"
                        style={{
                            display: 'flex',
                            justifyContent: 'space-around',
                            flexWrap: 'wrap',
                            maxWidth: '800px',
                            margin: '0 auto',
                            padding: '1.5rem 2rem',
                        }}
                    >
                        <StatBadge value="500+" label="Reviews Analyzed" delay={0.1} />
                        <StatBadge value="98%" label="Accuracy Rate" delay={0.2} />
                        <StatBadge value="24/7" label="Real-time Insights" delay={0.3} />
                    </motion.div>
                </div>
            </section>

            {/* ========== PUBLISHED REVIEWS SECTION ========== */}
            {user && (
                <section style={{ padding: '2rem 0 4rem' }}>
                    <div className="container">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            style={{ marginBottom: '2.5rem' }}
                        >
                            <div className="section-label">Your Reviews</div>
                            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: '900', marginBottom: '0.8rem' }}>
                                <span className="gradient-text">Published</span> Review Requests
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '600px' }}>
                                Institutional review forms assigned to you. Click to open and complete in your inbox.
                            </p>
                        </motion.div>

                        <PublishedReviews />
                    </div>
                </section>
            )}

            {/* ========== CAMPUS EVENTS SECTION ========== */}
            {/* Events grid: each card has a "Check Review" button */}
            <section style={{ padding: '6rem 0' }}>
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        style={{ marginBottom: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}
                    >
                        <div>
                            <div className="section-label">Campus Events</div>
                            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '900', marginBottom: '1rem' }}>
                                <span className="gradient-text">Upcoming</span> Campus Events
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '600px' }}>
                                Explore what's happening at SREC Nandyal. Join, participate, and check reviews.
                            </p>
                        </div>
                    </motion.div>

                    <EventsGrid />
                </div>
            </section>

            {/* ========== HOW IT WORKS SECTION ========== */}
            <section style={{ padding: '4rem 0 10rem' }}>
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        style={{ textAlign: 'center', marginBottom: '5rem' }}
                    >
                        <div className="section-label" style={{ justifyContent: 'center' }}>How It Works</div>
                        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '900', marginBottom: '1rem' }}>
                            How <span className="gradient-text">CampusPulse</span> Works
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
                            Three pillars of intelligence that power our campus sentiment engine
                        </p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                            gap: '3rem'
                        }}
                    >
                        <FeatureCard
                            icon={MessageSquare}
                            title="Smart Analysis"
                            description="Real-time NLP processing that categorizes feedback patterns and sentiment automatically as they arrive."
                            delay={0.1}
                            accentColor="#8B9A46"
                        />
                        <FeatureCard
                            icon={BarChart3}
                            title="Live Dashboards"
                            description="High-fidelity data visualizations that reveal the emotional heartbeat of the institution in real-time."
                            delay={0.2}
                            accentColor="#C4A052"
                        />
                        <FeatureCard
                            icon={ShieldCheck}
                            title="Secure & Private"
                            description="State-of-the-art security protocols ensuring student anonymity and complete data integrity."
                            delay={0.3}
                            accentColor="#9CAF88"
                        />
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

export default Home;

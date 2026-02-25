/**
 * EventReviews.jsx
 * -------------------------------------------------
 * This page is displayed when a user clicks "Check Review" on an event card.
 * It shows:
 *   1. The event details (image, title, type, date, description)
 *   2. Overall sentiment summary (positive/negative/neutral %, avg rating)
 *   3. Every individual student review with their sentiment and rating
 *
 * The page fetches review data from the public endpoint:
 *   GET /api/reviews/event/:eventName
 * -------------------------------------------------
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Star,
    TrendingUp,
    TrendingDown,
    Minus,
    Users,
    BarChart3,
    MessageSquare,
    Calendar,
    Clock,
    User,
    ThumbsUp,
    ThumbsDown,
    Sparkles
} from 'lucide-react';

const EventReviews = () => {
    const { eventName } = useParams();
    const navigate = useNavigate();
    const decodedEventName = decodeURIComponent(eventName);

    // State for event data, reviews data, and loading status
    const [eventData, setEventData] = useState(null);
    const [reviewData, setReviewData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch event info and all reviews on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch the event details
                const eventsRes = await axios.get(`${import.meta.env.VITE_API_URL}/events`);
                const matchedEvent = eventsRes.data.find(
                    (ev) => ev.title === decodedEventName
                );
                setEventData(matchedEvent || null);

                // Fetch reviews for this event (public endpoint)
                const reviewsRes = await axios.get(
                    `${import.meta.env.VITE_API_URL}/reviews/event/${encodeURIComponent(decodedEventName)}`
                );
                setReviewData(reviewsRes.data);
            } catch (err) {
                console.error('Error fetching event reviews:', err);
                setError('Failed to load reviews. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [decodedEventName]);

    // Helper: get sentiment color
    const getSentimentColor = (sentiment) => {
        if (sentiment === 'Positive') return '#10b981';
        if (sentiment === 'Negative') return '#ef4444';
        return '#f59e0b';
    };

    // Helper: get sentiment icon
    const getSentimentIcon = (sentiment) => {
        if (sentiment === 'Positive') return <ThumbsUp size={16} />;
        if (sentiment === 'Negative') return <ThumbsDown size={16} />;
        return <Minus size={16} />;
    };

    // Loading state
    if (loading) {
        return (
            <div className="container" style={{ padding: '8rem 0', textAlign: 'center' }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    style={{ marginBottom: '2rem', display: 'inline-block' }}
                >
                    <BarChart3 size={48} color="var(--accent-green)" />
                </motion.div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    Loading Reviews...
                </h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Fetching sentiment analysis for this event
                </p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
                <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto' }}>
                    <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Error</h2>
                    <p style={{ color: 'var(--text-muted)' }}>{error}</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/')}
                        style={{ marginTop: '2rem' }}
                    >
                        <ArrowLeft size={18} /> Back to Home
                    </button>
                </div>
            </div>
        );
    }

    const totalReviews = reviewData?.total || 0;
    const avgRating = reviewData?.averageRating || 0;
    const sentiment = reviewData?.sentiment || {};
    const reviews = reviewData?.reviews || [];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="container"
            style={{ padding: '2rem 0 6rem' }}
        >
            {/* Back Button */}
            <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate('/')}
                style={{
                    background: 'none',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-main)',
                    padding: '10px 20px',
                    borderRadius: '100px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    marginBottom: '2.5rem',
                    fontFamily: 'inherit',
                    transition: 'all 0.3s',
                }}
                className="btn-back-hover"
            >
                <ArrowLeft size={18} /> Back to Events
            </motion.button>

            {/* Event Header Section */}
            {eventData && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card"
                    style={{ padding: '0', overflow: 'hidden', marginBottom: '3rem' }}
                >
                    {/* Event image/video banner */}
                    {eventData.media_url && (
                        <div style={{ position: 'relative' }}>
                            {eventData.media_type === 'image' ? (
                                <img
                                    src={eventData.media_url}
                                    style={{
                                        width: '100%',
                                        height: '320px',
                                        objectFit: 'cover',
                                        display: 'block',
                                    }}
                                    alt={eventData.title}
                                />
                            ) : (
                                <video
                                    src={eventData.media_url}
                                    style={{
                                        width: '100%',
                                        height: '320px',
                                        objectFit: 'cover',
                                        display: 'block',
                                    }}
                                    muted
                                    autoPlay
                                    loop
                                    playsInline
                                />
                            )}
                            {/* Gradient overlay on the image */}
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: '120px',
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                                }}
                            />
                        </div>
                    )}

                    <div style={{ padding: '2rem 2.5rem' }}>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                            <span
                                style={{
                                    fontSize: '0.7rem',
                                    fontWeight: '800',
                                    background: 'var(--accent-green)',
                                    color: 'white',
                                    padding: '5px 14px',
                                    borderRadius: '6px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                }}
                            >
                                {eventData.type}
                            </span>
                            {eventData.event_date && (
                                <span
                                    style={{
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        color: 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    <Calendar size={14} />
                                    {new Date(eventData.event_date).toLocaleDateString(undefined, {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </span>
                            )}
                            {eventData.event_time && (
                                <span
                                    style={{
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        color: 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    <Clock size={14} />
                                    {eventData.event_time}
                                </span>
                            )}
                        </div>
                        <h1
                            style={{
                                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                                fontWeight: '900',
                                marginBottom: '1rem',
                                lineHeight: '1.2',
                            }}
                        >
                            {eventData.title}
                        </h1>
                        <p
                            style={{
                                color: 'var(--text-muted)',
                                fontSize: '1.05rem',
                                lineHeight: '1.7',
                                maxWidth: '800px',
                            }}
                        >
                            {eventData.description}
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Overall Review Summary Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{ marginBottom: '3rem' }}
            >
                <h2
                    style={{
                        fontSize: '1.8rem',
                        fontWeight: '800',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}
                >
                    <Sparkles size={24} color="var(--accent-green)" />
                    Overall Review Summary
                </h2>

                {totalReviews === 0 ? (
                    /* No reviews yet */
                    <div
                        className="glass-card"
                        style={{ textAlign: 'center', padding: '4rem' }}
                    >
                        <MessageSquare
                            size={48}
                            style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '1.5rem' }}
                        />
                        <h3
                            style={{
                                color: 'var(--text-main)',
                                marginBottom: '0.5rem',
                            }}
                        >
                            No Reviews Yet
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                            Be the first to share your experience for this event!
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() =>
                                navigate(
                                    `/submit?event=${encodeURIComponent(decodedEventName)}`
                                )
                            }
                            style={{ marginTop: '2rem' }}
                        >
                            Write a Review
                        </button>
                    </div>
                ) : (
                    /* Summary stats cards */
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1.5rem',
                        }}
                    >
                        {/* Total Reviews */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="glass-card"
                            style={{ padding: '1.5rem', textAlign: 'center' }}
                        >
                            <Users size={24} color="var(--accent-green)" style={{ marginBottom: '0.8rem' }} />
                            <div
                                style={{
                                    fontSize: '2.5rem',
                                    fontWeight: '900',
                                    fontFamily: 'Outfit',
                                    color: 'var(--accent-green)',
                                }}
                            >
                                {totalReviews}
                            </div>
                            <div
                                style={{
                                    fontSize: '0.8rem',
                                    fontWeight: '700',
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Total Reviews
                            </div>
                        </motion.div>

                        {/* Average Rating */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.35 }}
                            className="glass-card"
                            style={{ padding: '1.5rem', textAlign: 'center' }}
                        >
                            <Star size={24} color="#f59e0b" style={{ marginBottom: '0.8rem' }} />
                            <div
                                style={{
                                    fontSize: '2.5rem',
                                    fontWeight: '900',
                                    fontFamily: 'Outfit',
                                    color: '#f59e0b',
                                }}
                            >
                                {avgRating}
                            </div>
                            <div
                                style={{
                                    fontSize: '0.8rem',
                                    fontWeight: '700',
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Avg Rating
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '8px' }}>
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                        key={s}
                                        size={16}
                                        fill={s <= Math.round(avgRating) ? '#f59e0b' : 'none'}
                                        stroke={s <= Math.round(avgRating) ? '#f59e0b' : '#4a5568'}
                                    />
                                ))}
                            </div>
                        </motion.div>

                        {/* Positive */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                            className="glass-card"
                            style={{ padding: '1.5rem', textAlign: 'center' }}
                        >
                            <TrendingUp size={24} color="#10b981" style={{ marginBottom: '0.8rem' }} />
                            <div
                                style={{
                                    fontSize: '2.5rem',
                                    fontWeight: '900',
                                    fontFamily: 'Outfit',
                                    color: '#10b981',
                                }}
                            >
                                {sentiment.positive}%
                            </div>
                            <div
                                style={{
                                    fontSize: '0.8rem',
                                    fontWeight: '700',
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Positive
                            </div>
                        </motion.div>

                        {/* Negative */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.45 }}
                            className="glass-card"
                            style={{ padding: '1.5rem', textAlign: 'center' }}
                        >
                            <TrendingDown size={24} color="#ef4444" style={{ marginBottom: '0.8rem' }} />
                            <div
                                style={{
                                    fontSize: '2.5rem',
                                    fontWeight: '900',
                                    fontFamily: 'Outfit',
                                    color: '#ef4444',
                                }}
                            >
                                {sentiment.negative}%
                            </div>
                            <div
                                style={{
                                    fontSize: '0.8rem',
                                    fontWeight: '700',
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Negative
                            </div>
                        </motion.div>

                        {/* Neutral */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 }}
                            className="glass-card"
                            style={{ padding: '1.5rem', textAlign: 'center' }}
                        >
                            <Minus size={24} color="#f59e0b" style={{ marginBottom: '0.8rem' }} />
                            <div
                                style={{
                                    fontSize: '2.5rem',
                                    fontWeight: '900',
                                    fontFamily: 'Outfit',
                                    color: '#f59e0b',
                                }}
                            >
                                {sentiment.neutral}%
                            </div>
                            <div
                                style={{
                                    fontSize: '0.8rem',
                                    fontWeight: '700',
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Neutral
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Sentiment Bar (visual progress bar) */}
                {totalReviews > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 }}
                        className="glass-card"
                        style={{ padding: '1.5rem', marginTop: '1.5rem' }}
                    >
                        <p style={{ fontWeight: '700', marginBottom: '1rem', fontSize: '0.95rem' }}>
                            Sentiment Distribution
                        </p>
                        <div
                            style={{
                                height: '12px',
                                background: 'rgba(255,255,255,0.08)',
                                borderRadius: '100px',
                                overflow: 'hidden',
                                display: 'flex',
                            }}
                        >
                            <div
                                style={{
                                    width: `${sentiment.positive}%`,
                                    background: 'linear-gradient(90deg, #10b981, #34d399)',
                                    transition: 'width 1s ease',
                                }}
                            />
                            <div
                                style={{
                                    width: `${sentiment.neutral}%`,
                                    background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                                    transition: 'width 1s ease',
                                }}
                            />
                            <div
                                style={{
                                    width: `${sentiment.negative}%`,
                                    background: 'linear-gradient(90deg, #ef4444, #f87171)',
                                    transition: 'width 1s ease',
                                }}
                            />
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginTop: '0.8rem',
                                fontSize: '0.78rem',
                                fontWeight: '600',
                            }}
                        >
                            <span style={{ color: '#10b981' }}>
                                ● Positive ({sentiment.counts?.Positive || 0})
                            </span>
                            <span style={{ color: '#f59e0b' }}>
                                ● Neutral ({sentiment.counts?.Neutral || 0})
                            </span>
                            <span style={{ color: '#ef4444' }}>
                                ● Negative ({sentiment.counts?.Negative || 0})
                            </span>
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* Individual Student Reviews Section */}
            {totalReviews > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <h2
                        style={{
                            fontSize: '1.8rem',
                            fontWeight: '800',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                        }}
                    >
                        <MessageSquare size={24} color="var(--accent-green)" />
                        Student Reviews ({totalReviews})
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        <AnimatePresence>
                            {reviews.map((review, index) => (
                                <motion.div
                                    key={review.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.65 + index * 0.05 }}
                                    className="glass-card"
                                    style={{
                                        padding: '1.5rem 2rem',
                                        borderLeft: `4px solid ${getSentimentColor(review.sentiment)}`,
                                    }}
                                >
                                    {/* Review header: student info + sentiment */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            marginBottom: '1rem',
                                            flexWrap: 'wrap',
                                            gap: '1rem',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {/* Student avatar */}
                                            <div
                                                style={{
                                                    width: '42px',
                                                    height: '42px',
                                                    borderRadius: '50%',
                                                    background: `linear-gradient(135deg, ${getSentimentColor(review.sentiment)}30, ${getSentimentColor(review.sentiment)}15)`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: getSentimentColor(review.sentiment),
                                                    fontWeight: '800',
                                                    fontSize: '0.9rem',
                                                    border: `1.5px solid ${getSentimentColor(review.sentiment)}40`,
                                                }}
                                            >
                                                {(review.student_name || 'A').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '700', fontSize: '1rem' }}>
                                                    {review.student_name || 'Anonymous'}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '0.78rem',
                                                        color: 'var(--text-muted)',
                                                        fontWeight: '500',
                                                    }}
                                                >
                                                    {review.created_at
                                                        ? new Date(review.created_at).toLocaleDateString(undefined, {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })
                                                        : 'Date unknown'}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            {/* Star rating */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    gap: '3px',
                                                    alignItems: 'center',
                                                    background: 'rgba(245, 158, 11, 0.1)',
                                                    padding: '5px 12px',
                                                    borderRadius: '100px',
                                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                                }}
                                            >
                                                <Star size={14} fill="#f59e0b" stroke="#f59e0b" />
                                                <span
                                                    style={{
                                                        fontSize: '0.85rem',
                                                        fontWeight: '800',
                                                        color: '#f59e0b',
                                                    }}
                                                >
                                                    {review.rating || 'N/A'}
                                                </span>
                                            </div>

                                            {/* Sentiment badge */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '5px 14px',
                                                    borderRadius: '100px',
                                                    fontSize: '0.78rem',
                                                    fontWeight: '800',
                                                    background: `${getSentimentColor(review.sentiment)}15`,
                                                    color: getSentimentColor(review.sentiment),
                                                    border: `1px solid ${getSentimentColor(review.sentiment)}30`,
                                                }}
                                            >
                                                {getSentimentIcon(review.sentiment)}
                                                {review.sentiment}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Review text */}
                                    <p
                                        style={{
                                            color: 'var(--text-main)',
                                            fontSize: '0.95rem',
                                            lineHeight: '1.8',
                                            opacity: 0.9,
                                        }}
                                    >
                                        "{review.description}"
                                    </p>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default EventReviews;

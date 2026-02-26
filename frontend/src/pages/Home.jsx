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
import { motion } from 'framer-motion';
// Import icons — Eye is used for the "Check Review" button
import { MessageSquare, BarChart3, ShieldCheck, Sparkles, ArrowRight, Activity, Zap, Eye, ChevronDown } from 'lucide-react';

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
                    {event.media_url && (
                        <div style={{ overflow: 'hidden' }}>
                            {event.media_type === 'image' ? (
                                <img
                                    src={event.media_url}
                                    className="event-image"
                                    style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
                                    alt={event.title}
                                />
                            ) : (
                                <video
                                    src={event.media_url}
                                    className="event-image"
                                    style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
                                    muted autoPlay loop playsInline
                                />
                            )}
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

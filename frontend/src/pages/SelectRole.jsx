import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Briefcase, ChevronRight } from 'lucide-react';

const SelectRole = () => {
    return (
        <div className="container" style={{ padding: '6rem 0' }}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card"
                style={{
                    maxWidth: '800px',
                    margin: '0 auto',
                    padding: '4rem 3rem',
                    textAlign: 'center',
                }}
            >
                <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                    Welcome to CampusPulse
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '4rem' }}>
                    Please select your portal to continue
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    {/* Student Portal */}
                    <Link to="/auth/student/login" style={{ textDecoration: 'none' }}>
                        <motion.div
                            whileHover={{ scale: 1.02, y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            className="glass-card"
                            style={{
                                padding: '3rem 2rem',
                                border: '1px solid var(--glass-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '1.5rem',
                                background: 'rgba(66, 133, 244, 0.05)',
                                height: '100%',
                            }}
                        >
                            <div style={{
                                width: '80px',
                                height: '80px',
                                background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.2), rgba(52, 168, 83, 0.2))',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <GraduationCap size={40} color="var(--g-blue)" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.4rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                    🎓 Student Login
                                </h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                                    Access your dashboard, submit reviews, and view events.
                                </p>
                            </div>
                            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', color: 'var(--g-blue)', fontWeight: '600', gap: '5px' }}>
                                Enter Portal <ChevronRight size={18} />
                            </div>
                        </motion.div>
                    </Link>

                    {/* Faculty Portal */}
                    <Link to="/auth/faculty/login" style={{ textDecoration: 'none' }}>
                        <motion.div
                            whileHover={{ scale: 1.02, y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            className="glass-card"
                            style={{
                                padding: '3rem 2rem',
                                border: '1px solid var(--glass-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '1.5rem',
                                background: 'rgba(139, 92, 246, 0.05)',
                                height: '100%',
                            }}
                        >
                            <div style={{
                                width: '80px',
                                height: '80px',
                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(244, 63, 94, 0.2))',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <Briefcase size={40} color="var(--primary)" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.4rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                    👨‍🏫 Faculty Login
                                </h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                                    Manage events, view analytics, and respond to feedback.
                                </p>
                            </div>
                            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', color: 'var(--primary)', fontWeight: '600', gap: '5px' }}>
                                Enter Portal <ChevronRight size={18} />
                            </div>
                        </motion.div>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default SelectRole;

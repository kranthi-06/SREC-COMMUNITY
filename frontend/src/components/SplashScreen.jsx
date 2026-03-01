import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';

const SplashScreen = ({ onComplete }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(() => onComplete?.(), 600);
        }, 2400);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 999999,
                        background: 'linear-gradient(135deg, #0a0f1c 0%, #0f172a 40%, #1a1040 100%)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden'
                    }}
                >
                    {/* Animated background particles */}
                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{
                                    opacity: 0,
                                    x: Math.random() * 400 - 200,
                                    y: Math.random() * 800 - 400,
                                    scale: Math.random() * 0.5 + 0.3
                                }}
                                animate={{
                                    opacity: [0, 0.3, 0],
                                    y: [0, -100 - Math.random() * 200],
                                }}
                                transition={{
                                    duration: 2 + Math.random() * 2,
                                    delay: Math.random() * 1.5,
                                    repeat: 0
                                }}
                                style={{
                                    position: 'absolute',
                                    left: `${10 + Math.random() * 80}%`,
                                    top: `${20 + Math.random() * 60}%`,
                                    width: 4 + Math.random() * 6,
                                    height: 4 + Math.random() * 6,
                                    borderRadius: '50%',
                                    background: i % 3 === 0
                                        ? 'rgba(34, 197, 94, 0.6)'
                                        : i % 3 === 1
                                            ? 'rgba(37, 99, 235, 0.6)'
                                            : 'rgba(168, 85, 247, 0.4)',
                                }}
                            />
                        ))}
                    </div>

                    {/* Glowing ring behind logo */}
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            position: 'relative',
                            width: 120, height: 120,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        {/* Outer pulse ring */}
                        <motion.div
                            animate={{ scale: [1, 1.6, 1.6], opacity: [0.5, 0, 0] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                            style={{
                                position: 'absolute', inset: -10,
                                borderRadius: '50%',
                                border: '2px solid rgba(34, 197, 94, 0.4)',
                            }}
                        />
                        {/* Inner glow */}
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{
                                position: 'absolute', inset: 0,
                                borderRadius: '24px',
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(37, 99, 235, 0.15))',
                                boxShadow: '0 0 60px rgba(34, 197, 94, 0.2), 0 0 120px rgba(37, 99, 235, 0.1)',
                            }}
                        />
                        {/* Logo container */}
                        <motion.div
                            initial={{ rotateY: 90 }}
                            animate={{ rotateY: 0 }}
                            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                                width: 90, height: 90, borderRadius: '22px',
                                background: 'linear-gradient(145deg, #0f172a, #1e293b)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                                position: 'relative', zIndex: 2
                            }}
                        >
                            {/* ECG Line Animation */}
                            <motion.div
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                style={{ position: 'relative' }}
                            >
                                <Activity size={42} color="#22c55e" strokeWidth={2.5} />
                            </motion.div>
                        </motion.div>
                    </motion.div>

                    {/* App name */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
                        style={{
                            marginTop: 30,
                            textAlign: 'center'
                        }}
                    >
                        <h1 style={{
                            fontSize: '2.2rem',
                            fontWeight: 800,
                            margin: 0,
                            background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.02em',
                            fontFamily: "'Inter', 'Segoe UI', sans-serif"
                        }}>
                            Campus<span style={{
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>Pulse</span>
                        </h1>
                    </motion.div>

                    {/* Tagline */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 1.0 }}
                        style={{
                            color: 'rgba(148, 163, 184, 0.7)',
                            fontSize: '0.85rem',
                            marginTop: 10,
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            fontWeight: 500
                        }}
                    >
                        SREC Campus Intelligence
                    </motion.p>

                    {/* Loading bar */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2 }}
                        style={{
                            position: 'absolute',
                            bottom: 80,
                            width: 140, height: 3,
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.05)',
                            overflow: 'hidden'
                        }}
                    >
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: '200%' }}
                            transition={{ duration: 1.2, delay: 1.2, ease: 'easeInOut' }}
                            style={{
                                width: '60%', height: '100%',
                                borderRadius: 10,
                                background: 'linear-gradient(90deg, transparent, #22c55e, transparent)',
                            }}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SplashScreen;

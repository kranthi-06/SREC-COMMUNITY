import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Activity, GraduationCap, Briefcase } from 'lucide-react';

const Login = ({ routeType }) => {
    const isStudent = routeType === 'student';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email.trim()) {
            setError('Please enter your email address');
            return;
        }

        const normalizedEmail = email.toLowerCase().trim();

        if (isStudent) {
            const studentPattern = /^[a-z0-9]+@srecnandyal\.edu\.in$/;
            if (!studentPattern.test(normalizedEmail)) {
                setError('Invalid student email format. Must be alphanumeric (e.g., 23x91a0501@srecnandyal.edu.in)');
                return;
            }
        } else {
            const principalPattern = /^(principal@srecnandyal\.edu\.in|principal\.srec\.x5@gmail\.com)$/;
            const hodPattern = /^hod\.([a-z]+)@srecnandyal\.edu\.in$/;
            const facultyPattern = /^[a-z]+\.[a-z]+@srecnandyal\.edu\.in$/;

            if (
                !principalPattern.test(normalizedEmail) &&
                !hodPattern.test(normalizedEmail) &&
                !facultyPattern.test(normalizedEmail)
            ) {
                setError('Invalid faculty email format. Use firstname.lastname@srecnandyal.edu.in or hod.dept@...');
                return;
            }
        }

        if (!password) {
            setError('Please enter your password');
            return;
        }

        setIsLoading(true);
        try {
            await login(routeType, normalizedEmail, password);
            navigate('/');
        } catch (err) {
            const serverError = err.response?.data?.error;
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError(serverError || 'Invalid email, password, or role. Please try again.');
            } else if (err.response?.status === 404) {
                setError('Account not found. Please register first.');
            } else if (err.code === 'ERR_NETWORK') {
                setError('Unable to connect to server. Please check your connection.');
            } else {
                setError(serverError || 'Login failed. Please try again later.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container" style={{ padding: '4rem 0 6rem' }}>
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card auth-card"
                style={{
                    maxWidth: '480px',
                    margin: '0 auto',
                    padding: '3rem',
                    borderTop: `3px solid ${isStudent ? 'var(--g-blue)' : 'var(--primary)'}`
                }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 12 }}
                        style={{
                            width: '76px',
                            height: '76px',
                            background: isStudent
                                ? 'linear-gradient(135deg, rgba(66, 133, 244, 0.15), rgba(52, 168, 83, 0.15))'
                                : 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(244, 63, 94, 0.15))',
                            borderRadius: '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.8rem',
                            border: `1px solid ${isStudent ? 'rgba(66, 133, 244, 0.2)' : 'rgba(139, 92, 246, 0.2)'}`,
                        }}
                    >
                        {isStudent ? <GraduationCap size={34} style={{ color: 'var(--g-blue)' }} /> : <Briefcase size={34} style={{ color: 'var(--primary)' }} />}
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="gradient-text"
                        style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}
                    >
                        {isStudent ? 'Student Login' : 'Faculty Login'}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        style={{ color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.95rem' }}
                    >
                        {isStudent ? 'Sign in to access student features' : 'Sign in to access administrative hub'}
                    </motion.p>
                </div>

                {/* Error Alert */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="alert alert-error"
                        >
                            <AlertCircle size={18} style={{ flexShrink: 0 }} />
                            <span>{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {/* Email */}
                    <div className="form-group">
                        <label className="form-label">
                            {isStudent ? 'Student Email' : 'Faculty Email'}
                        </label>
                        <div className="form-input-wrapper">
                            <input
                                id="login-email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                placeholder={isStudent ? "23x91a0501@srecnandyal.edu.in" : "firstname.lastname@srecnandyal.edu.in"}
                                autoComplete="email"
                                style={{ paddingLeft: '3.2rem' }}
                            />
                            <Mail size={18} className="input-icon" />
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                            {isStudent ? 'Use your official SREC student email' : 'Use official SREC faculty email'}
                        </p>
                    </div>

                    {/* Password */}
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label className="form-label">
                            Password
                        </label>
                        <div className="form-input-wrapper">
                            <input
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                style={{ paddingLeft: '3.2rem', paddingRight: '3rem' }}
                            />
                            <Lock size={18} className="input-icon" />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Forgot Password hint */}
                    <div style={{ textAlign: 'right', marginBottom: '2rem' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: '600' }}>
                            Forgot password?
                        </span>
                    </div>

                    {/* Submit */}
                    <motion.button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isLoading}
                        whileTap={{ scale: 0.97 }}
                        style={{
                            width: '100%',
                            padding: '16px',
                            fontSize: '1.05rem',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {isLoading ? (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                style={{ width: 22, height: 22, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', margin: '0 auto' }}
                            />
                        ) : (
                            <>
                                Sign In <ArrowRight size={20} />
                            </>
                        )}
                    </motion.button>
                </form>

                {/* Divider */}
                <div className="auth-divider" style={{ marginTop: '2.5rem' }}>
                    <span>New to this Portal?</span>
                </div>

                {/* Register Link */}
                <Link
                    to={`/auth/${routeType}/register`}
                    className="btn btn-secondary"
                    style={{
                        width: '100%',
                        padding: '14px',
                        fontSize: '0.95rem',
                        textAlign: 'center',
                        justifyContent: 'center',
                    }}
                >
                    Create an Account
                </Link>
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <Link to="/auth/select-role" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }}>Change Role</Link>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;

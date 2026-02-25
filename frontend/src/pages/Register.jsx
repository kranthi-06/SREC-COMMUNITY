import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, Shield, KeyRound, GraduationCap, Briefcase } from 'lucide-react';

const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' };
    if (score <= 2) return { score: 2, label: 'Fair', color: '#f59e0b' };
    if (score <= 3) return { score: 3, label: 'Good', color: '#3b82f6' };
    if (score <= 4) return { score: 4, label: 'Strong', color: '#22c55e' };
    return { score: 5, label: 'Excellent', color: '#10b981' };
};

const Register = ({ routeType }) => {
    const isStudent = routeType === 'student';
    const [step, setStep] = useState('details'); // 'details' | 'otp'
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { register, verifyOTP } = useAuth();
    const navigate = useNavigate();

    const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

    const handleDetailsSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
            setError('Please fill out all fields.');
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

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }
        if (passwordStrength.score < 2) {
            setError('Password is too weak. Add uppercase, numbers or symbols');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match. Please re-enter');
            return;
        }

        setIsLoading(true);
        try {
            await register(routeType, fullName.trim(), normalizedEmail, password, confirmPassword);
            setSuccess('OTP dispatched to your official email. Please verify.');
            setTimeout(() => {
                setSuccess('');
                setStep('otp');
            }, 2000);
        } catch (err) {
            const serverError = err.response?.data?.error;
            if (err.response?.status === 409 || (serverError && serverError.toLowerCase().includes('exist'))) {
                setError('An account with this email already exists. Try logging in.');
            } else if (err.code === 'ERR_NETWORK') {
                setError('Unable to connect to server. Please check your connection.');
            } else {
                setError(serverError || 'Registration failed. Please try again later.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleOTPSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!otp || otp.length < 6) {
            setError('Please enter the 6-digit valid OTP.');
            return;
        }

        setIsLoading(true);
        try {
            await verifyOTP(routeType, email, otp);
            setSuccess('Identity verified! Redirecting to Dashboard...');
            setTimeout(() => {
                setStep('redirecting');
                setTimeout(() => navigate('/'), 2000);
            }, 1000);
        } catch (err) {
            const serverError = err.response?.data?.error;
            setError(serverError || 'OTP Verification failed. Please ensure the code is correct.');
            setIsLoading(false);
        }
    };

    return (
        <div className="container" style={{ padding: '3rem 0 6rem' }}>
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card auth-card"
                style={{
                    maxWidth: '520px',
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
                        {step === 'details' ? (
                            isStudent ? <GraduationCap size={34} style={{ color: 'var(--g-blue)' }} /> : <Briefcase size={34} style={{ color: 'var(--primary)' }} />
                        ) : (
                            <KeyRound size={34} style={{ color: isStudent ? 'var(--g-blue)' : 'var(--primary)' }} />
                        )}
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="gradient-text"
                        style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}
                    >
                        {step === 'details' ? (isStudent ? 'Student Registration' : 'Faculty Registration') : step === 'otp' ? 'Verify Identity' : 'Redirecting...'}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        style={{ color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.95rem' }}
                    >
                        {step === 'details'
                            ? (isStudent
                                ? 'Use your official SREC student email\nExample: 23x91a0501@srecnandyal.edu.in'
                                : 'Use official SREC faculty email\nExample: gayathri.bs@srecnandyal.edu.in')
                            : step === 'otp' ? `An OTP has been sent to ${email}` : 'Securely signing you in...'}
                    </motion.p>
                </div>

                {/* Alerts */}
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
                <AnimatePresence>
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="alert alert-success"
                        >
                            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                            <span>{success}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Forms */}
                <AnimatePresence mode="wait">
                    {step === 'details' ? (
                        <motion.form
                            key="details"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={handleDetailsSubmit}
                        >
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <div className="form-input-wrapper">
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="John Doe"
                                        style={{ paddingLeft: '3.2rem' }}
                                    />
                                    <User size={18} className="input-icon" />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">{isStudent ? 'Student Email' : 'Faculty Email'}</label>
                                <div className="form-input-wrapper">
                                    <input
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
                            </div>

                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <div className="form-input-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                        placeholder="Min. 8 characters"
                                        autoComplete="new-password"
                                        style={{ paddingLeft: '3.2rem', paddingRight: '3rem' }}
                                    />
                                    <Lock size={18} className="input-icon" />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {password && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="password-strength"
                                    >
                                        <div className="strength-bar-bg">
                                            <div
                                                className="strength-bar-fill"
                                                style={{
                                                    width: `${(passwordStrength.score / 5) * 100}%`,
                                                    background: passwordStrength.color,
                                                }}
                                            />
                                        </div>
                                        <p className="strength-label" style={{ color: passwordStrength.color }}>
                                            {passwordStrength.label}
                                        </p>
                                    </motion.div>
                                )}
                            </div>

                            <div className="form-group" style={{ marginBottom: "2rem" }}>
                                <label className="form-label">Confirm Password</label>
                                <div className="form-input-wrapper">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                                        placeholder="Re-enter your password"
                                        autoComplete="new-password"
                                        style={{
                                            paddingLeft: '3.2rem',
                                            paddingRight: '3rem',
                                            borderColor: confirmPassword && password !== confirmPassword
                                                ? 'var(--danger)'
                                                : confirmPassword && password === confirmPassword
                                                    ? 'var(--success)'
                                                    : undefined
                                        }}
                                    />
                                    <Lock size={18} className="input-icon" />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {confirmPassword && password !== confirmPassword && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '6px', fontWeight: '600' }}
                                    >
                                        Passwords do not match
                                    </motion.p>
                                )}
                                {confirmPassword && password === confirmPassword && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        style={{ color: 'var(--success)', fontSize: '0.78rem', marginTop: '6px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <CheckCircle2 size={13} /> Passwords match
                                    </motion.p>
                                )}
                            </div>

                            <motion.button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isLoading}
                                whileTap={{ scale: 0.97 }}
                                style={{ width: '100%', padding: '16px', fontSize: '1.05rem' }}
                            >
                                {isLoading ? (
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ width: 22, height: 22, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', margin: '0 auto' }} />
                                ) : (
                                    <>Initiate Verification <ArrowRight size={20} /></>
                                )}
                            </motion.button>
                        </motion.form>
                    ) : step === 'otp' ? (
                        <motion.form
                            key="otp"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={handleOTPSubmit}
                        >
                            <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                                <label className="form-label">One Time Password</label>
                                <div className="form-input-wrapper">
                                    <input
                                        type="text"
                                        maxLength="6"
                                        required
                                        value={otp}
                                        onChange={(e) => { setOtp(e.target.value.replace(/[^0-9]/g, '')); setError(''); }}
                                        placeholder="······"
                                        style={{ paddingLeft: '3.2rem', letterSpacing: '0.8rem', textAlign: 'center', fontSize: '1.5rem', fontWeight: '800' }}
                                    />
                                    <KeyRound size={18} className="input-icon" />
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '10px' }}>Enter the 6-digit code sent to your email. It expires in 5 minutes.</p>
                            </div>

                            <motion.button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isLoading}
                                whileTap={{ scale: 0.97 }}
                                style={{ width: '100%', padding: '16px', fontSize: '1.05rem' }}
                            >
                                {isLoading ? (
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ width: 22, height: 22, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', margin: '0 auto' }} />
                                ) : (
                                    <>Confirm Identity <CheckCircle2 size={20} /></>
                                )}
                            </motion.button>
                            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                <span onClick={() => { setStep('details'); setOtp(''); setSuccess(''); setError(''); }} style={{ fontSize: '0.85rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}>← Go Back</span>
                            </div>
                        </motion.form>
                    ) : (
                        <motion.div
                            key="redirecting"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{ textAlign: 'center', padding: '3rem 0' }}
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                                style={{ width: 50, height: 50, border: '4px solid rgba(139, 92, 246, 0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1.5rem' }}
                            />
                            <h3 style={{ color: 'var(--text-main)', fontSize: '1.2rem' }}>Preparing your dashboard...</h3>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Login Link */}
                <div className="auth-divider" style={{ marginTop: '2.5rem' }}>
                    <span>Already Verified?</span>
                </div>

                <p className="auth-footer" style={{ marginTop: 0 }}>
                    <Link to={`/auth/${routeType}/login`}>Sign in to your account →</Link>
                </p>
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <Link to="/auth/select-role" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }}>Change Role</Link>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;

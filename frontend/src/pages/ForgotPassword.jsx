import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft, KeyRound, ShieldCheck, CheckCircle2, GraduationCap, Briefcase } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const ForgotPassword = ({ routeType }) => {
    const isStudent = routeType === 'student';
    const navigate = useNavigate();

    // Steps: 1 = enter email, 2 = enter OTP, 3 = set new password, 4 = success
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const otpRefs = useRef([]);

    // Countdown timer for resend OTP
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // ===== STEP 1: Send OTP =====
    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const normalizedEmail = email.toLowerCase().trim();

        if (!normalizedEmail) {
            setError('Please enter your email address.');
            return;
        }

        if (!normalizedEmail.endsWith('@srecnandyal.edu.in')) {
            setError('Please enter a valid @srecnandyal.edu.in email.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await axios.post(`${API_URL}/auth/forgot-password`, { email: normalizedEmail });
            setSuccess('OTP sent to your email! Check your inbox (or spam folder).');
            setStep(2);
            setCountdown(60);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // ===== STEP 2: Verify OTP =====
    const handleOTPChange = (index, value) => {
        if (!/^\d?$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError('');

        // Auto-focus next
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOTPKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOTPPaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtp = [...otp];
        for (let i = 0; i < 6; i++) {
            newOtp[i] = pasted[i] || '';
        }
        setOtp(newOtp);
        if (pasted.length >= 6) {
            otpRefs.current[5]?.focus();
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setError('Please enter the complete 6-digit OTP.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await axios.post(`${API_URL}/auth/verify-forgot-otp`, {
                email: email.toLowerCase().trim(),
                otp: otpString
            });
            setResetToken(res.data.resetToken);
            setSuccess('OTP verified! Set your new password.');
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Resend OTP
    const handleResendOTP = async () => {
        if (countdown > 0) return;
        setError('');
        setSuccess('');
        setIsLoading(true);
        try {
            await axios.post(`${API_URL}/auth/forgot-password`, { email: email.toLowerCase().trim() });
            setSuccess('New OTP sent! Check your email.');
            setOtp(['', '', '', '', '', '']);
            setCountdown(60);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to resend OTP.');
        } finally {
            setIsLoading(false);
        }
    };

    // ===== STEP 3: Reset Password =====
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!newPassword || !confirmPassword) {
            setError('Please fill in both password fields.');
            return;
        }
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            await axios.post(`${API_URL}/auth/reset-password`, {
                email: email.toLowerCase().trim(),
                resetToken,
                newPassword,
                confirmPassword
            });
            setStep(4);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Step indicator
    const StepIndicator = () => (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '2rem' }}>
            {[1, 2, 3].map((s) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.8rem', fontWeight: '700',
                        background: step >= s
                            ? (isStudent ? 'linear-gradient(135deg, var(--g-blue), var(--g-green))' : 'linear-gradient(135deg, var(--primary), var(--accent-rose))')
                            : 'var(--glass-bg)',
                        color: step >= s ? 'white' : 'var(--text-muted)',
                        border: step >= s ? 'none' : '1px solid var(--glass-border)',
                        transition: 'all 0.3s ease'
                    }}>
                        {step > s ? '✓' : s}
                    </div>
                    {s < 3 && (
                        <div style={{
                            width: '40px', height: '2px',
                            background: step > s
                                ? (isStudent ? 'var(--g-blue)' : 'var(--primary)')
                                : 'var(--glass-border)',
                            transition: 'all 0.3s ease'
                        }} />
                    )}
                </div>
            ))}
        </div>
    );

    // Loading spinner
    const Spinner = () => (
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            style={{ width: 22, height: 22, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', margin: '0 auto' }}
        />
    );

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
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 12 }}
                        style={{
                            width: '76px', height: '76px',
                            background: step === 4
                                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))'
                                : isStudent
                                    ? 'linear-gradient(135deg, rgba(66, 133, 244, 0.15), rgba(52, 168, 83, 0.15))'
                                    : 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(244, 63, 94, 0.15))',
                            borderRadius: '22px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.8rem',
                            border: `1px solid ${step === 4 ? 'rgba(34, 197, 94, 0.2)' : isStudent ? 'rgba(66, 133, 244, 0.2)' : 'rgba(139, 92, 246, 0.2)'}`,
                        }}
                    >
                        {step === 1 && <KeyRound size={34} style={{ color: isStudent ? 'var(--g-blue)' : 'var(--primary)' }} />}
                        {step === 2 && <ShieldCheck size={34} style={{ color: isStudent ? 'var(--g-blue)' : 'var(--primary)' }} />}
                        {step === 3 && <Lock size={34} style={{ color: isStudent ? 'var(--g-blue)' : 'var(--primary)' }} />}
                        {step === 4 && <CheckCircle2 size={34} style={{ color: '#22c55e' }} />}
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="gradient-text"
                        style={{ fontSize: '2rem', marginBottom: '0.5rem' }}
                    >
                        {step === 1 && 'Forgot Password'}
                        {step === 2 && 'Verify OTP'}
                        {step === 3 && 'New Password'}
                        {step === 4 && 'Password Reset!'}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        style={{ color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.9rem' }}
                    >
                        {step === 1 && 'Enter your email to receive a verification code'}
                        {step === 2 && `Enter the 6-digit code sent to ${email}`}
                        {step === 3 && 'Create a strong new password'}
                        {step === 4 && 'Your password has been updated successfully'}
                    </motion.p>
                </div>

                {step < 4 && <StepIndicator />}

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

                {/* Success Alert */}
                <AnimatePresence>
                    {success && step !== 4 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="alert"
                            style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#22c55e' }}
                        >
                            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                            <span>{success}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {/* ===== STEP 1: Enter Email ===== */}
                    {step === 1 && (
                        <motion.form
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            onSubmit={handleSendOTP}
                        >
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <div className="form-input-wrapper">
                                    <input
                                        id="forgot-email"
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
                                    We'll send a 6-digit OTP to this email
                                </p>
                            </div>

                            <motion.button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isLoading}
                                whileTap={{ scale: 0.97 }}
                                style={{ width: '100%', padding: '16px', fontSize: '1.05rem', position: 'relative', overflow: 'hidden', marginTop: '0.5rem' }}
                            >
                                {isLoading ? <Spinner /> : (<>Send OTP <ArrowRight size={20} /></>)}
                            </motion.button>
                        </motion.form>
                    )}

                    {/* ===== STEP 2: Enter OTP ===== */}
                    {step === 2 && (
                        <motion.form
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            onSubmit={handleVerifyOTP}
                        >
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label" style={{ textAlign: 'center', display: 'block' }}>Enter Verification Code</label>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', margin: '1rem 0' }} onPaste={handleOTPPaste}>
                                    {otp.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            ref={(el) => (otpRefs.current[idx] = el)}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOTPChange(idx, e.target.value)}
                                            onKeyDown={(e) => handleOTPKeyDown(idx, e)}
                                            style={{
                                                width: '52px', height: '58px',
                                                textAlign: 'center', fontSize: '1.5rem', fontWeight: '800',
                                                borderRadius: '14px',
                                                border: digit ? `2px solid ${isStudent ? 'var(--g-blue)' : 'var(--primary)'}` : '1px solid var(--glass-border)',
                                                background: 'var(--glass-bg)',
                                                color: 'var(--text-primary)',
                                                outline: 'none',
                                                transition: 'all 0.2s ease',
                                                caretColor: isStudent ? 'var(--g-blue)' : 'var(--primary)',
                                                WebkitTextFillColor: 'var(--text-primary)',
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = isStudent ? 'var(--g-blue)' : 'var(--primary)'}
                                            onBlur={(e) => !digit && (e.target.style.borderColor = 'var(--glass-border)')}
                                        />
                                    ))}
                                </div>
                            </div>

                            <motion.button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isLoading || otp.join('').length !== 6}
                                whileTap={{ scale: 0.97 }}
                                style={{ width: '100%', padding: '16px', fontSize: '1.05rem', position: 'relative', overflow: 'hidden' }}
                            >
                                {isLoading ? <Spinner /> : (<>Verify OTP <ArrowRight size={20} /></>)}
                            </motion.button>

                            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                                {countdown > 0 ? (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        Resend OTP in <span style={{ color: isStudent ? 'var(--g-blue)' : 'var(--primary)', fontWeight: '700' }}>{countdown}s</span>
                                    </p>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleResendOTP}
                                        disabled={isLoading}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: isStudent ? 'var(--g-blue)' : 'var(--primary)',
                                            fontWeight: '600', fontSize: '0.9rem', fontFamily: 'inherit'
                                        }}
                                    >
                                        Resend OTP
                                    </button>
                                )}
                            </div>
                        </motion.form>
                    )}

                    {/* ===== STEP 3: New Password ===== */}
                    {step === 3 && (
                        <motion.form
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            onSubmit={handleResetPassword}
                        >
                            <div className="form-group">
                                <label className="form-label">New Password</label>
                                <div className="form-input-wrapper">
                                    <input
                                        id="new-password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={newPassword}
                                        onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                                        placeholder="Enter new password (min 8 chars)"
                                        autoComplete="new-password"
                                        style={{ paddingLeft: '3.2rem', paddingRight: '3rem' }}
                                    />
                                    <Lock size={18} className="input-icon" />
                                    <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Confirm Password</label>
                                <div className="form-input-wrapper">
                                    <input
                                        id="confirm-password"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                                        placeholder="Re-enter your new password"
                                        autoComplete="new-password"
                                        style={{ paddingLeft: '3.2rem', paddingRight: '3rem' }}
                                    />
                                    <Lock size={18} className="input-icon" />
                                    <button type="button" className="toggle-password" onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1}>
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Password strength hint */}
                            {newPassword && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                                        {[1, 2, 3, 4].map((lvl) => {
                                            const strength = newPassword.length >= 12 ? 4 : newPassword.length >= 10 ? 3 : newPassword.length >= 8 ? 2 : 1;
                                            const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
                                            return (
                                                <div key={lvl} style={{
                                                    flex: 1, height: '4px', borderRadius: '100px',
                                                    background: lvl <= strength ? colors[strength - 1] : 'var(--glass-border)',
                                                    transition: 'all 0.3s ease'
                                                }} />
                                            );
                                        })}
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {newPassword.length < 8 ? 'Too short' : newPassword.length < 10 ? 'Fair' : newPassword.length < 12 ? 'Good' : 'Strong'}
                                        {newPassword && confirmPassword && newPassword === confirmPassword && ' · Passwords match ✓'}
                                        {newPassword && confirmPassword && newPassword !== confirmPassword && ' · Passwords don\'t match ✗'}
                                    </p>
                                </div>
                            )}

                            <motion.button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isLoading}
                                whileTap={{ scale: 0.97 }}
                                style={{ width: '100%', padding: '16px', fontSize: '1.05rem', position: 'relative', overflow: 'hidden' }}
                            >
                                {isLoading ? <Spinner /> : (<>Reset Password <ArrowRight size={20} /></>)}
                            </motion.button>
                        </motion.form>
                    )}

                    {/* ===== STEP 4: Success ===== */}
                    {step === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            style={{ textAlign: 'center' }}
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                                style={{
                                    width: '80px', height: '80px', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 1.5rem'
                                }}
                            >
                                <CheckCircle2 size={40} style={{ color: '#22c55e' }} />
                            </motion.div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2rem' }}>
                                Your password has been changed. You can now log in with your new password.
                            </p>
                            <Link
                                to={`/auth/${routeType}/login`}
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '16px', fontSize: '1.05rem', textAlign: 'center', justifyContent: 'center' }}
                            >
                                Go to Login <ArrowRight size={20} />
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Back to login link */}
                {step < 4 && (
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <Link
                            to={`/auth/${routeType}/login`}
                            style={{
                                fontSize: '0.9rem', color: 'var(--text-muted)',
                                textDecoration: 'none', display: 'inline-flex',
                                alignItems: 'center', gap: '6px', fontWeight: '600'
                            }}
                        >
                            <ArrowLeft size={16} /> Back to Login
                        </Link>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default ForgotPassword;

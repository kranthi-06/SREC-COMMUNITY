import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, CheckCircle2 } from 'lucide-react';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminSecret, setAdminSecret] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.toLowerCase().endsWith('@srecnandyal.edu.in')) {
            setError('Official college email (@srecnandyal.edu.in) required');
            return;
        }
        try {
            await register(email, password, isAdmin ? 'admin' : 'student', adminSecret);
            alert(isAdmin ? 'Admin account created successfully!' : 'Account discovered! Redirecting to login...');
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        }
    };

    return (
        <div className="container" style={{ padding: '6rem 0' }}>
            <div className="bg-blob blob-2"></div>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card"
                style={{ maxWidth: '450px', margin: '0 auto', borderTop: isAdmin ? '4px solid var(--primary)' : '4px solid var(--secondary)' }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: isAdmin ? 'rgba(52, 152, 219, 0.1)' : 'rgba(212, 175, 55, 0.1)',
                        borderRadius: '100px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        color: isAdmin ? 'var(--primary)' : 'var(--secondary)'
                    }}>
                        <UserPlus size={32} />
                    </div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{isAdmin ? 'Admin Register' : 'Create Account'}</h2>
                    <p style={{ color: 'var(--text-muted)' }}>{isAdmin ? 'Register with secure access key' : 'Join the SREC sentiment network'}</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                            background: 'rgba(231, 76, 60, 0.1)',
                            color: '#e74c3c',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '1.5rem',
                            fontSize: '0.85rem',
                            textAlign: 'center',
                            fontWeight: '600'
                        }}
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Mail size={14} /> {isAdmin ? 'Admin Email ID' : 'Student Email ID'}
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@srecnandyal.edu.in"
                        />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Lock size={14} /> Password
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min. 8 characters"
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            type="checkbox"
                            id="adminToggle"
                            checked={isAdmin}
                            onChange={(e) => setIsAdmin(e.target.checked)}
                            style={{ width: 'auto' }}
                        />
                        <label htmlFor="adminToggle" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Register as Administrator</label>
                    </div>

                    {isAdmin && (
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Lock size={14} /> Admin Secret Key
                            </label>
                            <input
                                type="password"
                                required
                                value={adminSecret}
                                onChange={(e) => setAdminSecret(e.target.value)}
                                placeholder="Enter secure registration key"
                                style={{ border: '2px solid var(--primary)' }}
                            />
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '15px' }}>
                        {isAdmin ? 'Create Admin Account' : 'Register Now'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                    Already part of the community? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>Log In</Link>
                </p>
            </motion.div>
        </div>
    );
};

export default Register;

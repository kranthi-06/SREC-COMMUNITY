import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, ShieldCheck, MapPin, Edit3, Save, X, Briefcase, Hash, BadgeCheck } from 'lucide-react';
import ProfileRing from '../components/ProfileRing';

const Profile = () => {
    const { user, setUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ full_name: '', phone_number: '' });
    const [status, setStatus] = useState({ type: '', message: '' });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/profile`);
                setProfile(res.data);
                setFormData({
                    full_name: res.data.full_name || '',
                    phone_number: res.data.phone_number || ''
                });
            } catch (err) {
                console.error("Failed to fetch profile");
                setStatus({ type: 'error', message: 'Could not load profile data.' });
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });

        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/profile`, formData);
            setStatus({ type: 'success', message: 'Profile updated successfully!' });
            setProfile({ ...profile, full_name: formData.full_name, phone_number: formData.phone_number });
            if (user && formData.full_name !== user.fullName) {
                const updatedUser = { ...user, fullName: formData.full_name };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
            }
            setIsEditing(false);
        } catch (err) {
            setStatus({ type: 'error', message: err.response?.data?.error || 'Update failed' });
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '4rem 0' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 40, height: 40, border: '4px solid var(--accent-green)', borderTopColor: 'transparent', borderRadius: '50%' }} />
        </div>
    );

    if (!profile) return null;

    return (
        <div className="container" style={{ padding: '4rem 0' }}>
            <div
                className="glass-card"
                style={{ maxWidth: '700px', margin: '0 auto', overflow: 'hidden' }}
            >
                {/* Header Section */}
                <div className="profile-header" style={{
                    padding: '3rem',
                    background: profile.role === 'student'
                        ? 'linear-gradient(135deg, rgba(66, 133, 244, 0.1), rgba(0,0,0,0.5))'
                        : 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(0,0,0,0.5))',
                    borderBottom: '1px solid var(--glass-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2rem'
                }}>
                    <ProfileRing role={profile.role} size={100}>
                        <div style={{
                            width: '100px', height: '100px',
                            background: 'linear-gradient(135deg, var(--accent-green), var(--accent-olive))',
                            color: 'white',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '2.5rem', fontWeight: '800',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            flexShrink: 0
                        }}>
                            {(profile.full_name || profile.email).charAt(0).toUpperCase()}
                        </div>
                    </ProfileRing>
                    <div className="profile-header-info" style={{ minWidth: 0, overflow: 'hidden' }}>
                        <h2 className="profile-name" style={{ fontSize: '2.2rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {profile.full_name}
                            {profile.is_verified && <BadgeCheck size={28} color="var(--accent-green)" />}
                        </h2>
                        <p className="profile-email" style={{ color: 'var(--text-muted)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <Mail size={16} /> {profile.email}
                        </p>
                    </div>
                </div>

                {/* Content Section */}
                <div style={{ padding: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 className="gradient-text" style={{ fontSize: '1.5rem' }}>Personal Information</h3>
                        {!isEditing && (
                            <button onClick={() => setIsEditing(true)} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                                <Edit3 size={16} /> Edit Profile
                            </button>
                        )}
                    </div>

                    <AnimatePresence>
                        {status.message && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className={`alert ${status.type === 'error' ? 'alert-error' : 'alert-success'}`}
                                style={{ marginBottom: '2rem' }}
                            >
                                {status.message}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {isEditing ? (
                        <form onSubmit={handleUpdate} style={{ display: 'grid', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <div className="form-input-wrapper">
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        style={{ paddingLeft: '3.2rem' }}
                                        required
                                    />
                                    <User size={18} className="input-icon" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone Number</label>
                                <div className="form-input-wrapper">
                                    <input
                                        type="text"
                                        value={formData.phone_number}
                                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                        style={{ paddingLeft: '3.2rem' }}
                                        placeholder="Enter your phone number"
                                    />
                                    <Phone size={18} className="input-icon" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                    <Save size={18} /> Save Changes
                                </button>
                                <button type="button" onClick={() => { setIsEditing(false); setFormData({ full_name: profile.full_name, phone_number: profile.phone_number || '' }); }} className="btn btn-outline" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                    <X size={18} /> Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="profile-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Full Name</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <User size={18} color="var(--primary)" /> {profile.full_name}
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', justifyContent: 'space-between' }}>
                                    Phone Number
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px', color: profile.phone_number ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                    <Phone size={18} color="var(--g-blue)" /> {profile.phone_number || 'Not provided'}
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>System Role</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'capitalize' }}>
                                    <ShieldCheck size={18} color="var(--accent-orange)" /> {profile.role}
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Department</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase' }}>
                                    <MapPin size={18} color="var(--accent-green)" /> {profile.department || 'N/A'}
                                </div>
                            </div>

                            {/* Conditional Rendering based on Role */}
                            {profile.role === 'student' && (
                                <>
                                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Roll Number</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Hash size={18} color="var(--primary)" /> {profile.roll_number}
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Batch Year</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Briefcase size={18} color="var(--g-blue)" /> 20{profile.batch}
                                        </div>
                                    </div>
                                </>
                            )}

                            {['faculty', 'hod', 'principal'].includes(profile.role) && (
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', gridColumn: 'span 2' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Administrative Designation</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Briefcase size={18} color="var(--accent-orange)" /> {profile.designation}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;

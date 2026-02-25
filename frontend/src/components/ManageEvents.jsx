import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Link as LinkIcon, Film, Image as ImageIcon, X, Send, Upload, Calendar, Clock } from 'lucide-react';

const ManageEvents = () => {
    const fileInputRef = useRef(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'Workshop',
        media_url: '',
        media_type: 'image',
        event_date: '',
        event_time: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/events`);
            setEvents(res.data);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setFormData({ ...formData, media_type: file.type.startsWith('video') ? 'video' : 'image', media_url: '' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const data = new FormData();
            data.append('title', formData.title);
            data.append('description', formData.description);
            data.append('type', formData.type);
            data.append('media_type', formData.media_type);
            data.append('event_date', formData.event_date);
            data.append('event_time', formData.event_time);

            if (selectedFile) {
                data.append('media', selectedFile);
            } else {
                data.append('media_url', formData.media_url);
            }

            await axios.post(`${import.meta.env.VITE_API_URL}/events/add`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setShowAddForm(false);
            setFormData({
                title: '',
                description: '',
                type: 'Workshop',
                media_url: '',
                media_type: 'image',
                event_date: '',
                event_time: ''
            });
            setSelectedFile(null);
            setPreviewUrl('');
            fetchEvents();
        } catch (error) {
            alert('Failed to add event: ' + (error.response?.data?.error || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this event?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/events/${id}`);
            fetchEvents();
        } catch (error) {
            alert('Failed to delete event');
        }
    };

    return (
        <div className="glass-card admin-card" style={{ padding: '2.5rem', position: 'relative', zIndex: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>Campus Events Management</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>Publish and manage upcoming activities for SREC students.</p>
                </div>
                <button
                    onClick={() => {
                        console.log('Toggle Add Form Clicked');
                        setShowAddForm(prev => !prev);
                    }}
                    className="btn btn-primary"
                    style={{
                        padding: '10px 20px',
                        fontSize: '0.9rem',
                        position: 'relative',
                        zIndex: 100,
                        pointerEvents: 'auto'
                    }}
                >
                    {showAddForm ? <X size={18} /> : <Plus size={18} />}
                    {showAddForm ? 'Cancel' : 'Add New Event'}
                </button>
            </div>

            <AnimatePresence>
                {showAddForm && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden', marginBottom: '3rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '3rem' }}
                    >
                        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', position: 'relative', zIndex: 30 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '8px', display: 'block' }}>Event Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Annual Technical Fest 2026"
                                        style={{ fontSize: '1.05rem', padding: '14px 20px', background: 'rgba(255,255,255,0.03)', position: 'relative', zIndex: 40 }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontWeight: '700', marginBottom: '8px', display: 'block' }}>Event Date</label>
                                        <div style={{ position: 'relative' }}>
                                            <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '15px', opacity: 0.5, pointerEvents: 'none', zIndex: 50 }} />
                                            <input
                                                type="date"
                                                required
                                                style={{ paddingLeft: '40px', position: 'relative', zIndex: 40 }}
                                                value={formData.event_date}
                                                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontWeight: '700', marginBottom: '8px', display: 'block' }}>Event Time</label>
                                        <div style={{ position: 'relative' }}>
                                            <Clock size={18} style={{ position: 'absolute', left: '12px', top: '15px', opacity: 0.5, pointerEvents: 'none', zIndex: 50 }} />
                                            <input
                                                type="time"
                                                required
                                                style={{ paddingLeft: '40px', position: 'relative', zIndex: 40 }}
                                                value={formData.event_time}
                                                onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontWeight: '700', marginBottom: '8px', display: 'block' }}>Event Category</label>
                                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', position: 'relative', zIndex: 40 }}>
                                        <option>Workshop</option>
                                        <option>Fest</option>
                                        <option>Seminar</option>
                                        <option>Cultural</option>
                                        <option>Sports</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ fontWeight: '700', marginBottom: '8px', display: 'block' }}>Media Preview & Upload</label>
                                    <div
                                        className="media-upload-area"
                                        onClick={() => {
                                            console.log('Triggering file input click');
                                            fileInputRef.current.click();
                                        }}
                                        style={{ height: '200px', borderRadius: '16px', border: '2px dashed var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: 'rgba(255,255,255,0.02)', position: 'relative', zIndex: 40 }}
                                    >
                                        {previewUrl ? (
                                            formData.media_type === 'image' || !selectedFile ? (
                                                <img src={previewUrl} className="event-preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                                            ) : (
                                                <video src={previewUrl} className="event-preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            )
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '1rem' }}>
                                                <Upload size={36} style={{ marginBottom: '10px', opacity: 0.5, color: 'var(--primary)' }} />
                                                <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>Click to Upload Poster</p>
                                                <p style={{ fontSize: '0.7rem', opacity: 0.5 }}>Supports Images and Videos</p>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                        accept="image/*,video/*"
                                    />
                                    <div style={{ marginTop: '1rem' }}>
                                        <label style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '6px', display: 'block' }}>Or use a Direct Image URL</label>
                                        <div style={{ position: 'relative' }}>
                                            <LinkIcon size={16} style={{ position: 'absolute', left: '12px', top: '14px', opacity: 0.5, pointerEvents: 'none', zIndex: 50 }} />
                                            <input
                                                type="url"
                                                style={{ paddingLeft: '36px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.03)', position: 'relative', zIndex: 40 }}
                                                value={formData.media_url}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, media_url: e.target.value });
                                                    setSelectedFile(null);
                                                    setPreviewUrl(e.target.value);
                                                }}
                                                placeholder="https://images.unsplash.com/..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ fontWeight: '700' }}>Event Description</label>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>* This appears below the image for students</span>
                                </div>
                                <textarea
                                    rows="4"
                                    required
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe the event goals and what students will gain..."
                                    style={{ fontSize: '0.95rem', background: 'rgba(255,255,255,0.03)', padding: '15px', position: 'relative', zIndex: 40 }}
                                ></textarea>
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ gridColumn: 'span 2', padding: '1.2rem', fontSize: '1.1rem', position: 'relative', zIndex: 40 }} disabled={submitting}>
                                <Send size={20} /> {submitting ? 'Publishing to Campus Feed...' : 'Publish Event'}
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="loader" style={{ margin: '0 auto' }}></div>
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Synchronizing campus events...</p>
                </div>
            ) : events.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <Calendar size={48} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
                    <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>No events published yet.</p>
                    <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '8px' }}>Click "Add New Event" to get started.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                    {events.map(event => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-panel"
                            style={{ overflow: 'hidden', padding: '0', display: 'flex', flexDirection: 'column' }}
                        >
                            {event.media_url && (
                                event.media_type === 'image' ? (
                                    <img src={event.media_url} style={{ width: '100%', height: '180px', objectFit: 'cover' }} alt={event.title} />
                                ) : (
                                    <video src={event.media_url} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                                )
                            )}
                            <div style={{ padding: '1.5rem', flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div>
                                        <span style={{ fontSize: '0.65rem', fontWeight: '800', background: 'var(--primary)', color: 'white', padding: '3px 10px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {event.type}
                                        </span>
                                        <h4 style={{ margin: '10px 0 6px', fontSize: '1.2rem', fontWeight: '800' }}>{event.title}</h4>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'No date'}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {event.event_time || 'No time'}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(event.id)}
                                        style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'all 0.2s' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.6', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {event.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ManageEvents;

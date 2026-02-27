import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, PieChart, Users, Filter, LayoutDashboard, Mail, Search, CheckCircle, PlusCircle, Trash2, Download, AlertCircle } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

const AdminReviews = () => {
    const [viewMode, setViewMode] = useState('create'); // 'create' or 'analytics'
    const [status, setStatus] = useState({ type: '', text: '' });

    // Create Mode States
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [questions, setQuestions] = useState([
        { id: Date.now().toString(), text: '', type: 'OPTION_BASED', options: ['Good', 'Average', 'Poor'], scale: 5 }
    ]);
    const [filterGroups, setFilterGroups] = useState([
        { id: 1, department: '', year: '' }
    ]);
    const [sending, setSending] = useState(false);

    // Analytics Mode States
    const [requests, setRequests] = useState([]);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#6366f1', '#ec4899'];

    useEffect(() => {
        if (viewMode === 'analytics') {
            fetchRequests();
        }
    }, [viewMode]);

    const fetchRequests = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/reviews/admin/requests`);
            setRequests(res.data);
            if (res.data.length > 0 && !selectedRequest) {
                fetchAnalytics(res.data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch review requests');
        }
    };

    const fetchAnalytics = async (requestId) => {
        setSelectedRequest(requestId);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/reviews/admin/analytics/${requestId}`);
            setAnalyticsData(res.data);
        } catch (error) {
            console.error('Failed to load analytics', error);
        }
    };

    const handleExportCSV = (requestId) => {
        const token = localStorage.getItem('token');
        const url = `${import.meta.env.VITE_API_URL}/reviews/admin/export/${requestId}`;
        // Use fetch to download with auth header
        fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => {
                if (!res.ok) throw new Error('Export failed');
                return res.blob();
            })
            .then(blob => {
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `review_export_${Date.now()}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(downloadUrl);
                a.remove();
                setStatus({ type: 'success', text: 'CSV exported successfully!' });
            })
            .catch(() => setStatus({ type: 'error', text: 'Failed to export CSV data.' }));
    };

    const addFilterGroup = () => {
        setFilterGroups([...filterGroups, { id: Date.now(), department: '', year: '' }]);
    };

    const removeFilterGroup = (id) => {
        if (filterGroups.length === 1) {
            setFilterGroups([{ id: Date.now(), department: '', year: '' }]);
            return;
        }
        setFilterGroups(filterGroups.filter(g => g.id !== id));
    };

    const updateFilterGroup = (id, field, value) => {
        setFilterGroups(filterGroups.map(g => g.id === id ? { ...g, [field]: value } : g));
    };

    // Form Builder Functions
    const addQuestion = () => {
        setQuestions([...questions, { id: Date.now().toString(), text: '', type: 'OPTION_BASED', options: ['Option 1'], scale: 5 }]);
    };

    const removeQuestion = (qId) => {
        if (questions.length === 1) return;
        setQuestions(questions.filter(q => q.id !== qId));
    };

    const updateQuestion = (qId, field, value) => {
        setQuestions(questions.map(q => q.id === qId ? { ...q, [field]: value } : q));
    };

    const updateOption = (qId, optionIdx, value) => {
        setQuestions(questions.map(q => {
            if (q.id === qId) {
                const newOptions = [...q.options];
                newOptions[optionIdx] = value;
                return { ...q, options: newOptions };
            }
            return q;
        }));
    };

    const addOption = (qId) => {
        setQuestions(questions.map(q => {
            if (q.id === qId && q.options.length < 10) {
                return { ...q, options: [...q.options, `Option ${q.options.length + 1}`] };
            }
            return q;
        }));
    };

    const removeOption = (qId, optionIdx) => {
        setQuestions(questions.map(q => {
            if (q.id === qId && q.options.length > 2) {
                const newOptions = q.options.filter((_, idx) => idx !== optionIdx);
                return { ...q, options: newOptions };
            }
            return q;
        }));
    };

    const handleSendRequest = async (e) => {
        e.preventDefault();
        setSending(true);
        setStatus({ type: '', text: '' });

        if (!formTitle.trim()) {
            setStatus({ type: 'error', text: 'Form title is required.' });
            setSending(false);
            return;
        }

        // Clean up questions
        const finalQuestions = questions.map(q => {
            let finalOpts = q.options;
            if (q.type === 'EMOJI_BASED') {
                finalOpts = ['😊 Amazing', '🙂 Good', '😐 Average', '😠 Poor'];
            } else if (q.type === 'RATING_BASED') {
                finalOpts = [];
                for (let i = 1; i <= q.scale; i++) finalOpts.push(i.toString());
            } else {
                finalOpts = q.options.filter(o => o.trim() !== '');
            }
            return { id: q.id, text: q.text, type: q.type, options: finalOpts, ...(q.type === 'TEXT_BASED' && { minChars: q.minChars || 10, maxChars: q.maxChars || 500 }) };
        });

        // Validation
        const invalidQuestion = finalQuestions.find(q => !q.text.trim() || (q.type === 'OPTION_BASED' && q.options.length < 2));
        if (invalidQuestion) {
            setStatus({ type: 'error', text: 'All questions must have text and OPTION_BASED must have at least 2 options.' });
            setSending(false);
            return;
        }

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/reviews/admin/create`, {
                title: formTitle,
                description: formDescription,
                questions: finalQuestions,
                filterGroups
            });
            setStatus({ type: 'success', text: res.data.message });
            setFormTitle('');
            setFormDescription('');
            setQuestions([{ id: Date.now().toString(), text: '', type: 'OPTION_BASED', options: ['Good', 'Average', 'Poor'], scale: 5 }]);
            setFilterGroups([{ id: Date.now(), department: '', year: '' }]);
        } catch (error) {
            setStatus({ type: 'error', text: error.response?.data?.error || 'Failed to dispatch reviews' });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.1)' }}>
                <button
                    onClick={() => setViewMode('create')}
                    style={{
                        flex: 1, padding: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                        background: viewMode === 'create' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        borderBottom: viewMode === 'create' ? '3px solid var(--g-blue)' : '3px solid transparent',
                        color: viewMode === 'create' ? 'white' : 'var(--text-muted)',
                        fontWeight: '700', fontSize: '1rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    <Mail size={18} /> Compose Request Form
                </button>
                <button
                    onClick={() => setViewMode('analytics')}
                    style={{
                        flex: 1, padding: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                        background: viewMode === 'analytics' ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                        borderBottom: viewMode === 'analytics' ? '3px solid var(--primary)' : '3px solid transparent',
                        color: viewMode === 'analytics' ? 'white' : 'var(--text-muted)',
                        fontWeight: '700', fontSize: '1rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    <PieChart size={18} /> Analysis Dashboard
                </button>
            </div>

            <div style={{ padding: '2.5rem' }}>
                {status.text && (
                    <div className={`alert ${status.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '2rem' }}>
                        {status.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                        {status.text}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {viewMode === 'create' ? (
                        <motion.form key="create" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleSendRequest}>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Users size={20} color="var(--primary)" /> Form Identity & Tracking</h3>

                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-muted)' }}>Form Title / Purpose</label>
                                <input
                                    type="text" required
                                    value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="e.g., Spring 2026 Facility & Curriculum Feedback"
                                    style={{ width: '100%', padding: '15px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}
                                />
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-muted)' }}>Description <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>(Shown to students on homepage)</span></label>
                                <textarea
                                    value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="Brief description of what this review is about and why it matters..."
                                    rows={3}
                                    style={{ width: '100%', padding: '15px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', fontSize: '0.95rem', resize: 'none', lineHeight: '1.6' }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '700' }}>
                                    <Filter size={16} /> POPULATION SEGMENTATION (Targets)
                                </div>

                                {filterGroups.map((group) => (
                                    <div key={group.id} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <select
                                            value={group.department}
                                            onChange={(e) => updateFilterGroup(group.id, 'department', e.target.value)}
                                            style={{ flex: 1, padding: '12px 15px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                                        >
                                            <option value="">All Departments</option>
                                            <option value="Computer Science & Engineering (CSE)">CSE</option>
                                            <option value="Computer Science & Data Science (CSE-DS)">CSE-DS</option>
                                            <option value="Computer Science & Artificial Intelligence (CSE-AIML)">CSE-AIML</option>
                                            <option value="Electronics & Communication (ECE)">ECE</option>
                                            <option value="Electrical & Electronics (EEE)">EEE</option>
                                            <option value="Mechanical Engineering (MECH)">MECH</option>
                                            <option value="Civil Engineering (CIVIL)">CIVIL</option>
                                            <option value="Information Technology (IT)">IT</option>
                                            <option value="Administration">Administration</option>
                                        </select>
                                        <select
                                            value={group.year}
                                            onChange={(e) => updateFilterGroup(group.id, 'year', e.target.value)}
                                            style={{ flex: 1, padding: '12px 15px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                                        >
                                            <option value="">All Years</option>
                                            <option value="2026">1st Year (2026 Batch)</option>
                                            <option value="2025">2nd Year (2025 Batch)</option>
                                            <option value="2024">3rd Year (2024 Batch)</option>
                                            <option value="2023">4th Year (2023 Batch)</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => removeFilterGroup(group.id)}
                                            style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={addFilterGroup}
                                    style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed var(--glass-border)', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    <PlusCircle size={16} /> Add population group
                                </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><LayoutDashboard size={20} color="#f59e0b" /> Questionnaire Build</h3>
                                <button type="button" onClick={addQuestion} className="btn" style={{ padding: '8px 16px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', display: 'flex', gap: '5px', alignItems: 'center' }}>
                                    <PlusCircle size={16} /> Add Question
                                </button>
                            </div>

                            {/* DYNAMIC QUESTIONS RENDER MAP */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2rem' }}>
                                {questions.map((q, qIndex) => (
                                    <div key={q.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.5rem', position: 'relative' }}>
                                        {questions.length > 1 && (
                                            <button type="button" onClick={() => removeQuestion(q.id)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Remove Question">
                                                <Trash2 size={20} />
                                            </button>
                                        )}

                                        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 2 }}>
                                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Question {qIndex + 1}</label>
                                                <input
                                                    type="text" required
                                                    value={q.text} onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                                                    placeholder="Type your question here..."
                                                    style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', borderBottom: '2px solid var(--text-muted)', borderRadius: '6px', color: 'white', fontSize: '1rem' }}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Response Type</label>
                                                <select
                                                    value={q.type} onChange={(e) => updateQuestion(q.id, 'type', e.target.value)}
                                                    style={{ width: '100%', padding: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white', fontWeight: '600' }}
                                                >
                                                    <option value="OPTION_BASED">Multiple Choice</option>
                                                    <option value="EMOJI_BASED">Emoji Sentiment</option>
                                                    <option value="RATING_BASED">Linear Rating Scale</option>
                                                    <option value="TEXT_BASED">Text Based (AI Sentiment)</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Dynamic Format Constraint Options Render */}
                                        {q.type === 'OPTION_BASED' && (
                                            <div style={{ paddingLeft: '1rem', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                                                {q.options.map((opt, idx) => (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                                        <div style={{ width: '14px', height: '14px', border: '2px solid var(--text-muted)', borderRadius: '50%' }}></div>
                                                        <input
                                                            type="text" value={opt} onChange={(e) => updateOption(q.id, idx, e.target.value)}
                                                            style={{ flex: 1, padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.95rem' }}
                                                            placeholder={`Option ${idx + 1}`}
                                                            required
                                                        />
                                                        {q.options.length > 2 && (
                                                            <Trash2 size={16} color="#ef4444" style={{ cursor: 'pointer', opacity: 0.6 }} onClick={() => removeOption(q.id, idx)} />
                                                        )}
                                                    </div>
                                                ))}
                                                {q.options.length < 10 && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                                                        <div style={{ width: '14px', height: '14px', border: '2px dashed var(--primary)', borderRadius: '50%' }}></div>
                                                        <span onClick={() => addOption(q.id)} style={{ color: '#60a5fa', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}>Add option</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {q.type === 'EMOJI_BASED' && (
                                            <div style={{ paddingLeft: '1rem', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '10px' }}>Student Interface Preview:</p>
                                                <div style={{ display: 'flex', gap: '15px' }}>
                                                    {['😊 Amazing', '🙂 Good', '😐 Average', '😠 Poor'].map(e => <span key={e} style={{ background: 'rgba(0,0,0,0.4)', padding: '6px 14px', borderRadius: '30px', fontSize: '0.85rem' }}>{e}</span>)}
                                                </div>
                                            </div>
                                        )}

                                        {q.type === 'RATING_BASED' && (
                                            <div style={{ paddingLeft: '1rem', borderLeft: '2px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Rating Scale Max:</span>
                                                <select value={q.scale} onChange={(e) => updateQuestion(q.id, 'scale', Number(e.target.value))} style={{ padding: '8px 12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}>
                                                    <option value={5}>1 to 5 points</option>
                                                    <option value={10}>1 to 10 points</option>
                                                </select>
                                            </div>
                                        )}

                                        {q.type === 'TEXT_BASED' && (
                                            <div style={{ paddingLeft: '1rem', borderLeft: '2px solid rgba(139, 92, 246, 0.3)' }}>
                                                <div style={{ background: 'rgba(139, 92, 246, 0.05)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                                                    <p style={{ fontSize: '0.85rem', color: '#8b5cf6', fontWeight: '700', margin: '0 0 8px 0' }}>🤖 AI-Powered Sentiment Analysis</p>
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Students will type free-text feedback. Groq AI will automatically analyze sentiment (Positive / Neutral / Negative) after submission.</p>
                                                </div>
                                                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Min Characters</label>
                                                        <input type="number" value={q.minChars || 10} onChange={(e) => updateQuestion(q.id, 'minChars', Number(e.target.value))} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white', marginTop: '4px' }} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Max Characters</label>
                                                        <input type="number" value={q.maxChars || 500} onChange={(e) => updateQuestion(q.id, 'maxChars', Number(e.target.value))} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white', marginTop: '4px' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                ))}
                            </div>

                            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '2rem', display: 'flex', justifyContent: 'flex-end', position: 'sticky', bottom: '0', background: 'rgba(10, 10, 10, 0.95)', paddingBottom: '1rem', zIndex: 10 }}>
                                <button type="submit" disabled={sending} className="btn btn-primary" style={{ padding: '14px 40px', fontSize: '1.2rem', background: 'var(--primary)' }}>
                                    <Send size={20} /> {sending ? 'Transmitting...' : 'Dispatch Form to Inboxes'}
                                </button>
                            </div>
                        </motion.form>
                    ) : (

                        // ANALYSIS VIEW
                        <motion.div key="analytics" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                                <div style={{ width: '320px', flexShrink: 0 }}>
                                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-muted)' }}><Filter size={16} /> Dispatched Forms</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '600px', overflowY: 'auto', paddingRight: '10px' }}>
                                        {requests.length === 0 ? <div style={{ opacity: 0.5, fontSize: '0.9rem' }}>No private forms dispatched yet.</div> :
                                            requests.map(r => (
                                                <div
                                                    key={r.id}
                                                    onClick={() => fetchAnalytics(r.id)}
                                                    style={{
                                                        background: selectedRequest === r.id ? 'var(--glass-bg)' : 'rgba(255,255,255,0.01)',
                                                        border: `1px solid ${selectedRequest === r.id ? 'var(--primary)' : 'var(--glass-border)'}`,
                                                        padding: '15px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    <div style={{ fontWeight: '800', fontSize: '1rem', marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selectedRequest === r.id ? 'var(--primary)' : 'white' }}>{r.title}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.questions?.length || 1} Questions</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '5px' }}>
                                                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                                                        <span style={{ color: 'var(--accent-green-light)', fontWeight: 'bold' }}>{r.total_responses}/{r.total_sent} Resp</span>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>

                                <div style={{ flex: 1, borderLeft: '1px solid var(--glass-border)', paddingLeft: '2rem', minHeight: '500px' }}>
                                    {!analyticsData ? (
                                        <div style={{ textAlign: 'center', margin: '4rem 0', opacity: 0.5 }}><PieChart size={48} style={{ marginBottom: '1rem' }} /> <br />Select a deployed form to view internal response analytics</div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem' }}>
                                                <div>
                                                    <h2 style={{ fontSize: '1.8rem', marginBottom: '10px', lineHeight: '1.3' }}>{analyticsData.request.title}</h2>
                                                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                                                        <span style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px' }}>Dispatched {new Date(analyticsData.request.created_at).toLocaleDateString()}</span>
                                                        <span style={{ padding: '4px 12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '20px' }}>{analyticsData.total_responses}/{analyticsData.total_sent} Responses</span>
                                                        {analyticsData.pending > 0 && <span style={{ padding: '4px 12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '20px' }}>{analyticsData.pending} Pending</span>}
                                                    </div>
                                                </div>
                                                {analyticsData.total_responses > 0 && (
                                                    <button
                                                        onClick={() => handleExportCSV(selectedRequest)}
                                                        className="btn"
                                                        style={{ padding: '8px 16px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '100px', border: '1px solid rgba(16, 185, 129, 0.2)', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                                    >
                                                        <Download size={16} /> Export CSV
                                                    </button>
                                                )}
                                            </div>

                                            {analyticsData.total_responses === 0 ? (
                                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '4rem 2rem', textAlign: 'center', borderRadius: '12px' }}>
                                                    <Mail size={48} opacity={0.2} style={{ marginBottom: '15px' }} />
                                                    <h3 style={{ margin: 0 }}>Awaiting Student Deliveries</h3>
                                                    <p style={{ opacity: 0.6 }}>No students have finalized this form from their inbox yet.</p>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                                                    {analyticsData.request.questions.map((q, idx) => {
                                                        const distribution = analyticsData.distributions[q.id] || {};
                                                        const chartData = Object.keys(distribution).map(key => ({
                                                            name: key, value: distribution[key]
                                                        }));

                                                        return (
                                                            <div key={q.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                                <h4 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Q{idx + 1}. {q.text}</h4>
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{q.type.replace('_', ' ')} Format</div>

                                                                {chartData.length === 0 ? (
                                                                    <div style={{ opacity: 0.5, fontStyle: 'italic' }}>No responses for this particular question yet.</div>
                                                                ) : (
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
                                                                        <div style={{ height: '220px' }}>
                                                                            <ResponsiveContainer width="100%" height="100%">
                                                                                <RePieChart>
                                                                                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                                                                                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                                                    </Pie>
                                                                                    <RechartsTooltip contentStyle={{ background: 'rgba(10,10,10,0.9)', border: '1px solid #333', borderRadius: '8px' }} />
                                                                                    <Legend />
                                                                                </RePieChart>
                                                                            </ResponsiveContainer>
                                                                        </div>
                                                                        <div>
                                                                            {chartData.sort((a, b) => b.value - a.value).map((d, i) => (
                                                                                <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', background: 'rgba(255,255,255,0.02)', margin: '4px 0', borderRadius: '8px', borderLeft: `4px solid ${COLORS[i % COLORS.length]}` }}>
                                                                                    <span style={{ fontWeight: '600', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.name}>{d.name}</span>
                                                                                    <span style={{ fontSize: '1rem', fontWeight: '800' }}>{d.value} <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>votes</span></span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminReviews;

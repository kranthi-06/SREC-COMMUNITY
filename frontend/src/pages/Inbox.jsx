import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox as InboxIcon, Send, Clock, User as UserIcon, AlertCircle, FileText, CheckCircle } from 'lucide-react';

const Inbox = () => {
    const [messages, setMessages] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('messages'); // 'messages' or 'reviews'
    const [replyText, setReplyText] = useState('');

    // Form Delivery States
    const [selectedReview, setSelectedReview] = useState(null);
    const [answers, setAnswers] = useState({}); // Stores { q_id: 'Selected Option' }
    const [submittingReview, setSubmittingReview] = useState(false);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchInbox();
    }, []);

    const fetchInbox = async () => {
        try {
            const [msgRes, revRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/profile/messages`),
                axios.get(`${import.meta.env.VITE_API_URL}/reviews/student/inbox`)
            ]);
            setMessages(msgRes.data);
            setReviews(revRes.data);
        } catch (error) {
            console.error('Error fetching inbox:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/profile/message/admin`, { message_text: replyText });
            setReplyText('');
            fetchInbox();
        } catch (error) {
            alert('Failed to send message.');
        }
    };

    const handleOptionSelect = (qId, option) => {
        setAnswers({ ...answers, [qId]: option });
    };

    const submitReviewForm = async () => {
        if (!selectedReview || selectedReview.is_answered) return;

        // Validation - Missing Answers
        if (Object.keys(answers).length !== selectedReview.questions.length) {
            alert('Mandatory Requirement: Please answer all questions in this form before submitting.');
            return;
        }

        setSubmittingReview(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/reviews/student/submit/${selectedReview.id}`, {
                answers
            });
            alert('Your private feedback form was securely transmitted and recorded.');
            setSelectedReview(null);
            setAnswers({});
            fetchInbox(); // Refresh to mark as answered
        } catch (error) {
            alert(error.response?.data?.error || 'Transmission failure. Please try again.');
        } finally {
            setSubmittingReview(false);
        }
    };

    const pendingReviews = reviews.filter(r => !r.is_answered).length;

    return (
        <div className="container" style={{ padding: '4rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '3rem' }}>
                <InboxIcon size={40} color="var(--primary)" />
                <div>
                    <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Secure Inbox</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Direct messages and internal compliance feedback instances</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem' }}>

                {/* Navigation Sidebar */}
                <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                        onClick={() => { setViewMode('messages'); setSelectedReview(null); }}
                        style={{
                            padding: '15px 20px', borderRadius: '12px', border: '1px solid var(--glass-border)', textAlign: 'left', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '10px',
                            background: viewMode === 'messages' ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                            color: viewMode === 'messages' ? 'white' : 'var(--text-muted)'
                        }}
                    >
                        <Send size={18} /> Messages
                    </button>
                    <button
                        onClick={() => { setViewMode('reviews'); setSelectedReview(null); }}
                        style={{
                            padding: '15px 20px', borderRadius: '12px', border: '1px solid var(--glass-border)', textAlign: 'left', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: viewMode === 'reviews' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.02)',
                            color: viewMode === 'reviews' ? '#60a5fa' : 'var(--text-muted)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FileText size={18} /> Review Forms</div>
                        {pendingReviews > 0 && (
                            <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '20px', fontSize: '0.8rem' }}>{pendingReviews}</span>
                        )}
                    </button>
                </div>

                {/* Main Content Pane */}
                <div className="glass-card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '650px' }}>

                    {viewMode === 'messages' && (
                        <>
                            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
                                <h3 style={{ margin: 0 }}>Direct Messages</h3>
                            </div>
                            <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {loading ? <div className="loader" style={{ margin: 'auto' }}></div> : messages.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>No messages available.</div>
                                ) : (
                                    messages.map((msg, i) => {
                                        const isMyMessage = msg.sender_id === msg.currentUser;
                                        return (
                                            <div key={i} style={{ alignSelf: isMyMessage ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                                                <div style={{
                                                    background: isMyMessage ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                                    padding: '12px 18px',
                                                    borderRadius: '16px',
                                                    borderBottomRightRadius: isMyMessage ? '0' : '16px',
                                                    borderBottomLeftRadius: !isMyMessage ? '0' : '16px',
                                                    color: isMyMessage ? 'white' : 'var(--text-main)'
                                                }}>
                                                    {msg.message_text}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '5px', textAlign: isMyMessage ? 'right' : 'left' }}>
                                                    {new Date(msg.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
                                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        placeholder="Type a message to the Administration..."
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        style={{ flex: 1, padding: '12px 15px', borderRadius: '30px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
                                    />
                                    <button type="submit" className="btn btn-primary" style={{ padding: '12px', borderRadius: '50%' }}>
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        </>
                    )}

                    {viewMode === 'reviews' && (
                        <>
                            {selectedReview ? (
                                // ==== MOUNTED PRIVATE FORM VIEW ====
                                <div style={{ padding: '2rem 3rem', height: '100%', overflowY: 'auto' }}>
                                    <button onClick={() => { setSelectedReview(null); setAnswers({}); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        ← Return to Forms List
                                    </button>

                                    <div style={{ maxWidth: '750px', margin: '0 auto' }}>
                                        <div style={{ marginBottom: '3rem', borderBottom: '1px solid var(--primary)', paddingBottom: '1rem' }}>
                                            <h2 style={{ fontSize: '2.5rem', marginBottom: '5px', lineHeight: '1.2' }}>{selectedReview.title}</h2>
                                            <p style={{ color: 'var(--text-muted)' }}>
                                                {selectedReview.is_answered
                                                    ? "Your responses for this form have been finalized. The data is immutable."
                                                    : "Required Institutional Form. Please fill out all answers securely before submitting. Selections are permanently locked thereafter."}
                                            </p>
                                        </div>

                                        {selectedReview.is_answered && (
                                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '2rem', borderRadius: '12px', color: '#10b981', marginBottom: '3rem', display: 'flex', gap: '15px' }}>
                                                <CheckCircle size={40} />
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Form Verified & Completed</h3>
                                                    <p style={{ opacity: 0.8, marginTop: '5px' }}>All provided responses are securely mapped to your identifier internally.</p>
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
                                            {selectedReview.questions.map((q, qIndex) => (
                                                <div key={q.id} className={selectedReview.is_answered ? "answered-block" : ""} style={{ opacity: selectedReview.is_answered ? 0.5 : 1 }}>
                                                    <h3 style={{ fontSize: '1.35rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                                                        <span style={{ color: 'var(--primary)', marginRight: '8px' }}>Q{qIndex + 1}.</span> {q.text}
                                                    </h3>

                                                    {/* MULTI_CHOICE MAPPING */}
                                                    {q.type === 'OPTION_BASED' && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            {q.options.map(opt => (
                                                                <button
                                                                    key={opt} disabled={submittingReview || selectedReview.is_answered}
                                                                    onClick={() => handleOptionSelect(q.id, opt)}
                                                                    style={{
                                                                        padding: '18px 25px', fontSize: '1.1rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '600', color: 'white', textAlign: 'left',
                                                                        background: answers[q.id] === opt ? 'var(--primary)' : 'var(--glass-bg)',
                                                                        border: answers[q.id] === opt ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                                                                        opacity: (submittingReview || selectedReview.is_answered) ? 0.7 : 1
                                                                    }}
                                                                    onMouseOver={(e) => { if (!selectedReview.is_answered && answers[q.id] !== opt) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                                                                    onMouseOut={(e) => { if (!selectedReview.is_answered && answers[q.id] !== opt) e.currentTarget.style.background = 'var(--glass-bg)' }}
                                                                >
                                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid white', background: answers[q.id] === opt ? 'white' : 'transparent', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                                            {answers[q.id] === opt && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }}></div>}
                                                                        </div>
                                                                        {opt}
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* EMOJI MAPPING */}
                                                    {q.type === 'EMOJI_BASED' && (
                                                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                                            {q.options.map(opt => (
                                                                <button
                                                                    key={opt} disabled={submittingReview || selectedReview.is_answered}
                                                                    onClick={() => handleOptionSelect(q.id, opt)}
                                                                    style={{
                                                                        flex: 1, minWidth: '150px', padding: '18px 25px', fontSize: '1.2rem', borderRadius: '30px', cursor: 'pointer', transition: 'all 0.2s',
                                                                        background: answers[q.id] === opt ? 'rgba(59, 130, 246, 0.2)' : 'var(--glass-bg)',
                                                                        border: answers[q.id] === opt ? '2px solid #3b82f6' : '1px solid var(--glass-border)',
                                                                        opacity: (submittingReview || selectedReview.is_answered) ? 0.8 : 1
                                                                    }}
                                                                    onMouseOver={(e) => { if (!selectedReview.is_answered) e.currentTarget.style.transform = 'translateY(-3px)' }}
                                                                    onMouseOut={(e) => { if (!selectedReview.is_answered) e.currentTarget.style.transform = 'translateY(0)' }}
                                                                >
                                                                    {opt}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* RATING MAPPING */}
                                                    {q.type === 'RATING_BASED' && (
                                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                            {q.options.map(opt => (
                                                                <button
                                                                    key={opt} disabled={submittingReview || selectedReview.is_answered}
                                                                    onClick={() => handleOptionSelect(q.id, opt)}
                                                                    style={{
                                                                        width: '60px', height: '60px', fontSize: '1.2rem', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '800',
                                                                        background: answers[q.id] === opt ? 'var(--primary)' : 'var(--glass-bg)',
                                                                        border: '1px solid var(--glass-border)',
                                                                        color: answers[q.id] === opt ? 'white' : 'var(--primary)',
                                                                        opacity: (submittingReview || selectedReview.is_answered) ? 0.8 : 1
                                                                    }}
                                                                    onMouseOver={(e) => { if (!selectedReview.is_answered && answers[q.id] !== opt) { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)' } }}
                                                                    onMouseOut={(e) => { if (!selectedReview.is_answered && answers[q.id] !== opt) { e.currentTarget.style.background = 'var(--glass-bg)' } }}
                                                                >
                                                                    {opt}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {!selectedReview.is_answered && (
                                            <div style={{ borderTop: '1px solid var(--glass-border)', marginTop: '4rem', paddingTop: '2rem', display: 'flex', justifyContent: 'flex-end', paddingBottom: '3rem' }}>
                                                <button
                                                    onClick={submitReviewForm} disabled={submittingReview}
                                                    className="btn btn-primary"
                                                    style={{ padding: '18px 45px', fontSize: '1.2rem', borderRadius: '30px' }}
                                                >
                                                    {submittingReview ? 'Verifying Payload...' : 'Submit Institutional Form'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                // Render LIST of Assigned Forms
                                <div style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
                                    <h3 style={{ marginBottom: '2rem', color: 'var(--text-main)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '15px' }}>Assigned Institution Forms</h3>
                                    {reviews.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '4rem' }}>No private institutional forms pending completion.</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            {reviews.map(r => (
                                                <div
                                                    key={r.id}
                                                    onClick={() => setSelectedReview(r)}
                                                    style={{
                                                        background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)',
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s',
                                                        borderLeft: r.is_answered ? '4px solid #10b981' : '4px solid #3b82f6'
                                                    }}
                                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                                >
                                                    <div>
                                                        <h4 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', color: r.is_answered ? 'var(--text-muted)' : 'white' }}>{r.title}</h4>
                                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.questions.length} Questions • Dispatched {new Date(r.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <div>
                                                        {r.is_answered ? (
                                                            <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700' }}>Completed File</span>
                                                        ) : (
                                                            <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700' }}>Pending Action Required</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                </div>
            </div>
        </div>
    );
};

export default Inbox;

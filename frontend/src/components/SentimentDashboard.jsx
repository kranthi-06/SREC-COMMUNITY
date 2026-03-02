/**
 * SentimentDashboard.jsx — Question-Wise AI Analysis Dashboard
 * =============================================================
 * Displays per-question AI analysis: sentiment, keywords, themes,
 * complaints, suggestions, and rating distributions.
 * PII fields are never shown in analysis.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart3, PieChart as PieChartIcon, Users, Search, Filter,
    TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle,
    RefreshCw, ChevronDown, ChevronUp, Sparkles, FileText,
    ArrowLeft, Brain, Loader2, ThumbsUp, ThumbsDown, Meh,
    Tag, MessageSquare, Lightbulb, AlertTriangle, Star, Hash
} from 'lucide-react';
import {
    PieChart as RePieChart, Pie, Cell,
    Tooltip as RechartsTooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const ChartContainer = ({ height = 250, children }) => {
    const ref = useRef(null);
    const [width, setWidth] = useState(0);
    useEffect(() => {
        if (!ref.current) return;
        const measure = () => { if (ref.current) setWidth(ref.current.clientWidth); };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(ref.current);
        return () => ro.disconnect();
    }, []);
    return (
        <div ref={ref} style={{ width: '100%', height: `${height}px`, overflow: 'hidden' }}>
            {width > 0 && typeof children === 'function' ? children(width, height) : null}
        </div>
    );
};

const API_URL = import.meta.env.VITE_API_URL;
const SENTIMENT_COLORS = { Positive: '#22c55e', Neutral: '#f59e0b', Negative: '#ef4444' };
const CHART_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <p style={{ margin: 0, fontWeight: '700', color: payload[0].payload.fill || 'white' }}>
                {payload[0].name}: {payload[0].value}
            </p>
        </div>
    );
};

const SentimentBadge = ({ label, size = 'normal' }) => {
    const config = {
        Positive: { icon: ThumbsUp, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
        Neutral: { icon: Meh, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
        Negative: { icon: ThumbsDown, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
    };
    const c = config[label] || config.Neutral;
    const Icon = c.icon;
    const isSmall = size === 'small';
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: isSmall ? '4px' : '6px',
            padding: isSmall ? '3px 8px' : '4px 12px', borderRadius: '100px', background: c.bg,
            border: `1px solid ${c.color}30`, color: c.color, fontWeight: '700',
            fontSize: isSmall ? '0.7rem' : '0.78rem', whiteSpace: 'nowrap'
        }}>
            <Icon size={isSmall ? 12 : 14} />{label || 'Pending'}
        </span>
    );
};

const OverviewCard = ({ icon: Icon, label, value, color, subtitle }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: `${color}08`, filter: 'blur(10px)' }} />
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.8rem' }}>
            <Icon size={22} color={color} />
        </div>
        <div style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '0.3rem', color }}>{value}</div>
        <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        {subtitle && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', opacity: 0.7 }}>{subtitle}</div>}
    </motion.div>
);

// ============================================
//    TAG LIST COMPONENT
// ============================================
const TagList = ({ items, color, icon: Icon, emptyText }) => {
    if (!items || items.length === 0) return (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', opacity: 0.5, fontStyle: 'italic', padding: '8px 0' }}>{emptyText || 'None detected'}</div>
    );
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {items.map((item, i) => (
                <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '4px 10px', borderRadius: '100px',
                    background: `${color}10`, border: `1px solid ${color}25`,
                    color: color, fontSize: '0.75rem', fontWeight: '600'
                }}>
                    {Icon && <Icon size={11} />}{item}
                </span>
            ))}
        </div>
    );
};

// ============================================
//    QUESTION ANALYSIS CARD (NEW - RICH)
// ============================================
const QuestionAnalysisCard = ({ qa, index }) => {
    const [expanded, setExpanded] = useState(false);
    const isRating = qa.question_type === 'rating';
    const isText = qa.question_type === 'text';
    const sd = qa.sentiment_distribution || {};
    const total = (sd.positive || 0) + (sd.neutral || 0) + (sd.negative || 0);

    const barData = [
        { name: 'Positive', value: sd.positive || 0, fill: SENTIMENT_COLORS.Positive },
        { name: 'Neutral', value: sd.neutral || 0, fill: SENTIMENT_COLORS.Neutral },
        { name: 'Negative', value: sd.negative || 0, fill: SENTIMENT_COLORS.Negative }
    ];
    const pieData = barData.filter(d => d.value > 0);

    const dominant = barData.reduce((max, d) => d.value > max.value ? d : max, barData[0]);
    const dominantPercent = total > 0 ? ((dominant.value / total) * 100).toFixed(0) : 0;

    // Generate insight
    let insight = '';
    if (total === 0) {
        insight = 'No analyzable responses for this question yet.';
    } else if (dominant.name === 'Positive' && dominantPercent >= 70) {
        insight = `Strong positive sentiment — ${dominantPercent}% of responses express satisfaction. This area is performing well.`;
    } else if (dominant.name === 'Positive') {
        insight = `Leaning positive at ${dominantPercent}%. Most respondents are satisfied, but there's room for improvement.`;
    } else if (dominant.name === 'Negative' && dominantPercent >= 70) {
        insight = `Significant negative sentiment — ${dominantPercent}% express dissatisfaction. Requires immediate attention.`;
    } else if (dominant.name === 'Negative') {
        insight = `Leaning negative at ${dominantPercent}%. Review the complaints and suggestions below.`;
    } else {
        insight = `Mixed sentiment at ${dominantPercent}% ${dominant.name.toLowerCase()}. Consider gathering more detailed feedback.`;
    }

    // Rating distribution chart data
    const ratingDistData = isRating && qa.rating_distribution
        ? Object.entries(qa.rating_distribution).map(([k, v]) => ({ name: `★${k}`, value: v, fill: parseInt(k) >= 4 ? '#22c55e' : parseInt(k) >= 3 ? '#f59e0b' : '#ef4444' }))
        : [];

    const typeIcon = isRating ? Star : isText ? Brain : Hash;
    const typeLabel = isRating ? 'Rating' : isText ? 'AI Text Analysis' : 'Multiple Choice';
    const typeColor = isRating ? '#f59e0b' : isText ? '#8b5cf6' : '#3b82f6';

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
            style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '1.5rem 2rem', marginBottom: '1.5rem' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', fontWeight: '800', padding: '2px 10px', borderRadius: '6px', fontSize: '0.75rem' }}>Q{index + 1}</span>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', lineHeight: '1.4' }}>{qa.question_text}</h4>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', background: `${typeColor}12`, color: typeColor, fontSize: '0.7rem', fontWeight: '700', border: `1px solid ${typeColor}20` }}>
                            {React.createElement(typeIcon, { size: 11 })} {typeLabel}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{qa.total_responses} responses</span>
                        {isRating && qa.rating_average && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.8rem', fontWeight: '700', color: '#f59e0b' }}>
                                <Star size={13} fill="#f59e0b" /> {qa.rating_average}
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {barData.map(d => (
                        <span key={d.name} style={{ padding: '3px 10px', borderRadius: '100px', background: `${d.fill}15`, color: d.fill, fontWeight: '700', fontSize: '0.75rem', border: `1px solid ${d.fill}25` }}>
                            {d.value}
                        </span>
                    ))}
                </div>
            </div>

            {/* Charts */}
            {total > 0 && (
                <div className="question-chart-grid" style={{ display: 'grid', gridTemplateColumns: isRating ? '200px 1fr 1fr' : '200px 1fr', gap: '2rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ height: '160px', width: '100%', overflow: 'hidden' }}>
                        <ChartContainer height={160}>
                            {(w, h) => (
                                <RePieChart width={w} height={h}>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                                        {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                </RePieChart>
                            )}
                        </ChartContainer>
                    </div>
                    <div>
                        {barData.map(d => {
                            const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
                            return (
                                <div key={d.name} style={{ marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: '600', fontSize: '0.85rem', color: d.fill }}>{d.name}</span>
                                        <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{d.value} ({pct}%)</span>
                                    </div>
                                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${d.fill}80, ${d.fill})`, borderRadius: '4px', transition: 'width 1s ease' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Rating Distribution */}
                    {isRating && ratingDistData.length > 0 && (
                        <div style={{ height: '160px', width: '100%', overflow: 'hidden' }}>
                            <ChartContainer height={160}>
                                {(w, h) => (
                                    <BarChart width={w} height={h} data={ratingDistData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <RechartsTooltip content={<CustomTooltip />} />
                                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                            {ratingDistData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                        </Bar>
                                    </BarChart>
                                )}
                            </ChartContainer>
                        </div>
                    )}
                </div>
            )}

            {/* AI Insight */}
            <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)', borderRadius: '10px', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <Sparkles size={16} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    <strong style={{ color: '#8b5cf6' }}>AI Insight:</strong> {insight}
                </p>
            </div>

            {/* Keywords, Themes, Complaints, Suggestions — only for text questions */}
            {(isText || qa.top_keywords?.length > 0 || qa.common_themes?.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Tag size={12} color="#3b82f6" /> Top Keywords
                        </div>
                        <TagList items={qa.top_keywords} color="#3b82f6" emptyText="No keywords extracted" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MessageSquare size={12} color="#8b5cf6" /> Common Themes
                        </div>
                        <TagList items={qa.common_themes} color="#8b5cf6" emptyText="No themes detected" />
                    </div>
                </div>
            )}

            {(isText || qa.complaints?.length > 0 || qa.suggestions?.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {qa.complaints?.length > 0 && (
                        <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: '10px', padding: '12px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertTriangle size={12} /> Complaints
                            </div>
                            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                {qa.complaints.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                        </div>
                    )}
                    {qa.suggestions?.length > 0 && (
                        <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: '10px', padding: '12px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Lightbulb size={12} /> Suggestions
                            </div>
                            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                {qa.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};

// ============================================
//    MAIN DASHBOARD COMPONENT
// ============================================
const SentimentDashboard = ({ datasetId, requestId, onBack }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sentimentFilter, setSentimentFilter] = useState('all');
    const [reanalyzing, setReanalyzing] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [batchProcessing, setBatchProcessing] = useState(false);
    const batchProcessingRef = React.useRef(false);

    const mode = datasetId ? 'import' : 'review';

    useEffect(() => {
        setData(null); setLoading(true); setError(''); setSearchTerm(''); setSentimentFilter('all');
        batchProcessingRef.current = false; setBatchProcessing(false);
        fetchAnalysis();
    }, [datasetId, requestId]);

    useEffect(() => {
        if (mode !== 'import' || !data) return;
        if (data.dataset.status === 'processing' && !batchProcessingRef.current) runBatchProcessing();
    }, [data, mode]);

    useEffect(() => { return () => { batchProcessingRef.current = false; }; }, []);

    const runBatchProcessing = async () => {
        if (batchProcessingRef.current) return;
        batchProcessingRef.current = true; setBatchProcessing(true);
        try {
            let done = false;
            while (!done && batchProcessingRef.current) {
                const res = await axios.post(`${API_URL}/import/process-batch/${datasetId}`);
                done = res.data.done;
                await fetchAnalysis();
                if (!done) await new Promise(r => setTimeout(r, 300));
            }
        } catch (err) {
            console.error('Batch processing error:', err);
            setError('Analysis paused. Click "Restart Analysis" to continue.');
        } finally {
            batchProcessingRef.current = false; setBatchProcessing(false);
        }
    };

    const fetchAnalysis = async () => {
        try {
            if (mode === 'import') {
                const res = await axios.get(`${API_URL}/import/dataset/${datasetId}`);
                const raw = res.data;
                // Normalize import data to match dashboard expectations
                const normalizedImport = {
                    dataset: raw.dataset,
                    sentimentSummary: raw.sentimentSummary || { Positive: 0, Neutral: 0, Negative: 0 },
                    questionAnalysis: raw.questionAnalysisAI || [],
                    responses: (raw.responses || []).map((r, idx) => ({
                        id: r.id || idx,
                        row_index: r.row_index ?? idx,
                        respondent_name: r.respondent_name || `Respondent ${idx + 1}`,
                        respondent_department: null,
                        raw_data: r.raw_data || {},
                        sentiment_label: r.sentiment_label || null,
                        sentiment_score: r.sentiment_score || 0,
                        ai_confidence: r.ai_confidence || 0,
                        analyzed_at: r.analyzed_at
                    })),
                };
                setData(normalizedImport);
            } else {
                const res = await axios.get(`${API_URL}/reviews/admin/analytics/${requestId}`);
                const raw = res.data;
                const request = raw.request;
                const questions = request.questions || [];

                // Build response table
                const responses = (raw.raw_responses || []).map((r, idx) => {
                    const answers = r.answers || {};
                    const rawData = {};
                    questions.forEach(q => { rawData[q.text] = answers[q.id] || '—'; });

                    return {
                        id: idx, row_index: idx,
                        respondent_name: r.student_name || `Respondent ${idx + 1}`,
                        respondent_department: r.department ? `${r.department} ${r.year_string || ''}`.trim() : null,
                        raw_data: rawData,
                        sentiment_label: r.sentiment_label || null,
                        sentiment_score: r.sentiment_score || 0,
                        ai_confidence: r.ai_confidence || 0,
                        analyzed_at: r.analyzed_at
                    };
                });

                // Compute overall summary from question analysis
                const questionAnalysis = raw.questionAnalysis || [];
                let totalPos = 0, totalNeut = 0, totalNeg = 0;
                questionAnalysis.forEach(qa => {
                    totalPos += (qa.sentiment_distribution?.positive || 0);
                    totalNeut += (qa.sentiment_distribution?.neutral || 0);
                    totalNeg += (qa.sentiment_distribution?.negative || 0);
                });
                const analyzed = totalPos + totalNeut + totalNeg;

                const normalizedData = {
                    dataset: {
                        title: request.title, source_type: 'dispatched_form',
                        created_at: request.created_at, status: 'complete',
                        total_rows: raw.total_sent || responses.length,
                        analyzed_rows: analyzed || responses.length,
                        columns: questions.map(q => q.text),
                    },
                    sentimentSummary: { Positive: totalPos, Neutral: totalNeut, Negative: totalNeg, analyzed },
                    questionAnalysis,
                    responses,
                    _reviewMeta: {
                        total_sent: raw.total_sent, pending: raw.pending,
                        total_responses: raw.total_responses,
                        distributions: raw.distributions,
                        questions, departmentBreakdown: raw.departmentBreakdown
                    }
                };
                setData(normalizedData);
            }
            setError('');
        } catch (err) {
            setError('Failed to load analysis data');
            console.error(err);
        } finally { setLoading(false); }
    };

    const handleAnalyze = async () => {
        setAnalyzing(true);
        try {
            if (mode === 'review') {
                await axios.post(`${API_URL}/reviews/admin/analyze/${requestId}`);
            }
            await fetchAnalysis();
        } catch (err) {
            setError('Analysis failed: ' + (err.response?.data?.error || err.message));
        } finally { setAnalyzing(false); }
    };

    const handleReanalyze = async () => {
        if (mode !== 'import') return;
        setReanalyzing(true);
        batchProcessingRef.current = false; setBatchProcessing(false);
        try {
            await axios.post(`${API_URL}/import/reanalyze/${datasetId}`);
            await fetchAnalysis();
        } catch (err) { setError('Failed to start re-analysis'); }
        finally { setReanalyzing(false); }
    };

    const filteredResponses = useMemo(() => {
        if (!data) return [];
        return data.responses.filter(r => {
            const nameMatch = !searchTerm || (r.respondent_name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const sentMatch = sentimentFilter === 'all' || r.sentiment_label === sentimentFilter;
            return nameMatch && sentMatch;
        });
    }, [data, searchTerm, sentimentFilter]);

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
            <p>Loading analysis data...</p>
        </div>
    );

    if (error && !data) return (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
            <AlertCircle size={40} color="#ef4444" style={{ marginBottom: '1rem' }} />
            <p style={{ color: '#ef4444' }}>{error}</p>
            <button onClick={onBack} className="btn" style={{ marginTop: '1rem' }}>Go Back</button>
        </div>
    );

    if (!data) return null;

    const { dataset, sentimentSummary, questionAnalysis, responses } = data;
    const totalResponses = responses.length;
    const isProcessing = dataset.status === 'processing' || batchProcessing;
    const progress = dataset.total_rows > 0 ? Math.round((dataset.analyzed_rows / dataset.total_rows) * 100) : 0;
    const isReviewMode = mode === 'review';
    const reviewMeta = data._reviewMeta;
    const hasQA = questionAnalysis && questionAnalysis.length > 0;

    const totalAnalyzed = (sentimentSummary?.Positive || 0) + (sentimentSummary?.Neutral || 0) + (sentimentSummary?.Negative || 0);
    const posPercent = totalAnalyzed > 0 ? (((sentimentSummary?.Positive || 0) / totalAnalyzed) * 100).toFixed(1) : 0;
    const neutPercent = totalAnalyzed > 0 ? (((sentimentSummary?.Neutral || 0) / totalAnalyzed) * 100).toFixed(1) : 0;
    const negPercent = totalAnalyzed > 0 ? (((sentimentSummary?.Negative || 0) / totalAnalyzed) * 100).toFixed(1) : 0;

    const pieData = [
        { name: 'Positive', value: sentimentSummary?.Positive || 0, fill: SENTIMENT_COLORS.Positive },
        { name: 'Neutral', value: sentimentSummary?.Neutral || 0, fill: SENTIMENT_COLORS.Neutral },
        { name: 'Negative', value: sentimentSummary?.Negative || 0, fill: SENTIMENT_COLORS.Negative }
    ].filter(d => d.value > 0);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ minHeight: '400px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={onBack} style={{ background: 'var(--glass-bg, rgba(255,255,255,0.05))', border: '1px solid var(--glass-border, rgba(255,255,255,0.1))', borderRadius: '10px', padding: '10px', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800' }}>{dataset.title}</h2>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <span style={{ padding: '3px 12px', borderRadius: '100px', background: isReviewMode ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)', color: isReviewMode ? '#3b82f6' : '#8b5cf6', fontSize: '0.75rem', fontWeight: '700', border: `1px solid ${isReviewMode ? 'rgba(59,130,246,0.2)' : 'rgba(139,92,246,0.2)'}` }}>
                                {isReviewMode ? '📋 Dispatched Form' : dataset.source_type === 'google_sheets' ? '📊 Google Sheets' : '📄 CSV Import'}
                            </span>
                            {isReviewMode && reviewMeta && (
                                <span style={{ padding: '3px 12px', borderRadius: '100px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '0.75rem', fontWeight: '700', border: '1px solid rgba(16,185,129,0.2)' }}>
                                    {reviewMeta.total_responses}/{reviewMeta.total_sent} Responses
                                </span>
                            )}
                            <span style={{ padding: '3px 12px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                                {new Date(dataset.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {isReviewMode && (
                        <button onClick={handleAnalyze} disabled={analyzing} style={{
                            background: analyzing ? 'rgba(139,92,246,0.1)' : 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.15))',
                            border: '1px solid rgba(139,92,246,0.3)', borderRadius: '10px', padding: '10px 18px', color: '#8b5cf6', cursor: analyzing ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '0.85rem', opacity: analyzing ? 0.6 : 1
                        }}>
                            {analyzing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Brain size={16} />}
                            {analyzing ? 'Analyzing...' : hasQA ? 'Re-analyze with AI' : 'Run AI Analysis'}
                        </button>
                    )}
                    {isReviewMode && (
                        <button onClick={() => fetchAnalysis()} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '10px 18px', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '0.85rem' }}>
                            <RefreshCw size={16} /> Refresh
                        </button>
                    )}
                    {!isReviewMode && (
                        <button onClick={handleReanalyze} disabled={reanalyzing} style={{
                            background: isProcessing ? 'rgba(245,158,11,0.1)' : 'rgba(139,92,246,0.1)',
                            border: `1px solid ${isProcessing ? 'rgba(245,158,11,0.2)' : 'rgba(139,92,246,0.2)'}`,
                            borderRadius: '10px', padding: '10px 18px', color: isProcessing ? '#f59e0b' : '#8b5cf6',
                            cursor: reanalyzing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                            fontWeight: '700', fontSize: '0.85rem', opacity: reanalyzing ? 0.5 : 1
                        }}>
                            <RefreshCw size={16} style={(reanalyzing || isProcessing) ? { animation: 'spin 1s linear infinite' } : {}} />
                            {isProcessing ? 'Restart Analysis' : 'Re-analyze with AI'}
                        </button>
                    )}
                </div>
            </div>

            {/* Processing Progress */}
            {isProcessing && (
                <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '12px', padding: '16px 20px', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#f59e0b' }}>
                            <Brain size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> AI Analysis in Progress
                        </span>
                        <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#f59e0b' }}>{dataset.analyzed_rows}/{dataset.total_rows} rows</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #f59e0b, #22c55e)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                    </div>
                </div>
            )}

            {/* No responses */}
            {isReviewMode && totalResponses === 0 && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '4rem 2rem', textAlign: 'center', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Users size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
                    <h3 style={{ margin: '0 0 8px', fontWeight: '800' }}>Awaiting Student Responses</h3>
                    <p style={{ opacity: 0.6, margin: 0 }}>No students have submitted this form yet. {reviewMeta && `(${reviewMeta.total_sent} sent, ${reviewMeta.pending} pending)`}</p>
                </div>
            )}

            {totalResponses > 0 && (
                <>
                    {/* SECTION 1: OVERVIEW (compact) */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '2rem', marginBottom: '2.5rem', overflow: 'hidden' }}>
                        <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <BarChart3 size={20} color="#8b5cf6" /> Overall Feedback Summary
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                            <OverviewCard icon={Users} label="Total Responses" value={totalResponses} color="#3b82f6" />
                            <OverviewCard icon={ThumbsUp} label="Positive" value={sentimentSummary?.Positive || 0} color="#22c55e" subtitle={`${posPercent}%`} />
                            <OverviewCard icon={Meh} label="Neutral" value={sentimentSummary?.Neutral || 0} color="#f59e0b" subtitle={`${neutPercent}%`} />
                            <OverviewCard icon={ThumbsDown} label="Negative" value={sentimentSummary?.Negative || 0} color="#ef4444" subtitle={`${negPercent}%`} />
                        </div>

                        {/* Sentiment bar */}
                        {totalAnalyzed > 0 && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sentiment Distribution</span>
                                    <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{totalAnalyzed} analyzed</span>
                                </div>
                                <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                                    {Number(posPercent) > 0 && <div style={{ width: `${posPercent}%`, background: SENTIMENT_COLORS.Positive, transition: 'width 1s ease' }} />}
                                    {Number(neutPercent) > 0 && <div style={{ width: `${neutPercent}%`, background: SENTIMENT_COLORS.Neutral, transition: 'width 1s ease' }} />}
                                    {Number(negPercent) > 0 && <div style={{ width: `${negPercent}%`, background: SENTIMENT_COLORS.Negative, transition: 'width 1s ease' }} />}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                    <span style={{ fontSize: '0.75rem', color: SENTIMENT_COLORS.Positive, fontWeight: '700' }}>● Positive {posPercent}%</span>
                                    <span style={{ fontSize: '0.75rem', color: SENTIMENT_COLORS.Neutral, fontWeight: '700' }}>● Neutral {neutPercent}%</span>
                                    <span style={{ fontSize: '0.75rem', color: SENTIMENT_COLORS.Negative, fontWeight: '700' }}>● Negative {negPercent}%</span>
                                </div>
                            </div>
                        )}

                        {/* Prompt to run analysis */}
                        {isReviewMode && !hasQA && totalResponses > 0 && (
                            <div style={{ marginTop: '1.5rem', background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.06))', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '14px', padding: '1.2rem 1.5rem', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <Brain size={24} color="#8b5cf6" />
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 4px', color: '#8b5cf6', fontSize: '0.95rem' }}>Run Question-Wise AI Analysis</h4>
                                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Click the "Run AI Analysis" button above to generate per-question sentiment analysis, keyword extraction, theme detection, and complaint/suggestion insights.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SECTION 2: QUESTION-WISE ANALYSIS */}
                    {hasQA && (
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Brain size={20} color="#8b5cf6" /> Question-Wise AI Analysis
                                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '3px 12px', borderRadius: '100px' }}>
                                    {questionAnalysis.length} questions analyzed
                                </span>
                            </h3>
                            {questionAnalysis.map((qa, idx) => (
                                <QuestionAnalysisCard key={qa.question_id || idx} qa={qa} index={idx} />
                            ))}
                        </div>
                    )}

                    {/* SECTION 3: RESPONSE TABLE */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '2rem' }}>
                        <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Users size={20} color="#3b82f6" /> Individual Response Table
                            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '3px 12px', borderRadius: '100px' }}>
                                {filteredResponses.length} of {totalResponses}
                            </span>
                        </h3>

                        {/* Search & Filter */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by student name..."
                                    style={{ width: '100%', padding: '12px 14px 12px 40px', background: 'var(--glass-bg, rgba(0,0,0,0.1))', border: '1px solid var(--glass-border, rgba(255,255,255,0.1))', borderRadius: '10px', color: 'var(--text-main)', fontSize: '0.9rem' }} />
                            </div>
                            <div className="sentiment-filter-row" style={{ display: 'flex', gap: '6px' }}>
                                {['all', 'Positive', 'Neutral', 'Negative'].map(f => (
                                    <button key={f} onClick={() => setSentimentFilter(f)} style={{
                                        padding: '10px 16px', borderRadius: '10px',
                                        border: `1px solid ${sentimentFilter === f ? (SENTIMENT_COLORS[f] || 'var(--primary)') + '50' : 'rgba(255,255,255,0.1)'}`,
                                        background: sentimentFilter === f ? `${SENTIMENT_COLORS[f] || 'var(--primary)'}15` : 'rgba(255,255,255,0.02)',
                                        color: sentimentFilter === f ? (SENTIMENT_COLORS[f] || '#8b5cf6') : 'var(--text-muted)',
                                        cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', transition: 'all 0.2s'
                                    }}>
                                        {f === 'all' ? 'All' : f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Responses */}
                        <div className="response-cards" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {filteredResponses.length === 0 ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    {searchTerm || sentimentFilter !== 'all' ? 'No responses match your search/filter.' : 'No responses found.'}
                                </div>
                            ) : (
                                filteredResponses.map((resp, idx) => {
                                    const nonNameCols = (data.dataset.columns || []).filter(c => !/^(name|student.?name|full.?name|respondent|participant)$/i.test(c.trim()));
                                    return (
                                        <div key={resp.id} style={{ background: 'var(--glass-bg, rgba(255,255,255,0.02))', borderRadius: '12px', border: '1px solid var(--glass-border, rgba(255,255,255,0.06))', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.95rem' }}>{resp.respondent_name || `Respondent ${resp.row_index + 1}`}</div>
                                                    {resp.respondent_department && <div style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-muted)', opacity: 0.7, marginTop: '2px' }}>{resp.respondent_department}</div>}
                                                </div>
                                                <SentimentBadge label={resp.sentiment_label} size="small" />
                                            </div>
                                            {nonNameCols.map(col => {
                                                const answer = resp.raw_data?.[col];
                                                if (!answer || answer === '—') return null;
                                                return (
                                                    <div key={col} style={{ background: 'var(--glass-bg, rgba(0,0,0,0.05))', padding: '0.7rem 1rem', borderRadius: '8px', borderLeft: '3px solid rgba(139,92,246,0.3)' }}>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{col}</div>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.5', wordBreak: 'break-word' }}>{answer}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </>
            )}
        </motion.div>
    );
};

export default SentimentDashboard;

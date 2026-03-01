/**
 * SentimentDashboard.jsx — Feedback Sentiment Analysis Dashboard
 * ================================================================
 * Full-featured dashboard for analyzing imported CSV/Google Sheets feedback data.
 * 
 * Sections:
 * 1. Overall Summary — totals, sentiment percentages, pie/bar charts, AI summary
 * 2. Question-wise Analysis — per-column sentiment breakdown with bar charts + AI insights
 * 3. Individual Response Table — searchable, filterable table with sentiment labels
 */
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart3, PieChart as PieChartIcon, Users, Search, Filter,
    TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle,
    RefreshCw, ChevronDown, ChevronUp, Sparkles, FileText,
    ArrowLeft, Brain, Loader2, ThumbsUp, ThumbsDown, Meh
} from 'lucide-react';
import {
    PieChart as RePieChart, Pie, Cell, ResponsiveContainer,
    Tooltip as RechartsTooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL;

const SENTIMENT_COLORS = {
    Positive: '#22c55e',
    Neutral: '#f59e0b',
    Negative: '#ef4444'
};

const CHART_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

// Generate a summary for dispatched review forms
function generateFormSummary(sentimentSummary, totalResponses, totalSent) {
    const { Positive = 0, Neutral = 0, Negative = 0, analyzed = 0 } = sentimentSummary;
    if (analyzed === 0) return null;
    const total = Positive + Neutral + Negative;
    const posP = ((Positive / total) * 100).toFixed(1);
    const neutP = ((Neutral / total) * 100).toFixed(1);
    const negP = ((Negative / total) * 100).toFixed(1);

    let summary = `Out of ${totalResponses} student responses (${totalSent} sent): ${posP}% rated Positive, ${neutP}% Neutral, and ${negP}% Negative. `;
    if (Positive > Negative * 2) {
        summary += 'Overall sentiment is strongly positive, indicating high student satisfaction with this review topic.';
    } else if (Positive > Negative) {
        summary += 'Overall sentiment leans positive with room for improvement in some areas.';
    } else if (Negative > Positive * 2) {
        summary += 'Overall sentiment is strongly negative, indicating significant student dissatisfaction that needs immediate attention.';
    } else if (Negative > Positive) {
        summary += 'Overall sentiment leans negative — consider reviewing the common concerns raised by students.';
    } else {
        summary += 'Sentiment is mixed/neutral — deeper qualitative analysis of student feedback is recommended.';
    }
    return summary;
}

// Custom tooltip for charts
const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(10, 10, 10, 0.95)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '10px', padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
            <p style={{ margin: 0, fontWeight: '700', color: payload[0].payload.fill || 'white' }}>
                {payload[0].name}: {payload[0].value}
            </p>
        </div>
    );
};

// ============================================
//    SENTIMENT BADGE COMPONENT
// ============================================
const SentimentBadge = ({ label, size = 'normal' }) => {
    const config = {
        Positive: { icon: ThumbsUp, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' },
        Neutral: { icon: Meh, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
        Negative: { icon: ThumbsDown, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' }
    };
    const c = config[label] || config.Neutral;
    const Icon = c.icon;
    const isSmall = size === 'small';

    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: isSmall ? '4px' : '6px',
            padding: isSmall ? '3px 8px' : '4px 12px',
            borderRadius: '100px', background: c.bg,
            border: `1px solid ${c.color}30`,
            color: c.color, fontWeight: '700',
            fontSize: isSmall ? '0.7rem' : '0.78rem',
            whiteSpace: 'nowrap'
        }}>
            <Icon size={isSmall ? 12 : 14} />
            {label || 'Pending'}
        </span>
    );
};

// ============================================
//    OVERVIEW STAT CARD
// ============================================
const OverviewCard = ({ icon: Icon, label, value, color, subtitle }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '1.5rem',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
        }}
    >
        <div style={{
            position: 'absolute', top: '-20px', right: '-20px',
            width: '80px', height: '80px', borderRadius: '50%',
            background: `${color}08`, filter: 'blur(10px)'
        }} />
        <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: `${color}15`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 0.8rem'
        }}>
            <Icon size={22} color={color} />
        </div>
        <div style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '0.3rem', color }}>{value}</div>
        <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        {subtitle && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', opacity: 0.7 }}>{subtitle}</div>}
    </motion.div>
);

// ============================================
//    QUESTION ANALYSIS CARD
// ============================================
const QuestionAnalysisCard = ({ question, data, index }) => {
    const [expanded, setExpanded] = useState(false);
    const total = (data.Positive || 0) + (data.Neutral || 0) + (data.Negative || 0);

    const barData = [
        { name: 'Positive', value: data.Positive || 0, fill: SENTIMENT_COLORS.Positive },
        { name: 'Neutral', value: data.Neutral || 0, fill: SENTIMENT_COLORS.Neutral },
        { name: 'Negative', value: data.Negative || 0, fill: SENTIMENT_COLORS.Negative }
    ];

    const pieData = barData.filter(d => d.value > 0);

    // Determine dominant sentiment
    const dominant = barData.reduce((max, d) => d.value > max.value ? d : max, barData[0]);
    const dominantPercent = total > 0 ? ((dominant.value / total) * 100).toFixed(0) : 0;

    // Generate insight
    let insight = '';
    if (total === 0) {
        insight = 'No analyzable responses for this question.';
    } else if (dominant.name === 'Positive' && dominantPercent >= 70) {
        insight = `Strong positive sentiment — ${dominantPercent}% of responses express satisfaction. This is a well-received area.`;
    } else if (dominant.name === 'Positive') {
        insight = `Leaning positive at ${dominantPercent}%. Most respondents are satisfied, but there's room for improvement.`;
    } else if (dominant.name === 'Negative' && dominantPercent >= 70) {
        insight = `Significant negative sentiment — ${dominantPercent}% express dissatisfaction. Requires immediate attention.`;
    } else if (dominant.name === 'Negative') {
        insight = `Leaning negative at ${dominantPercent}%. Review the common themes in negative responses.`;
    } else {
        insight = `Mixed sentiment at ${dominantPercent}% ${dominant.name.toLowerCase()}. Consider gathering more detailed feedback.`;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                padding: '1.5rem 2rem',
                marginBottom: '1.5rem'
            }}
        >
            {/* Question Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{
                            background: 'rgba(139, 92, 246, 0.15)',
                            color: '#8b5cf6',
                            fontWeight: '800',
                            padding: '2px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem'
                        }}>Q{index + 1}</span>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', lineHeight: '1.4' }}>{question}</h4>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {barData.map(d => (
                        <span key={d.name} style={{
                            padding: '3px 10px', borderRadius: '100px',
                            background: `${d.fill}15`, color: d.fill,
                            fontWeight: '700', fontSize: '0.75rem',
                            border: `1px solid ${d.fill}25`
                        }}>
                            {d.value}
                        </span>
                    ))}
                </div>
            </div>

            {/* Charts & Breakdown */}
            {total > 0 && (
                <div className="question-chart-grid" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '2rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ height: '160px', width: '100%', overflow: 'hidden' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                            </RePieChart>
                        </ResponsiveContainer>
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
                                        <div style={{
                                            height: '100%', width: `${pct}%`,
                                            background: `linear-gradient(90deg, ${d.fill}80, ${d.fill})`,
                                            borderRadius: '4px',
                                            transition: 'width 1s ease'
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* AI Insight */}
            <div style={{
                background: 'rgba(139, 92, 246, 0.06)',
                border: '1px solid rgba(139, 92, 246, 0.12)',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
            }}>
                <Sparkles size={16} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    <strong style={{ color: '#8b5cf6' }}>AI Insight:</strong> {insight}
                </p>
            </div>

            {/* Expand to show individual responses */}
            {data.responses && data.responses.length > 0 && (
                <>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        style={{
                            marginTop: '12px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            padding: '4px 0'
                        }}
                    >
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {expanded ? 'Hide' : 'View'} {data.responses.length} individual responses
                    </button>

                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ overflow: 'hidden' }}
                            >
                                <div style={{
                                    maxHeight: '300px', overflowY: 'auto',
                                    marginTop: '10px', paddingRight: '10px'
                                }}>
                                    {data.responses.map((resp, ri) => (
                                        <div key={ri} style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'flex-start', gap: '12px',
                                            padding: '10px 14px',
                                            background: ri % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                                            borderRadius: '8px'
                                        }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <span style={{ fontWeight: '700', fontSize: '0.8rem', color: '#8b5cf6' }}>{resp.name}</span>
                                                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4', wordBreak: 'break-word' }}>
                                                    {resp.text}
                                                </p>
                                            </div>
                                            <SentimentBadge label={resp.sentiment} size="small" />
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
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
    const [batchProcessing, setBatchProcessing] = useState(false);
    const batchProcessingRef = React.useRef(false);

    // Determine mode: 'import' or 'review'
    const mode = datasetId ? 'import' : 'review';

    useEffect(() => {
        setData(null);
        setLoading(true);
        setError('');
        setSearchTerm('');
        setSentimentFilter('all');
        batchProcessingRef.current = false;
        setBatchProcessing(false);
        fetchAnalysis();
    }, [datasetId, requestId]);

    // Client-driven batch processing: when dataset is 'processing', drive it
    useEffect(() => {
        if (mode !== 'import' || !data) return;
        if (data.dataset.status === 'processing' && !batchProcessingRef.current) {
            runBatchProcessing();
        }
    }, [data, mode]);

    // Cleanup: stop batch processing when component unmounts
    useEffect(() => {
        return () => { batchProcessingRef.current = false; };
    }, []);

    /**
     * Client-driven batch processing loop.
     * Calls /process-batch repeatedly until done.
     * Each call processes 10 rows on the server.
     */
    const runBatchProcessing = async () => {
        if (batchProcessingRef.current) return; // Already running
        batchProcessingRef.current = true;
        setBatchProcessing(true);

        try {
            let done = false;
            while (!done && batchProcessingRef.current) {
                const res = await axios.post(`${API_URL}/import/process-batch/${datasetId}`);
                const result = res.data;

                done = result.done;

                // Refresh the data to update progress
                await fetchAnalysis();

                if (!done) {
                    // Small pause between batches
                    await new Promise(r => setTimeout(r, 300));
                }
            }
        } catch (err) {
            console.error('Batch processing error:', err);
            setError('Analysis paused. Click "Restart Analysis" to continue.');
        } finally {
            batchProcessingRef.current = false;
            setBatchProcessing(false);
        }
    };

    const fetchAnalysis = async () => {
        try {
            if (mode === 'import') {
                // Imported dataset path — unchanged
                const res = await axios.get(`${API_URL}/import/dataset/${datasetId}`);
                setData(res.data);
            } else {
                // Dispatched form path — fetch and normalize
                const res = await axios.get(`${API_URL}/reviews/admin/analytics/${requestId}`);
                const raw = res.data;
                const request = raw.request;
                const questions = request.questions || [];

                // Build question columns and analysis from TEXT_BASED questions
                const textQuestions = questions.filter(q => q.type === 'TEXT_BASED');
                const allQuestions = questions; // Use all questions for analysis
                const questionColumns = allQuestions.map(q => q.text);

                // Simple option-to-sentiment classifier for OPTION_BASED answers
                const classifyOption = (answer) => {
                    if (!answer) return null;
                    const lower = String(answer).toLowerCase().trim();
                    if (!lower) return null;

                    // Handle numeric ratings
                    const num = parseFloat(lower);
                    if (!isNaN(num) && lower.match(/^\d+(\.\d+)?$/)) {
                        if (num >= 4) return 'Positive';
                        if (num >= 3) return 'Neutral';
                        return 'Negative';
                    }

                    // Exact match for common short answers
                    const exactPositive = ['yes', 'good', 'great', 'excellent', 'amazing', 'awesome', 'love', 'perfect', 'agree', 'strongly agree', 'satisfied', 'very satisfied', 'true', 'definitely', 'absolutely', 'sure'];
                    const exactNegative = ['no', 'bad', 'poor', 'terrible', 'worst', 'hate', 'awful', 'disagree', 'strongly disagree', 'dissatisfied', 'false', 'never', 'needs improvement'];
                    const exactNeutral = ['maybe', 'average', 'okay', 'ok', 'neutral', 'not sure', 'sometimes', 'moderate', 'fair'];

                    if (exactPositive.includes(lower)) return 'Positive';
                    if (exactNegative.includes(lower)) return 'Negative';
                    if (exactNeutral.includes(lower)) return 'Neutral';

                    // Keyword-based
                    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'awesome', 'wonderful', 'helpful', 'thank', 'perfect', 'outstanding', 'recommend', 'informative', 'useful', 'enjoyed', 'nice', 'well'];
                    const negativeWords = ['bad', 'poor', 'terrible', 'worst', 'hate', 'awful', 'horrible', 'disappointed', 'useless', 'waste', 'boring', 'frustrating', 'fail', 'lacking', 'weak', 'not good'];

                    if (positiveWords.some(w => lower.includes(w))) return 'Positive';
                    if (negativeWords.some(w => lower.includes(w))) return 'Negative';
                    return 'Neutral';
                };

                // Build question-wise sentiment analysis for ALL questions
                const questionAnalysis = {};
                allQuestions.forEach(q => {
                    questionAnalysis[q.text] = { Positive: 0, Neutral: 0, Negative: 0, responses: [] };
                });

                // Track sentiment counts for summary
                const computedSentiment = { Positive: 0, Neutral: 0, Negative: 0, analyzed: 0 };

                // Build response table data
                const responses = (raw.raw_responses || []).map((r, idx) => {
                    const answers = r.answers || {};
                    let responseSentiment = r.sentiment_label; // Use server-side sentiment if available

                    // For each question, classify the answer
                    allQuestions.forEach(q => {
                        const answer = answers[q.id];
                        if (answer && String(answer).trim()) {
                            let label;
                            if (q.type === 'TEXT_BASED') {
                                label = r.sentiment_label || 'Neutral';
                            } else {
                                // OPTION_BASED, EMOJI_BASED, RATING_BASED — classify from the answer
                                label = classifyOption(answer);
                            }

                            if (label) {
                                questionAnalysis[q.text][label] = (questionAnalysis[q.text][label] || 0) + 1;
                                questionAnalysis[q.text].responses.push({
                                    name: r.student_name || `Respondent ${idx + 1}`,
                                    text: String(answer),
                                    sentiment: label,
                                    score: r.sentiment_score || 0
                                });
                            }

                            // If no server-side sentiment, use the first classified answer
                            if (!responseSentiment && label) {
                                responseSentiment = label;
                            }
                        }
                    });

                    // Count for summary
                    if (responseSentiment) {
                        computedSentiment[responseSentiment] = (computedSentiment[responseSentiment] || 0) + 1;
                        computedSentiment.analyzed++;
                    }

                    // Build raw_data object from answers for the table
                    const rawData = {};
                    questions.forEach(q => {
                        rawData[q.text] = answers[q.id] || '—';
                    });

                    return {
                        id: idx,
                        row_index: idx,
                        respondent_name: r.student_name || `Respondent ${idx + 1}`,
                        respondent_department: r.department ? `${r.department} ${r.year_string || ''}`.trim() : null,
                        raw_data: rawData,
                        sentiment_label: responseSentiment || null,
                        sentiment_score: r.sentiment_score || 0,
                        ai_confidence: r.ai_confidence || 0,
                        analyzed_at: r.analyzed_at
                    };
                });

                // Use server sentiment if available, otherwise use computed
                const finalSentiment = (raw.sentimentSummary?.analyzed > 0)
                    ? raw.sentimentSummary
                    : computedSentiment;

                // Build normalized data matching import format
                const normalizedData = {
                    dataset: {
                        title: request.title,
                        source_type: 'dispatched_form',
                        created_at: request.created_at,
                        status: 'complete',
                        total_rows: raw.total_sent || responses.length,
                        analyzed_rows: finalSentiment.analyzed || responses.length,
                        columns: questions.map(q => q.text),
                        ai_summary: finalSentiment.analyzed > 0
                            ? generateFormSummary(finalSentiment, raw.total_responses, raw.total_sent)
                            : null
                    },
                    sentimentSummary: finalSentiment,
                    questionAnalysis,
                    questionColumns,
                    responses,
                    // Extra data for dispatched form specifics
                    _reviewMeta: {
                        total_sent: raw.total_sent,
                        pending: raw.pending,
                        total_responses: raw.total_responses,
                        distributions: raw.distributions,
                        questions,
                        departmentBreakdown: raw.departmentBreakdown
                    }
                };
                setData(normalizedData);
            }
            setError('');
        } catch (err) {
            setError('Failed to load analysis data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleReanalyze = async () => {
        if (mode !== 'import') return;
        setReanalyzing(true);
        batchProcessingRef.current = false; // stop any running loop
        setBatchProcessing(false);
        try {
            await axios.post(`${API_URL}/import/reanalyze/${datasetId}`);
            // Refresh data — this will see status='processing' and trigger runBatchProcessing()
            await fetchAnalysis();
        } catch (err) {
            setError('Failed to start re-analysis');
        } finally {
            setReanalyzing(false);
        }
    };

    // Filtered responses for the table
    const filteredResponses = useMemo(() => {
        if (!data) return [];
        return data.responses.filter(r => {
            const nameMatch = !searchTerm || (r.respondent_name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const sentMatch = sentimentFilter === 'all' || r.sentiment_label === sentimentFilter;
            return nameMatch && sentMatch;
        });
    }, [data, searchTerm, sentimentFilter]);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
                <p>Loading analysis data...</p>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
                <AlertCircle size={40} color="#ef4444" style={{ marginBottom: '1rem' }} />
                <p style={{ color: '#ef4444' }}>{error}</p>
                <button onClick={onBack} className="btn" style={{ marginTop: '1rem' }}>Go Back</button>
            </div>
        );
    }

    if (!data) return null;

    const { dataset, sentimentSummary, questionAnalysis, questionColumns, responses } = data;
    const totalResponses = responses.length;
    const isProcessing = dataset.status === 'processing' || batchProcessing;
    const progress = dataset.total_rows > 0 ? Math.round((dataset.analyzed_rows / dataset.total_rows) * 100) : 0;
    const isReviewMode = mode === 'review';
    const reviewMeta = data._reviewMeta;

    const pieData = [
        { name: 'Positive', value: sentimentSummary.Positive || 0, fill: SENTIMENT_COLORS.Positive },
        { name: 'Neutral', value: sentimentSummary.Neutral || 0, fill: SENTIMENT_COLORS.Neutral },
        { name: 'Negative', value: sentimentSummary.Negative || 0, fill: SENTIMENT_COLORS.Negative }
    ].filter(d => d.value > 0);

    const barChartData = [
        { name: 'Positive', count: sentimentSummary.Positive || 0, fill: SENTIMENT_COLORS.Positive },
        { name: 'Neutral', count: sentimentSummary.Neutral || 0, fill: SENTIMENT_COLORS.Neutral },
        { name: 'Negative', count: sentimentSummary.Negative || 0, fill: SENTIMENT_COLORS.Negative }
    ];

    const posPercent = totalResponses > 0 ? ((sentimentSummary.Positive || 0) / totalResponses * 100).toFixed(1) : 0;
    const neutPercent = totalResponses > 0 ? ((sentimentSummary.Neutral || 0) / totalResponses * 100).toFixed(1) : 0;
    const negPercent = totalResponses > 0 ? ((sentimentSummary.Negative || 0) / totalResponses * 100).toFixed(1) : 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ minHeight: '400px' }}
        >
            {/* Back button & Title */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={onBack}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px',
                            padding: '10px',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800' }}>{dataset.title}</h2>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <span style={{
                                padding: '3px 12px', borderRadius: '100px',
                                background: isReviewMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                                color: isReviewMode ? '#3b82f6' : '#8b5cf6',
                                fontSize: '0.75rem', fontWeight: '700',
                                border: `1px solid ${isReviewMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(139, 92, 246, 0.2)'}`
                            }}>
                                {isReviewMode
                                    ? '📋 Dispatched Form'
                                    : dataset.source_type === 'google_sheets' ? '📊 Google Sheets' : '📄 CSV Import'
                                }
                            </span>
                            {isReviewMode && reviewMeta && (
                                <span style={{
                                    padding: '3px 12px', borderRadius: '100px',
                                    background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                                    fontSize: '0.75rem', fontWeight: '700',
                                    border: '1px solid rgba(16, 185, 129, 0.2)'
                                }}>
                                    {reviewMeta.total_responses}/{reviewMeta.total_sent} Responses
                                </span>
                            )}
                            {isReviewMode && reviewMeta && reviewMeta.pending > 0 && (
                                <span style={{
                                    padding: '3px 12px', borderRadius: '100px',
                                    background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b',
                                    fontSize: '0.75rem', fontWeight: '700',
                                    border: '1px solid rgba(245, 158, 11, 0.2)'
                                }}>
                                    {reviewMeta.pending} Pending
                                </span>
                            )}
                            <span style={{
                                padding: '3px 12px', borderRadius: '100px',
                                background: 'rgba(255,255,255,0.05)',
                                fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)'
                            }}>
                                {new Date(dataset.created_at).toLocaleDateString()}
                            </span>
                            {isProcessing && (
                                <span style={{
                                    padding: '3px 12px', borderRadius: '100px',
                                    background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b',
                                    fontSize: '0.75rem', fontWeight: '700',
                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}>
                                    <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                    Analyzing... {progress}%
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {isReviewMode && (
                        <button
                            onClick={() => fetchAnalysis()}
                            style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                borderRadius: '10px',
                                padding: '10px 18px',
                                color: '#3b82f6',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '700',
                                fontSize: '0.85rem'
                            }}
                        >
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                    )}
                    {!isReviewMode && (
                        <button
                            onClick={handleReanalyze}
                            disabled={reanalyzing}
                            style={{
                                background: isProcessing ? 'rgba(245, 158, 11, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                                border: `1px solid ${isProcessing ? 'rgba(245, 158, 11, 0.2)' : 'rgba(139, 92, 246, 0.2)'}`,
                                borderRadius: '10px',
                                padding: '10px 18px',
                                color: isProcessing ? '#f59e0b' : '#8b5cf6',
                                cursor: reanalyzing ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '700',
                                fontSize: '0.85rem',
                                opacity: reanalyzing ? 0.5 : 1
                            }}
                        >
                            <RefreshCw size={16} style={(reanalyzing || isProcessing) ? { animation: 'spin 1s linear infinite' } : {}} />
                            {isProcessing ? 'Restart Analysis' : 'Re-analyze with AI'}
                        </button>
                    )}
                </div>
            </div>

            {/* Processing Progress Bar */}
            {isProcessing && (
                <div style={{
                    background: 'rgba(245, 158, 11, 0.05)',
                    border: '1px solid rgba(245, 158, 11, 0.15)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginBottom: '2rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#f59e0b' }}>
                            <Brain size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            AI Sentiment Analysis in Progress
                        </span>
                        <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#f59e0b' }}>
                            {dataset.analyzed_rows}/{dataset.total_rows} rows
                        </span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${progress}%`,
                            background: 'linear-gradient(90deg, #f59e0b, #22c55e)',
                            borderRadius: '3px',
                            transition: 'width 0.5s ease'
                        }} />
                    </div>
                </div>
            )}

            {/* No responses yet for dispatched forms */}
            {isReviewMode && totalResponses === 0 && (
                <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    padding: '4rem 2rem',
                    textAlign: 'center',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.06)'
                }}>
                    <Users size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
                    <h3 style={{ margin: '0 0 8px', fontWeight: '800' }}>Awaiting Student Responses</h3>
                    <p style={{ opacity: 0.6, margin: 0 }}>
                        No students have submitted this form yet. {reviewMeta && `(${reviewMeta.total_sent} sent, ${reviewMeta.pending} pending)`}
                    </p>
                </div>
            )}

            {/* ======================================== */}
            {/*    SECTION 1: OVERALL SUMMARY            */}
            {/* ======================================== */}
            {totalResponses > 0 && (
                <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '20px',
                    padding: '2rem',
                    marginBottom: '2.5rem',
                    overflow: 'hidden'
                }}>
                    <h3 style={{
                        margin: '0 0 1.5rem',
                        fontSize: '1.2rem',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <BarChart3 size={20} color="#8b5cf6" />
                        Overall Feedback Summary
                    </h3>

                    {/* Stat Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '1rem',
                        marginBottom: '2rem'
                    }}>
                        <OverviewCard icon={Users} label="Total Responses" value={totalResponses} color="#3b82f6" />
                        <OverviewCard icon={ThumbsUp} label="Positive" value={sentimentSummary.Positive || 0} color="#22c55e" subtitle={`${posPercent}%`} />
                        <OverviewCard icon={Meh} label="Neutral" value={sentimentSummary.Neutral || 0} color="#f59e0b" subtitle={`${neutPercent}%`} />
                        <OverviewCard icon={ThumbsDown} label="Negative" value={sentimentSummary.Negative || 0} color="#ef4444" subtitle={`${negPercent}%`} />
                    </div>

                    {/* Sentiment Percentage Bar */}
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sentiment Distribution</span>
                            <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{sentimentSummary.analyzed || 0} analyzed</span>
                        </div>
                        <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                            {Number(posPercent) > 0 && (
                                <div style={{ width: `${posPercent}%`, background: SENTIMENT_COLORS.Positive, transition: 'width 1s ease' }} title={`Positive: ${posPercent}%`} />
                            )}
                            {Number(neutPercent) > 0 && (
                                <div style={{ width: `${neutPercent}%`, background: SENTIMENT_COLORS.Neutral, transition: 'width 1s ease' }} title={`Neutral: ${neutPercent}%`} />
                            )}
                            {Number(negPercent) > 0 && (
                                <div style={{ width: `${negPercent}%`, background: SENTIMENT_COLORS.Negative, transition: 'width 1s ease' }} title={`Negative: ${negPercent}%`} />
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                            <span style={{ fontSize: '0.75rem', color: SENTIMENT_COLORS.Positive, fontWeight: '700' }}>
                                ● Positive {posPercent}%
                            </span>
                            <span style={{ fontSize: '0.75rem', color: SENTIMENT_COLORS.Neutral, fontWeight: '700' }}>
                                ● Neutral {neutPercent}%
                            </span>
                            <span style={{ fontSize: '0.75rem', color: SENTIMENT_COLORS.Negative, fontWeight: '700' }}>
                                ● Negative {negPercent}%
                            </span>
                        </div>
                    </div>

                    {/* Charts: Pie + Bar */}
                    {sentimentSummary.analyzed > 0 && (
                        <div className="chart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                            <div style={{ width: '100%', minWidth: 0 }}>
                                <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                                    <PieChartIcon size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                                    Pie Chart
                                </h4>
                                <div style={{ height: '250px', width: '100%', overflow: 'hidden' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RePieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                                                {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                            </Pie>
                                            <RechartsTooltip content={<CustomTooltip />} />
                                            <Legend
                                                formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: '0.8rem' }}>{value}</span>}
                                            />
                                        </RePieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div style={{ width: '100%', minWidth: 0 }}>
                                <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                                    <BarChart3 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                                    Bar Chart
                                </h4>
                                <div style={{ height: '250px', width: '100%', overflow: 'hidden' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={barChartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <RechartsTooltip content={<CustomTooltip />} />
                                            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                                {barChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Summary */}
                    {dataset.ai_summary && (
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.06))',
                            border: '1px solid rgba(139, 92, 246, 0.15)',
                            borderRadius: '14px',
                            padding: '1.2rem 1.5rem',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                        }}>
                            <Brain size={20} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <h4 style={{ margin: '0 0 6px', fontSize: '0.9rem', color: '#8b5cf6', fontWeight: '800' }}>
                                    AI Summary Report
                                </h4>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    {dataset.ai_summary}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {totalResponses > 0 && (
                <>
                    {/* ======================================== */}
                    {/*    SECTION 2: QUESTION-WISE ANALYSIS     */}
                    {/* ======================================== */}
                    {questionColumns && questionColumns.length > 0 && (
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h3 style={{
                                margin: '0 0 1.5rem',
                                fontSize: '1.2rem',
                                fontWeight: '800',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <FileText size={20} color="#f59e0b" />
                                Question-wise Sentiment Report
                            </h3>

                            {questionColumns.map((col, idx) => {
                                const analysis = questionAnalysis?.[col] || { Positive: 0, Neutral: 0, Negative: 0, responses: [] };
                                return (
                                    <QuestionAnalysisCard
                                        key={col}
                                        question={col}
                                        data={analysis}
                                        index={idx}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* ======================================== */}
                    {/*    SECTION 3: INDIVIDUAL RESPONSE TABLE   */}
                    {/* ======================================== */}
                    <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '20px',
                        padding: '2rem',
                    }}>
                        <h3 style={{
                            margin: '0 0 1.5rem',
                            fontSize: '1.2rem',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <Users size={20} color="#3b82f6" />
                            Individual Response Table
                            <span style={{
                                fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)',
                                background: 'rgba(255,255,255,0.05)', padding: '3px 12px', borderRadius: '100px'
                            }}>
                                {filteredResponses.length} of {totalResponses}
                            </span>
                        </h3>

                        {/* Search & Filter */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                                <Search size={16} style={{
                                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)'
                                }} />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by student name..."
                                    style={{
                                        width: '100%', padding: '12px 14px 12px 40px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '10px', color: 'white',
                                        fontSize: '0.9rem'
                                    }}
                                />
                            </div>
                            <div className="sentiment-filter-row" style={{ display: 'flex', gap: '6px' }}>
                                {['all', 'Positive', 'Neutral', 'Negative'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setSentimentFilter(f)}
                                        style={{
                                            padding: '10px 16px',
                                            borderRadius: '10px',
                                            border: `1px solid ${sentimentFilter === f ? (SENTIMENT_COLORS[f] || 'var(--primary)') + '50' : 'rgba(255,255,255,0.1)'}`,
                                            background: sentimentFilter === f
                                                ? `${SENTIMENT_COLORS[f] || 'var(--primary)'}15`
                                                : 'rgba(255,255,255,0.02)',
                                            color: sentimentFilter === f
                                                ? (SENTIMENT_COLORS[f] || '#8b5cf6')
                                                : 'var(--text-muted)',
                                            cursor: 'pointer',
                                            fontWeight: '700',
                                            fontSize: '0.8rem',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {f === 'all' ? 'All' : f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Response Cards */}
                        <div className="response-cards" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {filteredResponses.length === 0 ? (
                                <div style={{
                                    padding: '3rem',
                                    textAlign: 'center',
                                    color: 'var(--text-muted)',
                                    fontStyle: 'italic',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.06)'
                                }}>
                                    {searchTerm || sentimentFilter !== 'all'
                                        ? 'No responses match your search/filter.'
                                        : 'No responses found.'
                                    }
                                </div>
                            ) : (
                                filteredResponses.map((resp, idx) => {
                                    const nonNameCols = (data.dataset.columns || []).filter(c =>
                                        !/^(name|student.?name|full.?name|respondent|participant)$/i.test(c.trim())
                                    );
                                    return (
                                        <div key={resp.id} style={{
                                            background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            padding: '1.2rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.6rem'
                                        }}>
                                            {/* Name + Sentiment */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: '700', color: 'white', fontSize: '0.95rem' }}>
                                                        {resp.respondent_name || `Respondent ${resp.row_index + 1}`}
                                                    </div>
                                                    {resp.respondent_department && (
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: '500',
                                                            color: 'var(--text-muted)',
                                                            opacity: 0.7,
                                                            marginTop: '2px',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {resp.respondent_department}
                                                        </div>
                                                    )}
                                                </div>
                                                <SentimentBadge label={resp.sentiment_label} size="small" />
                                            </div>
                                            {/* Answers */}
                                            {nonNameCols.map(col => {
                                                const answer = resp.raw_data?.[col];
                                                if (!answer || answer === '—') return null;
                                                return (
                                                    <div key={col} style={{
                                                        background: 'rgba(0,0,0,0.2)',
                                                        padding: '0.7rem 1rem',
                                                        borderRadius: '8px',
                                                        borderLeft: '3px solid rgba(139, 92, 246, 0.3)'
                                                    }}>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                                            {col}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', lineHeight: '1.5', wordBreak: 'break-word' }}>
                                                            {answer}
                                                        </div>
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

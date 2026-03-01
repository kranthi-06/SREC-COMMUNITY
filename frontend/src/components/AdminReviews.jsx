import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, PieChart, Users, Filter, LayoutDashboard, Mail, Search, CheckCircle, PlusCircle, Trash2, Download, AlertCircle, Upload, Link2, FileSpreadsheet, Loader2, Brain, Eye, X, RefreshCw } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import SentimentDashboard from './SentimentDashboard';

const API_URL = import.meta.env.VITE_API_URL;

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

    // Import States
    const [importMode, setImportMode] = useState('none'); // 'none', 'csv', 'sheets'
    const [importTitle, setImportTitle] = useState('');
    const [sheetsUrl, setSheetsUrl] = useState('');
    const [csvFile, setCsvFile] = useState(null);
    const [csvPreview, setCsvPreview] = useState(null);
    const [importing, setImporting] = useState(false);
    const [datasets, setDatasets] = useState([]);
    const [selectedDatasetId, setSelectedDatasetId] = useState(null);
    const fileInputRef = useRef(null);

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#6366f1', '#ec4899'];

    useEffect(() => {
        if (viewMode === 'analytics') {
            fetchRequests();
        }
        fetchDatasets();
    }, [viewMode]);

    const fetchRequests = async () => {
        try {
            const res = await axios.get(`${API_URL}/reviews/admin/requests`);
            setRequests(res.data);
            if (res.data.length > 0 && !selectedRequest) {
                fetchAnalytics(res.data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch review requests');
        }
    };

    const fetchDatasets = async () => {
        try {
            const res = await axios.get(`${API_URL}/import/datasets`);
            setDatasets(res.data);
        } catch (error) {
            console.error('Failed to fetch imported datasets');
        }
    };

    const handleCSVFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCsvFile(file);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setCsvPreview({
                    columns: results.meta.fields || [],
                    data: results.data,
                    preview: results.data.slice(0, 5)
                });
            },
            error: () => {
                setStatus({ type: 'error', text: 'Failed to parse CSV file.' });
            }
        });
    };

    const handleImportCSV = async () => {
        if (!importTitle.trim()) {
            setStatus({ type: 'error', text: 'Please enter a title for this import.' });
            return;
        }
        if (!csvPreview || !csvPreview.data.length) {
            setStatus({ type: 'error', text: 'Please select a valid CSV file.' });
            return;
        }
        setImporting(true);
        setStatus({ type: '', text: '' });
        try {
            const res = await axios.post(`${API_URL}/import/upload-csv`, {
                title: importTitle,
                csvData: csvPreview.data,
                columns: csvPreview.columns,
                source_type: 'csv'
            });
            setStatus({ type: 'success', text: res.data.message });
            setImportMode('none');
            setImportTitle('');
            setCsvFile(null);
            setCsvPreview(null);
            fetchDatasets();
            // Auto-open the new dataset
            if (res.data.datasetId) {
                setSelectedDatasetId(res.data.datasetId);
            }
        } catch (error) {
            setStatus({ type: 'error', text: error.response?.data?.error || 'Failed to import CSV' });
        } finally {
            setImporting(false);
        }
    };

    const handleImportSheets = async () => {
        if (!importTitle.trim()) {
            setStatus({ type: 'error', text: 'Please enter a title for this import.' });
            return;
        }
        if (!sheetsUrl.trim()) {
            setStatus({ type: 'error', text: 'Please enter a Google Sheets URL.' });
            return;
        }
        setImporting(true);
        setStatus({ type: '', text: '' });
        try {
            const res = await axios.post(`${API_URL}/import/google-sheets`, {
                title: importTitle,
                sheetsUrl: sheetsUrl
            });
            setStatus({ type: 'success', text: res.data.message });
            setImportMode('none');
            setImportTitle('');
            setSheetsUrl('');
            fetchDatasets();
            if (res.data.datasetId) {
                setSelectedDatasetId(res.data.datasetId);
            }
        } catch (error) {
            setStatus({ type: 'error', text: error.response?.data?.error || 'Failed to import Google Sheets' });
        } finally {
            setImporting(false);
        }
    };

    const handleDeleteDataset = async (id) => {
        if (!window.confirm('Delete this imported dataset? This cannot be undone.')) return;
        try {
            await axios.delete(`${API_URL}/import/dataset/${id}`);
            setDatasets(datasets.filter(d => d.id !== id));
            if (selectedDatasetId === id) setSelectedDatasetId(null);
            setStatus({ type: 'success', text: 'Dataset deleted successfully.' });
        } catch (error) {
            setStatus({ type: 'error', text: 'Failed to delete dataset.' });
        }
    };

    const fetchAnalytics = async (requestId) => {
        setSelectedRequest(requestId);
        try {
            const res = await axios.get(`${API_URL}/reviews/admin/analytics/${requestId}`);
            setAnalyticsData(res.data);
        } catch (error) {
            console.error('Failed to load analytics', error);
        }
    };

    const handleExportCSV = (requestId) => {
        const token = localStorage.getItem('token');
        const url = `${API_URL}/reviews/admin/export/${requestId}`;
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
            const res = await axios.post(`${API_URL}/reviews/admin/create`, {
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

                            {/* ============================================ */}
                            {/*    DATA IMPORT SECTION (CSV / Google Sheets)  */}
                            {/* ============================================ */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.06), rgba(59, 130, 246, 0.04))',
                                border: '1px solid rgba(139, 92, 246, 0.15)',
                                borderRadius: '16px',
                                padding: '1.5rem 2rem',
                                marginBottom: '2.5rem'
                            }}>
                                <div className="import-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: importMode !== 'none' ? '1.5rem' : '0' }}>
                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.05rem' }}>
                                        <Brain size={20} color="#8b5cf6" />
                                        Import Feedback Data for AI Analysis
                                    </h3>
                                    <div className="import-buttons" style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => { setImportMode(importMode === 'csv' ? 'none' : 'csv'); setCsvPreview(null); setCsvFile(null); }}
                                            style={{
                                                padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                fontWeight: '700', fontSize: '0.8rem',
                                                background: importMode === 'csv' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${importMode === 'csv' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                                color: importMode === 'csv' ? '#10b981' : 'var(--text-muted)'
                                            }}
                                        >
                                            <Upload size={14} /> Upload CSV
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setImportMode(importMode === 'sheets' ? 'none' : 'sheets'); setSheetsUrl(''); }}
                                            style={{
                                                padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                fontWeight: '700', fontSize: '0.8rem',
                                                background: importMode === 'sheets' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${importMode === 'sheets' ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                                color: importMode === 'sheets' ? '#3b82f6' : 'var(--text-muted)'
                                            }}
                                        >
                                            <Link2 size={14} /> Google Sheets
                                        </button>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {importMode !== 'none' && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                                            {/* Import Title */}
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Dataset Title</label>
                                                <input
                                                    type="text"
                                                    value={importTitle}
                                                    onChange={(e) => setImportTitle(e.target.value)}
                                                    placeholder="e.g., Spring 2026 Student Feedback Survey"
                                                    style={{ width: '100%', padding: '12px 15px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.95rem', fontWeight: '600' }}
                                                />
                                            </div>

                                            {/* CSV Upload */}
                                            {importMode === 'csv' && (
                                                <div>
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept=".csv"
                                                        onChange={handleCSVFileSelect}
                                                        style={{ display: 'none' }}
                                                    />
                                                    <div
                                                        onClick={() => fileInputRef.current?.click()}
                                                        style={{
                                                            border: '2px dashed rgba(16,185,129,0.3)',
                                                            borderRadius: '12px',
                                                            padding: '2rem',
                                                            textAlign: 'center',
                                                            cursor: 'pointer',
                                                            background: 'rgba(16,185,129,0.03)',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <FileSpreadsheet size={32} color="#10b981" style={{ marginBottom: '8px' }} />
                                                        <p style={{ margin: '0 0 4px', fontWeight: '700', color: '#10b981' }}>
                                                            {csvFile ? csvFile.name : 'Click to upload CSV file'}
                                                        </p>
                                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                            {csvPreview ? `${csvPreview.data.length} rows, ${csvPreview.columns.length} columns detected` : 'Supports .csv format'}
                                                        </p>
                                                    </div>

                                                    {/* CSV Preview Table */}
                                                    {csvPreview && (
                                                        <div style={{ marginTop: '1rem', overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                            <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', fontWeight: '700', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                                Preview (first 5 rows)
                                                            </div>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                                                                <thead>
                                                                    <tr>{csvPreview.columns.map(c => <th key={c} style={{ padding: '8px 10px', textAlign: 'left', background: 'rgba(0,0,0,0.2)', color: '#8b5cf6', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{c}</th>)}</tr>
                                                                </thead>
                                                                <tbody>
                                                                    {csvPreview.preview.map((row, i) => (
                                                                        <tr key={i}>{csvPreview.columns.map(c => <td key={c} style={{ padding: '6px 10px', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.03)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[c] || '—'}</td>)}</tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={handleImportCSV}
                                                        disabled={importing || !csvPreview}
                                                        style={{
                                                            marginTop: '1rem', padding: '12px 28px', borderRadius: '10px',
                                                            background: importing ? 'rgba(16,185,129,0.1)' : 'linear-gradient(135deg, #10b981, #059669)',
                                                            border: 'none', color: 'white', fontWeight: '700', fontSize: '0.9rem',
                                                            cursor: importing ? 'not-allowed' : 'pointer',
                                                            display: 'flex', alignItems: 'center', gap: '8px',
                                                            opacity: (!csvPreview || importing) ? 0.5 : 1
                                                        }}
                                                    >
                                                        {importing ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Importing...</> : <><Brain size={16} /> Import & Analyze with AI</>}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Google Sheets URL */}
                                            {importMode === 'sheets' && (
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Google Sheets Link</label>
                                                    <input
                                                        type="url"
                                                        value={sheetsUrl}
                                                        onChange={(e) => setSheetsUrl(e.target.value)}
                                                        placeholder="https://docs.google.com/spreadsheets/d/..."
                                                        style={{ width: '100%', padding: '12px 15px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.95rem' }}
                                                    />
                                                    <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                                                        ⚠️ Sheet must be publicly accessible (Share → Anyone with the link → Viewer)
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={handleImportSheets}
                                                        disabled={importing || !sheetsUrl.trim()}
                                                        style={{
                                                            marginTop: '1rem', padding: '12px 28px', borderRadius: '10px',
                                                            background: importing ? 'rgba(59,130,246,0.1)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                                            border: 'none', color: 'white', fontWeight: '700', fontSize: '0.9rem',
                                                            cursor: importing ? 'not-allowed' : 'pointer',
                                                            display: 'flex', alignItems: 'center', gap: '8px',
                                                            opacity: (!sheetsUrl.trim() || importing) ? 0.5 : 1
                                                        }}
                                                    >
                                                        {importing ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Fetching & Analyzing...</> : <><Brain size={16} /> Fetch & Analyze with AI</>}
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                            </div>

                            {/* ============================================ */}
                            {/*    ORIGINAL FORM BUILDER BELOW               */}
                            {/* ============================================ */}
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
                                    <div key={group.id} className="filter-group-row" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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

                                        <div className="question-builder-row" style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'flex-start' }}>
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
                            {/* If a dataset is selected, show the Sentiment Dashboard full-width */}
                            {selectedDatasetId ? (
                                <SentimentDashboard
                                    datasetId={selectedDatasetId}
                                    onBack={() => { setSelectedDatasetId(null); fetchDatasets(); }}
                                />
                            ) : selectedRequest ? (
                                <SentimentDashboard
                                    requestId={selectedRequest}
                                    onBack={() => { setSelectedRequest(null); setAnalyticsData(null); }}
                                />
                            ) : (
                                <div className="analytics-layout" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                                    <div className="analytics-sidebar" style={{ width: '320px', flexShrink: 0 }}>
                                        {/* Dispatched Forms Section */}
                                        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-muted)' }}><Filter size={16} /> Dispatched Forms</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: datasets.length > 0 ? '350px' : '600px', overflowY: 'auto', paddingRight: '10px' }}>
                                            {requests.length === 0 ? <div style={{ opacity: 0.5, fontSize: '0.9rem' }}>No private forms dispatched yet.</div> :
                                                requests.map(r => (
                                                    <div
                                                        key={r.id}
                                                        onClick={() => { setSelectedDatasetId(null); setAnalyticsData(null); setSelectedRequest(r.id); }}
                                                        style={{
                                                            background: 'rgba(255,255,255,0.01)',
                                                            border: '1px solid var(--glass-border)',
                                                            padding: '15px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        <div style={{ fontWeight: '800', fontSize: '1rem', marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'white' }}>{r.title}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.questions?.length || 1} Questions</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '5px' }}>
                                                            <span>{new Date(r.created_at).toLocaleDateString()}</span>
                                                            <span style={{ color: 'var(--accent-green-light)', fontWeight: 'bold' }}>{r.total_responses}/{r.total_sent} Resp</span>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>

                                        {/* Imported Datasets Section */}
                                        {datasets.length > 0 && (
                                            <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
                                                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Brain size={16} color="#8b5cf6" /> Imported Datasets
                                                </h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '10px' }}>
                                                    {datasets.map(ds => (
                                                        <div
                                                            key={ds.id}
                                                            onClick={() => { setSelectedRequest(null); setAnalyticsData(null); setSelectedDatasetId(ds.id); }}
                                                            style={{
                                                                background: 'rgba(139, 92, 246, 0.04)',
                                                                border: '1px solid rgba(139, 92, 246, 0.12)',
                                                                padding: '15px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                                                                position: 'relative'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px' }}>
                                                                <div style={{ fontWeight: '800', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'white', flex: 1, marginRight: '8px' }}>{ds.title}</div>
                                                                <span style={{
                                                                    padding: '3px 10px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '700', flexShrink: 0,
                                                                    background: ds.status === 'complete' ? 'rgba(34,197,94,0.1)' : ds.status === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                                                    color: ds.status === 'complete' ? '#22c55e' : ds.status === 'error' ? '#ef4444' : '#f59e0b',
                                                                    border: `1px solid ${ds.status === 'complete' ? 'rgba(34,197,94,0.2)' : ds.status === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`
                                                                }}>
                                                                    {ds.status === 'complete' ? '✓ Analyzed' : ds.status === 'error' ? '✗ Error' : `⏳ ${Math.round((ds.analyzed_rows / ds.total_rows) * 100)}%`}
                                                                </span>
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span>{ds.source_type === 'google_sheets' ? '📊 Google Sheets' : '📄 CSV'} · {ds.total_rows} rows</span>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span>{new Date(ds.created_at).toLocaleDateString()}</span>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteDataset(ds.id); }}
                                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', opacity: 0.5 }}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ flex: 1, borderLeft: '1px solid var(--glass-border)', paddingLeft: '2rem', minHeight: '500px' }}>
                                        <div style={{ textAlign: 'center', margin: '4rem 0', opacity: 0.5 }}>
                                            <PieChart size={48} style={{ marginBottom: '1rem' }} /> <br />
                                            Select a dispatched form or imported dataset to view the full sentiment analysis dashboard
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminReviews;

/**
 * Import Controller — CSV / Google Sheets Feedback Import
 * ========================================================
 * Production-ready with CLIENT-DRIVEN BATCH PROCESSING.
 * 
 * On Vercel serverless, background "fire-and-forget" tasks get killed
 * when the HTTP response is sent. So instead:
 *   1. Import saves data + marks status as 'processing'
 *   2. Frontend calls /process-batch/:datasetId in a loop
 *   3. Each call processes BATCH_SIZE rows and returns progress
 *   4. Frontend stops when done:true
 */
const db = require('../db');
const axios = require('axios');
const { analyzeSentimentWithGroq } = require('../services/sentimentService');

const BATCH_SIZE = 10; // Rows per batch — fits well within Vercel's timeout

// ============================================
// SMART CLASSIFIER — instant for short text
// ============================================
function quickClassify(text) {
    const lower = text.toLowerCase().trim();

    // Numeric ratings (1-5 or 1-10 scale)
    const num = parseFloat(lower);
    if (!isNaN(num) && /^\d+(\.\d+)?$/.test(lower)) {
        if (num >= 4) return { sentiment_label: 'Positive', sentiment_score: 0.7, confidence: 0.8 };
        if (num >= 3) return { sentiment_label: 'Neutral', sentiment_score: 0.0, confidence: 0.7 };
        return { sentiment_label: 'Negative', sentiment_score: -0.6, confidence: 0.8 };
    }

    // Exact match for common short answers
    const exactPositive = ['yes', 'good', 'great', 'excellent', 'amazing', 'awesome', 'love', 'perfect', 'agree', 'strongly agree', 'satisfied', 'very satisfied', 'true', 'definitely', 'absolutely', 'sure', 'of course'];
    const exactNegative = ['no', 'bad', 'poor', 'terrible', 'worst', 'hate', 'awful', 'disagree', 'strongly disagree', 'dissatisfied', 'false', 'never', 'not at all', 'needs improvement'];
    const exactNeutral = ['maybe', 'average', 'okay', 'ok', 'neutral', 'not sure', 'sometimes', 'moderate', 'fair', 'somewhat'];

    if (exactPositive.includes(lower)) return { sentiment_label: 'Positive', sentiment_score: 0.65, confidence: 0.8 };
    if (exactNegative.includes(lower)) return { sentiment_label: 'Negative', sentiment_score: -0.65, confidence: 0.8 };
    if (exactNeutral.includes(lower)) return { sentiment_label: 'Neutral', sentiment_score: 0.0, confidence: 0.7 };

    // Keyword-based for longer short text
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'awesome', 'wonderful', 'fantastic', 'love', 'best', 'happy', 'helpful', 'thank', 'perfect', 'outstanding', 'yes', 'agree', 'satisfied', 'recommend', 'informative', 'well', 'enjoyed', 'useful', 'nice', 'brilliant', 'learned'];
    const negativeWords = ['bad', 'poor', 'terrible', 'worst', 'hate', 'awful', 'horrible', 'disappointed', 'useless', 'waste', 'boring', 'frustrating', 'no', 'disagree', 'fail', 'needs improvement', 'not good', 'not satisfied', 'lacking', 'weak', 'not organized'];

    let pos = 0, neg = 0;
    positiveWords.forEach(w => { if (lower.includes(w)) pos++; });
    negativeWords.forEach(w => { if (lower.includes(w)) neg++; });

    if (pos > neg) return { sentiment_label: 'Positive', sentiment_score: Math.min(0.3 + pos * 0.15, 0.85), confidence: 0.6 };
    if (neg > pos) return { sentiment_label: 'Negative', sentiment_score: Math.max(-0.3 - neg * 0.15, -0.85), confidence: 0.6 };
    return { sentiment_label: 'Neutral', sentiment_score: 0, confidence: 0.5 };
}

// ============================================
// ANALYZE A SINGLE ROW
// ============================================
async function analyzeRow(row, textColumns) {
    const questionSentiments = {};
    const scores = [];

    for (const col of textColumns) {
        const value = (row[col] || '').trim();
        if (value.length >= 1) {
            try {
                let result;
                if (value.length <= 50) {
                    result = quickClassify(value);
                } else {
                    result = await analyzeSentimentWithGroq(value);
                }
                questionSentiments[col] = {
                    sentiment_label: result.sentiment_label,
                    sentiment_score: result.sentiment_score,
                    confidence: result.confidence
                };
                scores.push(result.sentiment_score);
            } catch (err) {
                questionSentiments[col] = { sentiment_label: 'Neutral', sentiment_score: 0, confidence: 0 };
                scores.push(0);
            }
        }
    }

    // Compute overall from column averages
    let overallResult = { sentiment_label: 'Neutral', sentiment_score: 0, confidence: 0.5 };
    if (scores.length > 0) {
        const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
        overallResult = {
            sentiment_label: avgScore > 0.15 ? 'Positive' : avgScore < -0.15 ? 'Negative' : 'Neutral',
            sentiment_score: parseFloat(avgScore.toFixed(3)),
            confidence: 0.7
        };
    }

    return { questionSentiments, overallResult };
}

// ============================================
// GENERATE AI SUMMARY
// ============================================
async function generateSummary(datasetId) {
    const summaryRows = await db.query(`
        SELECT sentiment_label, COUNT(*) as count
        FROM imported_responses
        WHERE dataset_id = $1 AND sentiment_label IS NOT NULL
        GROUP BY sentiment_label
    `, [datasetId]);

    const counts = {};
    summaryRows.rows.forEach(r => { counts[r.sentiment_label] = parseInt(r.count); });
    const total = Object.values(counts).reduce((s, v) => s + v, 0);

    if (total === 0) return '';

    const posPercent = ((counts.Positive || 0) / total * 100).toFixed(1);
    const neutPercent = ((counts.Neutral || 0) / total * 100).toFixed(1);
    const negPercent = ((counts.Negative || 0) / total * 100).toFixed(1);

    let summary = `Out of ${total} analyzed responses: ${posPercent}% rated Positive, ${neutPercent}% Neutral, and ${negPercent}% Negative. `;

    if ((counts.Positive || 0) > (counts.Negative || 0) * 2) {
        summary += 'Overall sentiment trend is strongly positive, indicating high satisfaction among respondents.';
    } else if ((counts.Positive || 0) > (counts.Negative || 0)) {
        summary += 'Overall sentiment leans positive with room for improvement.';
    } else if ((counts.Negative || 0) > (counts.Positive || 0) * 2) {
        summary += 'Overall sentiment trend is strongly negative, indicating significant dissatisfaction that needs attention.';
    } else if ((counts.Negative || 0) > (counts.Positive || 0)) {
        summary += 'Overall sentiment leans negative — immediate review of feedback themes is recommended.';
    } else {
        summary += 'Sentiment is mixed/neutral — deeper qualitative analysis is recommended.';
    }

    return summary;
}

// ============================================
// POST /api/import/upload-csv
// ============================================
exports.importCSVData = async (req, res) => {
    try {
        const { title, csvData, columns, source_type, source_url } = req.body;
        const adminId = req.user.userId;

        if (!title || !csvData || !Array.isArray(csvData) || csvData.length === 0) {
            return res.status(400).json({ error: 'Title and CSV data are required.' });
        }
        if (!columns || !Array.isArray(columns) || columns.length === 0) {
            return res.status(400).json({ error: 'Column headers are required.' });
        }

        // Create dataset entry
        const dsResult = await db.query(`
            INSERT INTO imported_datasets (admin_id, title, source_type, source_url, columns, total_rows, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'processing')
            RETURNING id
        `, [adminId, title, source_type || 'csv', source_url || null, JSON.stringify(columns), csvData.length]);

        const datasetId = dsResult.rows[0].id;

        // Detect name column
        const nameColKey = columns.find(c =>
            /^(name|student.?name|full.?name|respondent|participant)$/i.test(c.trim())
        );

        // Insert all rows
        for (let i = 0; i < csvData.length; i++) {
            const row = csvData[i];
            const respondentName = nameColKey ? (row[nameColKey] || '').trim() : `Respondent ${i + 1}`;
            await db.query(`
                INSERT INTO imported_responses (dataset_id, row_index, respondent_name, raw_data)
                VALUES ($1, $2, $3, $4)
            `, [datasetId, i, respondentName, JSON.stringify(row)]);
        }

        if (req.audit) {
            await req.audit('IMPORT_DATASET', datasetId, {
                title, source_type: source_type || 'csv',
                rowCount: csvData.length, columnCount: columns.length
            });
        }

        // DO NOT fire-and-forget! Frontend will drive processing via /process-batch
        res.status(201).json({
            message: `Successfully imported ${csvData.length} responses. AI analysis will start now...`,
            datasetId,
            rowCount: csvData.length
        });
    } catch (error) {
        console.error('Error importing CSV data:', error);
        res.status(500).json({ error: 'Server error importing data: ' + error.message });
    }
};

// ============================================
// POST /api/import/process-batch/:datasetId
// CLIENT-DRIVEN: frontend calls this in a loop
// Each call processes BATCH_SIZE unanalyzed rows
// Returns: { analyzed, total, done, message }
// ============================================
exports.processBatch = async (req, res) => {
    try {
        const { datasetId } = req.params;

        // Get dataset info
        const dsResult = await db.query('SELECT * FROM imported_datasets WHERE id = $1', [datasetId]);
        if (dsResult.rows.length === 0) {
            return res.status(404).json({ error: 'Dataset not found' });
        }
        const dataset = dsResult.rows[0];
        const columns = dataset.columns || [];
        const nameColKey = columns.find(c =>
            /^(name|student.?name|full.?name|respondent|participant)$/i.test(c.trim())
        );
        const textColumns = columns.filter(c => c !== nameColKey);

        // Find next batch of unanalyzed rows
        const unanalyzed = await db.query(`
            SELECT row_index, raw_data FROM imported_responses
            WHERE dataset_id = $1 AND sentiment_label IS NULL
            ORDER BY row_index ASC
            LIMIT $2
        `, [datasetId, BATCH_SIZE]);

        if (unanalyzed.rows.length === 0) {
            // All done! Generate summary and mark complete
            const aiSummary = await generateSummary(datasetId);
            const totalAnalyzed = await db.query(
                'SELECT COUNT(*) as count FROM imported_responses WHERE dataset_id = $1 AND sentiment_label IS NOT NULL',
                [datasetId]
            );

            await db.query(`
                UPDATE imported_datasets 
                SET status = 'complete', analyzed_rows = $2, ai_summary = $3, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [datasetId, parseInt(totalAnalyzed.rows[0].count), aiSummary]);

            return res.json({
                analyzed: parseInt(totalAnalyzed.rows[0].count),
                total: dataset.total_rows,
                done: true,
                message: 'Analysis complete!'
            });
        }

        // Process this batch (in parallel for speed)
        const batchPromises = unanalyzed.rows.map(async (row) => {
            const rawData = row.raw_data || {};
            const { questionSentiments, overallResult } = await analyzeRow(rawData, textColumns);

            await db.query(`
                UPDATE imported_responses
                SET sentiment_label = $2, sentiment_score = $3, ai_confidence = $4,
                    question_sentiments = $5, analyzed_at = CURRENT_TIMESTAMP
                WHERE dataset_id = $1 AND row_index = $6
            `, [
                datasetId,
                overallResult.sentiment_label,
                overallResult.sentiment_score,
                overallResult.confidence,
                JSON.stringify(questionSentiments),
                row.row_index
            ]);
        });

        await Promise.all(batchPromises);

        // Count total analyzed so far
        const analyzedCount = await db.query(
            'SELECT COUNT(*) as count FROM imported_responses WHERE dataset_id = $1 AND sentiment_label IS NOT NULL',
            [datasetId]
        );
        const analyzed = parseInt(analyzedCount.rows[0].count);

        // Update progress
        await db.query(`
            UPDATE imported_datasets SET analyzed_rows = $2, status = 'processing', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [datasetId, analyzed]);

        res.json({
            analyzed,
            total: dataset.total_rows,
            done: false,
            message: `Processed ${unanalyzed.rows.length} rows (${analyzed}/${dataset.total_rows})`
        });
    } catch (error) {
        console.error('Error processing batch:', error);
        res.status(500).json({ error: 'Error processing batch: ' + error.message });
    }
};

// ============================================
// POST /api/import/google-sheets
// ============================================
exports.importGoogleSheets = async (req, res) => {
    try {
        const { title, sheetsUrl } = req.body;
        const adminId = req.user.userId;

        if (!title || !sheetsUrl) {
            return res.status(400).json({ error: 'Title and Google Sheets URL are required.' });
        }

        const sheetIdMatch = sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (!sheetIdMatch) {
            return res.status(400).json({ error: 'Invalid Google Sheets URL.' });
        }

        const sheetId = sheetIdMatch[1];
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

        let csvText;
        try {
            const response = await axios.get(csvUrl, { timeout: 30000, responseType: 'text' });
            csvText = response.data;
        } catch (fetchErr) {
            return res.status(400).json({
                error: 'Could not fetch Google Sheets data. Make sure the sheet is publicly accessible.'
            });
        }

        const lines = csvText.split('\n').map(line => parseCSVLine(line)).filter(line => line.length > 0);
        if (lines.length < 2) {
            return res.status(400).json({ error: 'The sheet appears to be empty or has only headers.' });
        }

        const columns = lines[0].map(h => h.trim());
        const csvData = [];

        for (let i = 1; i < lines.length; i++) {
            const row = {};
            const values = lines[i];
            columns.forEach((col, idx) => {
                row[col] = values[idx] !== undefined ? values[idx].trim() : '';
            });
            if (Object.values(row).some(v => v !== '')) {
                csvData.push(row);
            }
        }

        if (csvData.length === 0) {
            return res.status(400).json({ error: 'No data rows found in the Google Sheet.' });
        }

        req.body = { title, csvData, columns, source_type: 'google_sheets', source_url: sheetsUrl };
        return exports.importCSVData(req, res);
    } catch (error) {
        console.error('Error importing Google Sheets:', error);
        res.status(500).json({ error: 'Server error importing Google Sheets: ' + error.message });
    }
};

// ============================================
// GET /api/import/datasets
// ============================================
exports.getDatasets = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, title, source_type, source_url, columns, total_rows, analyzed_rows, 
                   status, ai_summary, created_at, updated_at
            FROM imported_datasets
            ORDER BY created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching datasets:', error);
        res.status(500).json({ error: 'Server error fetching datasets' });
    }
};

// ============================================
// GET /api/import/dataset/:datasetId
// ============================================
exports.getDatasetAnalysis = async (req, res) => {
    try {
        const { datasetId } = req.params;

        const dsResult = await db.query('SELECT * FROM imported_datasets WHERE id = $1', [datasetId]);
        if (dsResult.rows.length === 0) {
            return res.status(404).json({ error: 'Dataset not found' });
        }
        const dataset = dsResult.rows[0];

        const responsesResult = await db.query(`
            SELECT id, row_index, respondent_name, raw_data, sentiment_label, sentiment_score,
                   ai_confidence, question_sentiments, analyzed_at
            FROM imported_responses
            WHERE dataset_id = $1
            ORDER BY row_index ASC
        `, [datasetId]);

        const responses = responsesResult.rows;

        // Compute overall summary
        const sentimentSummary = { Positive: 0, Neutral: 0, Negative: 0, totalScore: 0, analyzed: 0 };
        responses.forEach(r => {
            if (r.sentiment_label) {
                sentimentSummary[r.sentiment_label] = (sentimentSummary[r.sentiment_label] || 0) + 1;
                sentimentSummary.totalScore += (r.sentiment_score || 0);
                sentimentSummary.analyzed++;
            }
        });
        sentimentSummary.averageScore = sentimentSummary.analyzed > 0
            ? parseFloat((sentimentSummary.totalScore / sentimentSummary.analyzed).toFixed(3))
            : null;

        // Per-question breakdown
        const columns = dataset.columns || [];
        const nameCol = columns.find(c =>
            /^(name|student.?name|full.?name|respondent|participant)$/i.test(c.trim())
        );
        const questionColumns = columns.filter(c => c !== nameCol);

        const questionAnalysis = {};
        questionColumns.forEach(col => {
            questionAnalysis[col] = { Positive: 0, Neutral: 0, Negative: 0, responses: [] };
        });

        responses.forEach(r => {
            const qSentiments = r.question_sentiments || {};
            questionColumns.forEach(col => {
                const val = r.raw_data?.[col] || '';
                if (val.trim()) {
                    const qs = qSentiments[col];
                    if (qs && qs.sentiment_label) {
                        questionAnalysis[col][qs.sentiment_label] = (questionAnalysis[col][qs.sentiment_label] || 0) + 1;
                        questionAnalysis[col].responses.push({
                            name: r.respondent_name,
                            text: val,
                            sentiment: qs.sentiment_label,
                            score: qs.sentiment_score
                        });
                    }
                }
            });
        });

        res.json({ dataset, responses, sentimentSummary, questionAnalysis, questionColumns });
    } catch (error) {
        console.error('Error fetching dataset analysis:', error);
        res.status(500).json({ error: 'Server error fetching analysis' });
    }
};

// ============================================
// DELETE /api/import/dataset/:datasetId
// ============================================
exports.deleteDataset = async (req, res) => {
    try {
        const { datasetId } = req.params;

        const check = await db.query('SELECT title FROM imported_datasets WHERE id = $1', [datasetId]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Dataset not found' });
        }

        await db.query('DELETE FROM imported_datasets WHERE id = $1', [datasetId]);

        if (req.audit) {
            await req.audit('IMPORT_DELETE', datasetId, { title: check.rows[0].title });
        }

        res.json({ message: 'Dataset deleted successfully' });
    } catch (error) {
        console.error('Error deleting dataset:', error);
        res.status(500).json({ error: 'Server error deleting dataset' });
    }
};

// ============================================
// POST /api/import/reanalyze/:datasetId
// ============================================
exports.reanalyzeDataset = async (req, res) => {
    try {
        const { datasetId } = req.params;

        const dsResult = await db.query('SELECT * FROM imported_datasets WHERE id = $1', [datasetId]);
        if (dsResult.rows.length === 0) {
            return res.status(404).json({ error: 'Dataset not found' });
        }

        // Reset all sentiments
        await db.query(`
            UPDATE imported_datasets SET status = 'processing', analyzed_rows = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [datasetId]);

        await db.query(`
            UPDATE imported_responses SET sentiment_label = NULL, sentiment_score = NULL, 
                   ai_confidence = NULL, question_sentiments = '{}', analyzed_at = NULL
            WHERE dataset_id = $1
        `, [datasetId]);

        // DON'T fire-and-forget! Frontend will drive via /process-batch
        res.json({ message: 'Reset complete. Client-driven analysis will start.' });
    } catch (error) {
        console.error('Error re-analyzing dataset:', error);
        res.status(500).json({ error: 'Server error re-analyzing dataset' });
    }
};

// ============================================
// HELPER: Parse CSV line
// ============================================
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else if (ch === '\r') {
            // skip
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

module.exports = exports;

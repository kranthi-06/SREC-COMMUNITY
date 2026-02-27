/**
 * Review Controller — Private Review System
 * ============================================
 * Admin-driven review creation, student response, and analytics.
 * ALL REVIEWS ARE PRIVATE — delivered via inbox only.
 * All actions are audit-logged.
 */
const db = require('../db');
const { processResponseSentiment } = require('../services/sentimentService');

/**
 * POST /api/reviews/admin/send-quick
 * Send a quick one-question review to specific users.
 */
exports.sendQuickReview = async (req, res) => {
    try {
        const { title, user_ids } = req.body;
        const adminId = req.user.userId;

        if (!title || !user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
            return res.status(400).json({ error: 'Title and user IDs are required.' });
        }

        const questions = [
            {
                id: 'quick_review_1',
                text: 'How would you rate your recent performance/experience?',
                type: 'OPTION_BASED',
                options: ['Good', 'Average', 'Needs Improvement']
            }
        ];

        const insertReq = await db.query(`
            INSERT INTO review_requests (admin_id, title, questions, filters)
            VALUES ($1, $2, $3, $4) RETURNING id
        `, [adminId, title, JSON.stringify(questions), JSON.stringify({})]);
        const requestId = insertReq.rows[0].id;

        for (const userId of user_ids) {
            await db.query(`
                INSERT INTO review_request_recipients (request_id, student_id)
                VALUES ($1, $2)
            `, [requestId, userId]);
        }

        // Audit: Quick Review Sent
        await req.audit('REVIEW_QUICK_SEND', requestId, {
            title,
            recipientCount: user_ids.length
        });

        res.status(201).json({ message: `Successfully sent quick review request to ${user_ids.length} users` });
    } catch (error) {
        console.error('Error creating quick review:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * POST /api/reviews/admin/create
 * Create a multi-question review request with filtered targeting.
 * Supports OPTION_BASED, EMOJI_BASED, and RATING_BASED question types.
 */
exports.createReviewRequest = async (req, res) => {
    try {
        const { title, questions, filters, filterGroups, user_ids } = req.body;
        const adminId = req.user.userId;

        if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ error: 'Title and at least one question are mandatory.' });
        }

        // Validate question structure
        for (const q of questions) {
            if (!q.id || !q.text || !q.type) {
                return res.status(400).json({ error: 'Each question must have id, text, and type.' });
            }
            const validTypes = ['OPTION_BASED', 'EMOJI_BASED', 'RATING_BASED', 'TEXT_BASED'];
            if (!validTypes.includes(q.type)) {
                return res.status(400).json({ error: `Invalid question type: ${q.type}. Must be one of: ${validTypes.join(', ')}` });
            }
        }

        let recipientIds = [];

        // Mode 1: Direct user_ids targeting (from admin user table)
        if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
            recipientIds = user_ids;
        } else {
            // Mode 2: Filter-based targeting
            const targetGroups = filterGroups || (filters ? [filters] : []);

            let queryStr = 'SELECT id FROM users WHERE role = $1';
            let vals = ['student'];
            let count = 2;

            if (targetGroups.length > 0) {
                const groupClauses = [];
                targetGroups.forEach(group => {
                    const clauses = [];
                    if (group.department) {
                        clauses.push(`department = $${count}`);
                        vals.push(group.department);
                        count++;
                    }
                    if (group.year) {
                        clauses.push(`(batch_year = $${count} OR left(split_part(email, '@', 1), 2) = $${count})`);
                        vals.push(group.year);
                        count++;
                    }
                    if (clauses.length > 0) {
                        groupClauses.push(`(${clauses.join(' AND ')})`);
                    }
                });

                if (groupClauses.length > 0) {
                    queryStr += ` AND (${groupClauses.join(' OR ')})`;
                }
            }

            const students = await db.query(queryStr, vals);
            recipientIds = students.rows.map(s => s.id);
        }

        if (recipientIds.length === 0) {
            return res.status(400).json({ error: 'Zero users found matching the selected criteria.' });
        }

        const insertReq = await db.query(`
            INSERT INTO review_requests (admin_id, title, questions, filters)
            VALUES ($1, $2, $3, $4) RETURNING id
        `, [adminId, title, JSON.stringify(questions), JSON.stringify(filterGroups || [])]);
        const requestId = insertReq.rows[0].id;

        // Populate recipients
        for (const userId of recipientIds) {
            await db.query(`
                INSERT INTO review_request_recipients (request_id, student_id)
                VALUES ($1, $2)
            `, [requestId, userId]);
        }

        // Audit: Review Created
        await req.audit('REVIEW_CREATE', requestId, {
            title,
            questionCount: questions.length,
            recipientCount: recipientIds.length
        });

        res.status(201).json({ message: `Successfully dispatched review form to ${recipientIds.length} targeted users` });
    } catch (error) {
        console.error('Error creating review form:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
};

/**
 * GET /api/reviews/admin/requests
 * Get all review requests with response statistics.
 */
exports.getAdminReviewRequests = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT rr.*, u.full_name as creator_name,
               (SELECT COUNT(*) FROM review_request_recipients rrr WHERE rrr.request_id = rr.id) as total_sent,
               (SELECT COUNT(*) FROM review_responses res WHERE res.request_id = rr.id) as total_responses
            FROM review_requests rr
            JOIN users u ON rr.admin_id = u.id
            ORDER BY rr.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * GET /api/reviews/admin/analytics/:requestId
 * Get detailed analytics for a specific review request.
 * Includes distribution data and filterable raw responses.
 */
exports.getReviewAnalytics = async (req, res) => {
    try {
        const { requestId } = req.params;

        const requestCheck = await db.query('SELECT * FROM review_requests WHERE id = $1', [requestId]);
        if (requestCheck.rows.length === 0) return res.status(404).json({ error: 'Review request not found' });
        const requestData = requestCheck.rows[0];

        // Get total sent count
        const sentCount = await db.query(
            'SELECT COUNT(*) as count FROM review_request_recipients WHERE request_id = $1',
            [requestId]
        );

        const responses = await db.query(`
            SELECT answers, department, year_string, created_at,
                   sentiment_label, sentiment_score, ai_confidence, analyzed_at
            FROM review_responses
            WHERE request_id = $1
        `, [requestId]);

        // Aggregate analytics per question
        const distributions = {};
        const departmentBreakdown = {};
        const sentimentSummary = { Positive: 0, Neutral: 0, Negative: 0, totalScore: 0, analyzed: 0 };

        requestData.questions.forEach(q => {
            distributions[q.id] = {};
        });

        responses.rows.forEach(r => {
            const answers = r.answers || {};
            const dept = r.department || 'Unknown';

            if (!departmentBreakdown[dept]) departmentBreakdown[dept] = 0;
            departmentBreakdown[dept]++;

            for (const [qId, ans] of Object.entries(answers)) {
                if (!distributions[qId]) distributions[qId] = {};
                // For TEXT_BASED, don't aggregate the text as distribution options
                const question = requestData.questions.find(q => q.id === qId);
                if (question && question.type !== 'TEXT_BASED') {
                    distributions[qId][ans] = (distributions[qId][ans] || 0) + 1;
                }
            }

            // Aggregate sentiment data
            if (r.sentiment_label) {
                sentimentSummary[r.sentiment_label] = (sentimentSummary[r.sentiment_label] || 0) + 1;
                sentimentSummary.totalScore += (r.sentiment_score || 0);
                sentimentSummary.analyzed++;
            }
        });

        sentimentSummary.averageScore = sentimentSummary.analyzed > 0
            ? parseFloat((sentimentSummary.totalScore / sentimentSummary.analyzed).toFixed(3))
            : null;

        res.json({
            request: requestData,
            total_sent: parseInt(sentCount.rows[0].count),
            total_responses: responses.rows.length,
            pending: parseInt(sentCount.rows[0].count) - responses.rows.length,
            distributions,
            departmentBreakdown,
            sentimentSummary,
            raw_responses: responses.rows
        });
    } catch (error) {
        console.error('Error computing analytics:', error);
        res.status(500).json({ error: 'Internal Server Error Computing Analytics' });
    }
};

/**
 * GET /api/reviews/admin/export/:requestId
 * Export review analytics as CSV.
 */
exports.exportReviewData = async (req, res) => {
    try {
        const { requestId } = req.params;

        const requestCheck = await db.query('SELECT title, questions FROM review_requests WHERE id = $1', [requestId]);
        if (requestCheck.rows.length === 0) return res.status(404).json({ error: 'Review request not found' });

        const { title, questions } = requestCheck.rows[0];

        const responses = await db.query(`
            SELECT r.answers, r.department, r.year_string, r.created_at,
                   u.full_name, u.email
            FROM review_responses r
            JOIN users u ON r.student_id = u.id
            WHERE r.request_id = $1
            ORDER BY r.created_at ASC
        `, [requestId]);

        // Build CSV
        const questionHeaders = questions.map(q => q.text);
        const csvHeaders = ['Name', 'Email', 'Department', 'Year', ...questionHeaders, 'Submitted At'];

        const csvRows = responses.rows.map(r => {
            const answers = r.answers || {};
            const answerValues = questions.map(q => answers[q.id] || '');
            return [
                r.full_name,
                r.email,
                r.department || '',
                r.year_string || '',
                ...answerValues,
                new Date(r.created_at).toISOString()
            ];
        });

        const csvContent = [
            csvHeaders.join(','),
            ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Audit: Export
        await req.audit('REVIEW_EXPORT', requestId, { title, responseCount: responses.rows.length });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="review_${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.csv"`);
        res.send(csvContent);
    } catch (error) {
        console.error('Error exporting review data:', error);
        res.status(500).json({ error: 'Server error exporting data' });
    }
};

/**
 * GET /api/reviews/student/inbox
 * Get all review requests assigned to the current student.
 */
exports.getStudentInboxReviews = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const result = await db.query(`
            SELECT rr.*, rrr.is_answered
            FROM review_requests rr
            JOIN review_request_recipients rrr ON rr.id = rrr.request_id
            WHERE rrr.student_id = $1
            ORDER BY rr.created_at DESC
        `, [studentId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error tracking inbox requests:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * POST /api/reviews/student/submit/:requestId
 * Submit a response to a private review request.
 * Can only be submitted ONCE. Cannot be edited after submission.
 */
exports.submitReviewResponse = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { answers } = req.body;
        const studentId = req.user.userId;

        if (!answers || Object.keys(answers).length === 0) {
            return res.status(400).json({ error: 'Answers must be provided.' });
        }

        const recipientCheck = await db.query(
            `SELECT is_answered FROM review_request_recipients WHERE request_id = $1 AND student_id = $2`,
            [requestId, studentId]
        );

        if (recipientCheck.rows.length === 0) {
            return res.status(403).json({ error: 'You do not have access to this private review request.' });
        }

        if (recipientCheck.rows[0].is_answered) {
            return res.status(400).json({ error: 'You have already submitted a response for this form.' });
        }

        // Get student department/year for analytics metadata
        const studentQuery = await db.query(`SELECT department, email FROM users WHERE id = $1`, [studentId]);
        const dept = studentQuery.rows[0].department;
        const yearStr = studentQuery.rows[0].email.split('@')[0].substring(0, 2);

        // Add response
        const insertResult = await db.query(`
            INSERT INTO review_responses (request_id, student_id, department, year_string, answers)
            VALUES ($1, $2, $3, $4, $5) RETURNING id
        `, [requestId, studentId, dept, yearStr, JSON.stringify(answers)]);
        const responseId = insertResult.rows[0].id;

        // Mark as answered
        await db.query(`
            UPDATE review_request_recipients SET is_answered = true WHERE request_id = $1 AND student_id = $2
        `, [requestId, studentId]);

        // Check if any answers are TEXT_BASED — trigger async AI sentiment analysis
        const reviewReq = await db.query('SELECT questions FROM review_requests WHERE id = $1', [requestId]);
        if (reviewReq.rows.length > 0) {
            const questions = reviewReq.rows[0].questions || [];
            const textQuestions = questions.filter(q => q.type === 'TEXT_BASED');
            if (textQuestions.length > 0) {
                // Collect all text answers
                const textAnswers = textQuestions
                    .map(q => answers[q.id])
                    .filter(a => a && typeof a === 'string' && a.trim().length > 0);
                if (textAnswers.length > 0) {
                    const combinedText = textAnswers.join(' ');
                    // Fire-and-forget — do NOT block the response
                    processResponseSentiment(responseId, combinedText).catch(err => {
                        console.error('[Sentiment] Background processing error:', err.message);
                    });
                }
            }
        }

        // Audit: Review Response
        await req.audit('REVIEW_RESPONSE', requestId, {
            questionCount: Object.keys(answers).length
        });

        res.status(201).json({ message: 'Review successfully recorded.' });
    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({ error: 'Internal Server Error Submitting Feedback' });
    }
};

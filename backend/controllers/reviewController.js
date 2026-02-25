const db = require('../db');

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

        res.status(201).json({ message: `Successfully sent quick review request to ${user_ids.length} users` });
    } catch (error) {
        console.error('Error creating quick review:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.createReviewRequest = async (req, res) => {
    try {
        const { title, questions, filters } = req.body;
        const adminId = req.user.userId;

        if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ error: 'Title and at least one question are mandatory.' });
        }

        // Generate query to find right students
        let queryStr = 'SELECT id FROM users WHERE role = $1';
        let vals = ['student'];
        let count = 2;

        if (filters.department) {
            queryStr += ` AND department = $${count}`;
            vals.push(filters.department); // Removed .toLowerCase() as departments are mixed case now
            count++;
        }
        if (filters.year) {
            queryStr += ` AND batch_year = $${count}`; // Using batch_year column
            vals.push(filters.year);
            count++;
        }

        const students = await db.query(queryStr, vals);

        if (students.rows.length === 0) {
            return res.status(400).json({ error: 'No students found matching these filters.' });
        }

        const insertReq = await db.query(`
            INSERT INTO review_requests (admin_id, title, questions, filters)
            VALUES ($1, $2, $3, $4) RETURNING id
        `, [adminId, title, JSON.stringify(questions), JSON.stringify(filters)]);
        const requestId = insertReq.rows[0].id;

        // Insert into recipients
        for (const student of students.rows) {
            await db.query(`
                INSERT INTO review_request_recipients (request_id, student_id)
                VALUES ($1, $2)
            `, [requestId, student.id]);
        }

        res.status(201).json({ message: `Successfully sent review form to ${students.rows.length} students` });
    } catch (error) {
        console.error('Error creating review form:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

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

exports.getReviewAnalytics = async (req, res) => {
    try {
        const { requestId } = req.params;

        const requestCheck = await db.query('SELECT * FROM review_requests WHERE id = $1', [requestId]);
        if (requestCheck.rows.length === 0) return res.status(404).json({ error: 'Review request not found' });
        const requestData = requestCheck.rows[0];

        const responses = await db.query(`
            SELECT answers, department, year_string, created_at
            FROM review_responses
            WHERE request_id = $1
        `, [requestId]);

        // Aggregate analytics per question: 
        const distributions = {};

        // Initialize distribution mappings based on questions array
        requestData.questions.forEach(q => {
            distributions[q.id] = {};
        });

        responses.rows.forEach(r => {
            const answers = r.answers || {};
            for (const [qId, ans] of Object.entries(answers)) {
                if (!distributions[qId]) distributions[qId] = {};
                distributions[qId][ans] = (distributions[qId][ans] || 0) + 1;
            }
        });

        res.json({
            request: requestData,
            total_responses: responses.rows.length,
            distributions,
            raw_responses: responses.rows
        });
    } catch (error) {
        console.error('Error computing analytics:', error);
        res.status(500).json({ error: 'Internal Server Error Computing Analytics' });
    }
};

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

exports.submitReviewResponse = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { answers } = req.body;
        const studentId = req.user.userId;

        if (!answers || Object.keys(answers).length === 0) {
            return res.status(400).json({ error: 'Answers must be provided.' });
        }

        const recipientCheck = await db.query(`SELECT is_answered FROM review_request_recipients WHERE request_id = $1 AND student_id = $2`, [requestId, studentId]);

        if (recipientCheck.rows.length === 0) {
            return res.status(403).json({ error: 'You do not have access to this private review request.' });
        }

        if (recipientCheck.rows[0].is_answered) {
            return res.status(400).json({ error: 'You have already submitted a response for this form.' });
        }

        // Get student department/year for analytics metadata mapping securely:
        const studentQuery = await db.query(`SELECT department, email FROM users WHERE id = $1`, [studentId]);
        const dept = studentQuery.rows[0].department;
        const yearStr = studentQuery.rows[0].email.split('@')[0].substring(0, 2); // Extracts year prefix

        // Add response
        await db.query(`
            INSERT INTO review_responses (request_id, student_id, department, year_string, answers)
            VALUES ($1, $2, $3, $4, $5)
        `, [requestId, studentId, dept, yearStr, JSON.stringify(answers)]);

        // Mark recipient row as answered
        await db.query(`
            UPDATE review_request_recipients SET is_answered = true WHERE request_id = $1 AND student_id = $2
        `, [requestId, studentId]);

        res.status(201).json({ message: 'Review successfully recorded.' });
    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({ error: 'Internal Server Error Submitting Feedback' });
    }
};

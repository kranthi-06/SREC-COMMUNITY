const db = require('../db');

exports.getAllEvents = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT e.id, e.title, e.description, e.department, e.event_date, e.status, e.attachment_url, e.category, e.created_at,
                   u.full_name as creator_name
            FROM campus_events e
            JOIN users u ON e.creator_id = u.id
            ORDER BY e.event_date DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Server error retrieving events' });
    }
};

exports.createEvent = async (req, res) => {
    try {
        const { title, description, department, event_date, category } = req.body;
        let attachment_url = null;

        if (req.file) {
            attachment_url = `/uploads/${req.file.filename}`;
        }

        if (!title || !description || !event_date || !category) {
            return res.status(400).json({ error: 'Missing mandatory event parameters.' });
        }

        const validCategories = ['Upcoming Events', 'Ongoing Events', 'Completed Events', 'Department-specific Monthly Events'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid Category format.' });
        }

        const result = await db.query(`
            INSERT INTO campus_events (creator_id, title, description, department, event_date, status, attachment_url, category)
            VALUES ($1, $2, $3, $4, $5, 'upcoming', $6, $7) RETURNING id
        `, [req.user.userId, title, description, department || null, new Date(event_date), attachment_url, category]);

        res.status(201).json({ message: 'Campus event synthesized', id: result.rows[0].id });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Server error initiating event sequence' });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const check = await db.query('SELECT creator_id FROM campus_events WHERE id = $1', [id]);

        if (check.rows.length === 0) return res.status(404).json({ error: 'Event not found' });

        // Ensure only admin roles touch these events (guaranteed by adminOnly middleware in route)
        await db.query('DELETE FROM campus_events WHERE id = $1', [id]);
        res.json({ message: 'Event permanently purged' });
    } catch (error) {
        res.status(500).json({ error: 'Server error eliminating event' });
    }
};

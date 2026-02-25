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
        const { title, description, department, event_date, event_time, category, type, media_url } = req.body;

        // Use category if provided, otherwise fallback to 'type' from frontend
        const finalCategory = category || type;

        let attachment_url = media_url || null;

        if (req.file) {
            attachment_url = `/uploads/${req.file.filename}`;
        }

        if (!title || !description || !event_date || !finalCategory) {
            return res.status(400).json({ error: 'Missing mandatory event parameters (title, description, date, and category are required).' });
        }

        // Expanded validation to include frontend types
        const validCategories = [
            'Upcoming Events', 'Ongoing Events', 'Completed Events', 'Department-specific Monthly Events',
            'Workshop', 'Fest', 'Seminar', 'Cultural', 'Sports'
        ];

        if (!validCategories.includes(finalCategory)) {
            return res.status(400).json({ error: `Invalid Category: ${finalCategory}. Valid options are: ${validCategories.join(', ')}` });
        }

        // Combine date and time if time is provided
        let finalDate = new Date(event_date);
        if (event_time && event_time.includes(':')) {
            const [hours, minutes] = event_time.split(':');
            finalDate.setHours(parseInt(hours), parseInt(minutes));
        }

        const result = await db.query(`
            INSERT INTO campus_events (creator_id, title, description, department, event_date, status, attachment_url, category)
            VALUES ($1, $2, $3, $4, $5, 'upcoming', $6, $7) RETURNING id
        `, [req.user.userId, title, description, department || null, finalDate, attachment_url, finalCategory]);

        res.status(201).json({ message: 'Campus event synthesized', id: result.rows[0].id });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
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

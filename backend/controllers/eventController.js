const db = require('../db');

exports.getAllEvents = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT e.id, e.title, e.description, e.department, e.event_date, e.event_end_date, e.status, e.attachment_url, e.category, e.event_type, e.created_at,
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
        const { title, description, department, event_date, event_time, event_end_date, event_end_time, category, type, media_url } = req.body;

        // Final Event Type (Workshop, Fest, etc)
        const finalEventType = type || category || 'General';

        let attachment_url = media_url || null;

        if (req.file) {
            const b64 = req.file.buffer.toString('base64');
            const mime = req.file.mimetype;
            attachment_url = `data:${mime};base64,${b64}`;
        }

        if (!title || !description || !event_date) {
            return res.status(400).json({ error: 'Missing mandatory event parameters (title, description, and start date are required).' });
        }

        // Parse Start Date/Time
        let finalStartDate = new Date(event_date);
        if (event_time && event_time.includes(':')) {
            const [hours, minutes] = event_time.split(':');
            finalStartDate.setHours(parseInt(hours), parseInt(minutes));
        }

        // Parse End Date/Time (Default to 2 hours after start if not provided)
        let finalEndDate;
        if (event_end_date) {
            finalEndDate = new Date(event_end_date);
            if (event_end_time && event_end_time.includes(':')) {
                const [ehours, eminutes] = event_end_time.split(':');
                finalEndDate.setHours(parseInt(ehours), parseInt(eminutes));
            }
        } else {
            finalEndDate = new Date(finalStartDate.getTime() + (2 * 60 * 60 * 1000));
        }

        // Automatic Categorization based on Date
        const now = new Date();
        let computedCategory = 'Upcoming Events';
        let computedStatus = 'upcoming';

        if (now >= finalStartDate && now <= finalEndDate) {
            computedCategory = 'Ongoing Events';
            computedStatus = 'ongoing';
        } else if (now > finalEndDate) {
            computedCategory = 'Completed Events';
            computedStatus = 'completed';
        }

        // If the admin manually specified 'Department-specific Monthly Events', preserve it
        const finalCategory = (category === 'Department-specific Monthly Events' || type === 'Department-specific Monthly Events')
            ? 'Department-specific Monthly Events'
            : computedCategory;

        const result = await db.query(`
            INSERT INTO campus_events (creator_id, title, description, department, event_date, event_end_date, status, attachment_url, category, event_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
        `, [req.user.userId, title, description, department || null, finalStartDate, finalEndDate, computedStatus, attachment_url, finalCategory, finalEventType]);

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

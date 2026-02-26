/**
 * Event Controller — Campus Events Management
 * ==============================================
 * CRUD for campus events with auto-categorization.
 * All mutations are audit-logged.
 */
const db = require('../db');

/**
 * GET /api/events
 * Get all events. Publicly accessible (no auth required).
 * Auto-updates status based on current time.
 */
exports.getAllEvents = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT e.id, e.title, e.description, e.department, e.event_date, e.event_end_date, 
                   e.status, e.attachment_url, e.category, e.event_type, e.created_at,
                   u.full_name as creator_name
            FROM campus_events e
            JOIN users u ON e.creator_id = u.id
            ORDER BY e.event_date DESC
        `);

        // Auto-update status based on current time
        const now = new Date();
        const events = result.rows.map(event => {
            const startDate = new Date(event.event_date);
            const endDate = event.event_end_date ? new Date(event.event_end_date) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

            let computedStatus = 'upcoming';
            let computedCategory = 'Upcoming Events';

            if (now >= startDate && now <= endDate) {
                computedStatus = 'ongoing';
                computedCategory = 'Ongoing Events';
            } else if (now > endDate) {
                computedStatus = 'completed';
                computedCategory = 'Completed Events';
            }

            // Preserve department-specific category
            if (event.category === 'Department-specific Monthly Events') {
                computedCategory = 'Department-specific Monthly Events';
            }

            return {
                ...event,
                status: computedStatus,
                category: computedCategory
            };
        });

        res.json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Server error retrieving events' });
    }
};

/**
 * POST /api/events/add
 * Create a new campus event. Admin only.
 */
exports.createEvent = async (req, res) => {
    try {
        const { title, description, department, event_date, event_time, event_end_date, event_end_time, category, type, media_url } = req.body;

        const finalEventType = type || category || 'General';

        let attachment_url = media_url || null;

        if (req.file) {
            attachment_url = `/uploads/${req.file.filename}`;
        }

        if (!title || !description || !event_date) {
            return res.status(400).json({ error: 'Missing mandatory event parameters (title, description, and start date are required).' });
        }

        if (title.length > 255) {
            return res.status(400).json({ error: 'Event title must be less than 255 characters.' });
        }

        // Parse Start Date/Time
        let finalStartDate = new Date(event_date);
        if (event_time && event_time.includes(':')) {
            const [hours, minutes] = event_time.split(':');
            finalStartDate.setHours(parseInt(hours), parseInt(minutes));
        }

        // Parse End Date/Time
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

        // Validate dates
        if (finalEndDate <= finalStartDate) {
            return res.status(400).json({ error: 'End date must be after start date.' });
        }

        // Automatic Categorization
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

        const finalCategory = (category === 'Department-specific Monthly Events' || type === 'Department-specific Monthly Events')
            ? 'Department-specific Monthly Events'
            : computedCategory;

        const result = await db.query(`
            INSERT INTO campus_events (creator_id, title, description, department, event_date, event_end_date, status, attachment_url, category, event_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
        `, [req.user.userId, title, description, department || null, finalStartDate, finalEndDate, computedStatus, attachment_url, finalCategory, finalEventType]);

        // Audit: Event Created
        await req.audit('EVENT_CREATE', result.rows[0].id, {
            title,
            department: department || 'All',
            eventType: finalEventType,
            startDate: finalStartDate.toISOString(),
            endDate: finalEndDate.toISOString()
        });

        res.status(201).json({ message: 'Campus event created successfully', id: result.rows[0].id });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
};

/**
 * DELETE /api/events/:id
 * Delete a campus event. Admin only.
 */
exports.deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const check = await db.query('SELECT creator_id, title FROM campus_events WHERE id = $1', [id]);

        if (check.rows.length === 0) return res.status(404).json({ error: 'Event not found' });

        await db.query('DELETE FROM campus_events WHERE id = $1', [id]);

        // Audit: Event Deleted
        await req.audit('EVENT_DELETE', id, { title: check.rows[0].title });

        res.json({ message: 'Event permanently deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Server error deleting event' });
    }
};

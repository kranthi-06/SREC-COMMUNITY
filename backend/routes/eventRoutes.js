const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { generateDescriptionFromImage } = require('../services/imageDescriptionService');

router.get('/', eventController.getAllEvents);
router.post('/add', protect, adminOnly, upload.single('media'), eventController.createEvent);
router.delete('/:id', protect, adminOnly, eventController.deleteEvent);

/**
 * POST /api/events/generate-description
 * Accepts an uploaded image, extracts text via OCR, and generates
 * an AI-powered event description using Groq LLM.
 * Admin only — used on the event creation form.
 */
router.post('/generate-description', protect, adminOnly, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded. Please upload an event poster image first.' });
        }

        // Only allow image files
        if (!req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({ error: 'Only image files are supported for AI description generation.' });
        }

        const result = await generateDescriptionFromImage(req.file.buffer);

        res.json({
            description: result.description,
            extractedText: result.extractedText
        });
    } catch (error) {
        console.error('[AI Description] Error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to generate description from image.' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', protect, eventController.getAllEvents);
router.post('/add', protect, adminOnly, upload.single('media'), eventController.createEvent);
router.delete('/:id', protect, adminOnly, eventController.deleteEvent);

module.exports = router;

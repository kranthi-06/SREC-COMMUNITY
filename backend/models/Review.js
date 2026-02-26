const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  studentName: {
    type: String,
    required: true
  },
  eventName: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    required: true,
    enum: ['Fest', 'Workshop', 'Seminar', 'Cultural Event', 'Technical Event', 'Other']
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  description: {
    type: String,
    required: true
  },
  sentiment: {
    type: String,
    required: true,
    enum: ['Positive', 'Negative', 'Neutral']
  },
  score: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  batchId: {
    type: String,
    default: 'manual'
  }
});

module.exports = mongoose.model('Review', ReviewSchema);

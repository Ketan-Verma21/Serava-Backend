const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  events: [{
    eventId: String,
    summary: String,
    description: String,
    start: Date,
    end: Date,
    timeZone: String,
    status: String,
    location: String,
    attendees: [{
      email: String,
      responseStatus: String
    }]
  }],
  lastFetched: {
    type: Date,
    default: Date.now,
    expires: 86400 // TTL of 24 hours (in seconds)
  }
}, {
  timestamps: true
});

// Compound index for faster queries by date and userId
calendarEventSchema.index({ date: 1, userId: 1 });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema); 
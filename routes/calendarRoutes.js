// File: Backend/routes/calendarRoutes.js

const express = require('express');
const router = express.Router();
const calendarService = require('../services/calendarService');

// Redirect user to Google OAuth
router.get('/auth/google', (req, res) => {
  const url = calendarService.getAuthURL();
  res.redirect(url);
});

// Google OAuth callback
router.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const tokens = await calendarService.getTokens(code);
    res.json({ message: 'Tokens received', tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List events
router.post('/events', async (req, res) => {
  try {
    const { tokens } = req.body;
    calendarService.setCredentials(tokens);
    const events = await calendarService.listEvents();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create event
router.post('/create-event', async (req, res) => {
  try {
    const { tokens, eventData } = req.body;
    calendarService.setCredentials(tokens);
    const event = await calendarService.createEvent(eventData);
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update event
router.put('/update-event/:eventId', async (req, res) => {
  try {
    const { access_token, updatedEvent } = req.body;
    const { eventId } = req.params;
    const event = await calendarService.updateCalendarEvent(access_token, eventId, updatedEvent);
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update event.' });
  }
});

// Delete event
router.delete('/delete-event/:eventId', async (req, res) => {
  try {
    const { access_token } = req.body;
    const { eventId } = req.params;
    const result = await calendarService.deleteCalendarEvent(access_token, eventId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete event.' });
  }
});

module.exports = router;

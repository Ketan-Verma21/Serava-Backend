const express = require('express');
const router = express.Router();
const calendarService = require('../services/calendarService');

// Route 1: Redirect user to Google OAuth
router.get('/auth/google', (req, res) => {
  const url = calendarService.getAuthURL();
  res.redirect(url);
});

// Route 2: Google callback with code
router.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const tokens = await calendarService.getTokens(code);
    res.json({ message: 'Tokens received', tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route 3: List events
router.post('/events', async (req, res) => {
  try {
    const tokens = req.body.tokens;
    calendarService.setCredentials(tokens);
    const events = await calendarService.listEvents();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route 4: Create event
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

module.exports = router;

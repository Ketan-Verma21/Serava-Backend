// File: Backend/routes/calendarRoutes.js

const express = require('express');
const router = express.Router();
const calendarService = require('../services/calendarService');
const authMiddleware = require('../middleware/auth');

// Redirect user to Google OAuth
router.get('/auth/google', (req, res) => {
  const url = calendarService.getAuthURL();
  res.redirect(url);
});

// Google OAuth callback
router.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  
  try {
    const { tokens, email } = await calendarService.getTokens(code);
    res.json({ 
      message: 'Tokens received and stored',
      email,
      tokens: {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiresAt: tokens.expiry_date
      }
    });
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).json({ error: err.message });
  }
});

// List events
router.get('/events', authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const access_token = await calendarService.getValidAccessToken(email);
    const events = await calendarService.getCalendarEvents(access_token);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create event
router.post('/create-event', authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const { eventData } = req.body;
    const access_token = await calendarService.getValidAccessToken(email);
    const event = await calendarService.createCalendarEvent(access_token, eventData);
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update event
router.put('/update-event/:eventId', authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const { updatedEvent } = req.body;
    const { eventId } = req.params;
    const access_token = await calendarService.getValidAccessToken(email);
    const event = await calendarService.updateCalendarEvent(access_token, eventId, updatedEvent);
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update event.' });
  }
});

// Delete event
router.delete('/delete-event/:eventId', authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const { eventId } = req.params;
    const access_token = await calendarService.getValidAccessToken(email);
    const result = await calendarService.deleteCalendarEvent(access_token, eventId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete event.' });
  }
});

// Refresh access token
router.post('/refresh-token', authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const tokens = await calendarService.getValidAccessToken(email);
    res.json({ message: 'Token refreshed successfully', tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test route to verify token storage
router.get('/test-tokens/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const tokens = await calendarService.getValidAccessToken(email);
    res.json({ 
      message: 'Token verification successful',
      hasValidToken: !!tokens
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

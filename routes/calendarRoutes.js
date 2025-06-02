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
        expiresAt: tokens.expiry_date,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token
      }
    });
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).json({ error: err.message });
  }
});
const { OAuth2Client } = require('google-auth-library');
const tokenService = require('../services/tokenService');

const oauthClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI // must match your Google OAuth redirect URI
);

router.post('/auth/google/token-verify', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Either idToken or authorization code is required' });
  }

  try {
    let tokens, email;

    if (code) {
      // 1. Exchange authorization code for tokens
      const tokenResponse = await oauthClient.getToken(code);
      tokens = tokenResponse.tokens;
      oauthClient.setCredentials(tokens);

      // 2. Verify ID token to get user info
      const ticket = await oauthClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload.email;

      if (!email) {
        return res.status(400).json({ error: 'Email not found in token payload' });
      }

      // 3. Store tokens in DB (create or update)
      await tokenService.storeTokens(email, tokens);

    } else {
      // idToken is provided (no code)
      // 1. Verify ID token to get email
      const ticket = await oauthClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload.email;

      if (!email) {
        return res.status(400).json({ error: 'Email not found in token payload' });
      }

      // 2. Fetch tokens from DB for this email
      tokens = await tokenService.getTokens(email);

      if (!tokens) {
        return res.status(401).json({ error: 'Tokens not found for user, please login again with authorization code' });
      }
    }

    // Respond with token info
    res.json({
      email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date || tokens.expires_at,
    });
  } catch (error) {
    console.error('Error in token-verify:', error);
    res.status(401).json({ error: 'Invalid token or code' });
  }
});


// List events
router.get('/events', authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const access_token = await calendarService.getValidAccessToken(email);
    const events = await calendarService.bbbkigim         (access_token);
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

// Get events for a specific date
router.get('/events/date/:date', authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const { date } = req.params;
    const access_token = await calendarService.getValidAccessToken(email);
    const events = await calendarService.getEventsForDate(access_token, date);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

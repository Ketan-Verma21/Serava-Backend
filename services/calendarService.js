// File: Backend/services/calendarService.js

const { google } = require('googleapis');
require('dotenv').config();
const axios = require('axios');
const tokenService = require('./tokenService');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Generate Google OAuth URL
function getAuthURL() {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email' // Add email scope
  ];
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes
  });
}

// Get user email from Google
async function getUserEmail(access_token) {
  const oauth2 = google.oauth2({
    version: 'v2',
    auth: oauth2Client
  });
  
  const { data } = await oauth2.userinfo.get();
  return data.email;
}

// Exchange code for tokens
async function getTokens(code) {
  console.log('Getting tokens from Google');
  const { tokens } = await oauth2Client.getToken(code);
  console.log('Received tokens from Google:', {
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    expiryDate: tokens.expiry_date
  });
  
  oauth2Client.setCredentials(tokens);
  
  // Get user's email
  const email = await getUserEmail(tokens.access_token);
  console.log('User email:', email);
  
  // Store tokens using email as userId
  await tokenService.storeTokens(email, tokens);
  
  return {
    tokens,
    email
  };
}

// Refresh access token using refresh token
async function refreshAccessToken(refresh_token, email) {
  try {
    console.log('Refreshing access token for user:', email);
    oauth2Client.setCredentials({
      refresh_token: refresh_token
    });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    console.log('Received new credentials from Google:', {
      hasAccessToken: !!credentials.access_token,
      expiryDate: credentials.expiry_date
    });
    
    // Update tokens in MongoDB using email
    await tokenService.updateTokens(email, credentials);
    
    return credentials;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('Failed to refresh access token');
  }
}

// Get valid access token
async function getValidAccessToken(email) {
  try {
    console.log('Getting valid access token for user:', email);
    const tokens = await tokenService.getTokens(email);
    
    if (!tokens) {
      console.log('No tokens found for user:', email);
      throw new Error('No tokens found for user');
    }
    
    if (tokenService.isTokenExpired(tokens.expires_at)) {
      console.log('Token expired, refreshing for user:', email);
      const newTokens = await refreshAccessToken(tokens.refresh_token, email);
      return newTokens.access_token;
    }
    
    console.log('Using existing valid token for user:', email);
    return tokens.access_token;
  } catch (error) {
    console.error('Error getting valid access token:', error);
    throw error;
  }
}

// Set OAuth2 client credentials
function setCredentials(tokens) {
  oauth2Client.setCredentials(tokens);
}

// List calendar events
async function listEvents() {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 5,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return res.data.items;
}

// Create calendar event
async function createEvent(eventData) {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: eventData,
  });

  return response.data;
}

// Get events using access_token directly (for user tokens)
async function getCalendarEvents(access_token) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token });

  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return res.data.items;
}

// Create event with access_token
async function createCalendarEvent(access_token, event) {
  const response = await axios.post(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    event,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}

// Update event with access_token
async function updateCalendarEvent(access_token, eventId, updatedEvent) {
  const response = await axios.patch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    updatedEvent,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}

// Delete event with access_token
async function deleteCalendarEvent(access_token, eventId) {
  await axios.delete(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    }
  );
  return { message: 'Event deleted successfully' };
}

module.exports = {
  getAuthURL,
  getTokens,
  setCredentials,
  listEvents,
  createEvent,
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  refreshAccessToken,
  getValidAccessToken,
};

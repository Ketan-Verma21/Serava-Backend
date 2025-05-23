// File: Backend/services/calendarService.js

const { google } = require('googleapis');
require('dotenv').config();
const axios = require('axios');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Generate Google OAuth URL
function getAuthURL() {
  const scopes = ['https://www.googleapis.com/auth/calendar'];
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  });
}

// Exchange code for tokens
async function getTokens(code) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
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
};

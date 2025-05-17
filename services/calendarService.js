const { google } = require('googleapis');
require('dotenv').config();
const axios = require('axios');
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Step 1: Generate Auth URL
function getAuthURL() {
  const scopes = ['https://www.googleapis.com/auth/calendar'];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  });
}

// Step 2: Get Tokens
async function getTokens(code) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
}

// Step 3: Set tokens for further requests
function setCredentials(tokens) {
  oauth2Client.setCredentials(tokens);
}

// Step 4: Get upcoming events
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

// Step 5: Create an event
async function createEvent(eventData) {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: eventData,
  });

  return response.data;
}
async function getCalendarEvents(access_token) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token });

  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(), // fetch events starting now
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return res.data.items;
}
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
  

module.exports = {
  getAuthURL,
  getTokens,
  setCredentials,
  listEvents,
  createEvent,
  getCalendarEvents,
  getCalendarEvents,
    createCalendarEvent,
};

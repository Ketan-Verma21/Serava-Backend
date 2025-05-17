const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { getCalendarEvents, createCalendarEvent } = require('./services/calendarService');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/events', async (req, res) => {
  try {
    const { access_token } = req.body;
    const events = await getCalendarEvents(access_token);
    res.json({ success: true, events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch events.' });
  }
});

app.post('/create-event', async (req, res) => {
  try {
    const { access_token, event } = req.body;
    const createdEvent = await createCalendarEvent(access_token, event);
    res.json({ success: true, event: createdEvent });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Failed to create event.' });
  }
});
const { parseNaturalLanguage } = require('./services/aiAgentService');

app.post('/parse', async (req, res) => {
  try {
    const { prompt } = req.body;
    const parsed = await parseNaturalLanguage(prompt);
    res.json({ success: true, parsed });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to parse input.' });
  }
}); 
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

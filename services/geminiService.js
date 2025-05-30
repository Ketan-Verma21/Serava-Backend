const axios = require('axios');
const { DateTime } = require('luxon');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

/**
 * Cleans the Gemini API response by removing markdown formatting
 * @param {string} text - Raw response text from Gemini
 * @returns {string} Cleaned response text
 */
function cleanGeminiResponse(text) {
  if (!text) {
    throw new Error('Empty response from Gemini API');
  }
  return text.replace(/```json\n?|\n?```/g, '').trim();
}

/**
 * Validates and parses JSON response from Gemini
 * @param {string} response - Response text from Gemini
 * @param {string} context - Context for error messages
 * @returns {Object} Parsed JSON object
 */
function parseGeminiResponse(response, context) {
  try {
    const parsed = JSON.parse(response);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid response format: not an object');
    }
    return parsed;
  } catch (error) {
    console.error(`Error parsing Gemini ${context} response:`, error);
    throw new Error(`Invalid JSON response from Gemini for ${context}`);
  }
}

/**
 * Calls the Gemini API with the given prompt and system prompt
 * @param {string} prompt - User prompt
 * @param {string} systemPrompt - System prompt (optional)
 * @returns {Promise<string>} Cleaned response text
 */
async function callGeminiAPI(prompt, systemPrompt = null) {
  if (!prompt) {
    throw new Error('Prompt is required');
  }

  const contents = [];
  
  if (systemPrompt) {
    contents.push({
      role: 'model',
      parts: [{ text: systemPrompt }]
    });
  }
  
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  try {
    const response = await axios.post(`${GEMINI_API_URL}?key=${API_KEY}`, {
      contents
    });

    if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response structure from Gemini API');
    }

    const rawText = response.data.candidates[0].content.parts[0].text;
    return cleanGeminiResponse(rawText);
  } catch (error) {
    console.error('Error calling Gemini API:', error.response?.data || error.message);
    throw new Error(`Failed to get response from Gemini API: ${error.message}`);
  }
}

/**
 * Classifies whether a task is calendar-related
 * @param {string} prompt - User prompt
 * @returns {Promise<Object>} Classification result
 */
async function classifyTask(prompt) {
  const systemPrompt = `You are Serava — a helpful, friendly assistant specialized in calendar management and general conversation.
Your task is to determine whether the query is calendar-related.
Respond ONLY with a valid JSON object:
- If the query IS calendar-related: {"isCalendarTask": true}
- If the query is NOT calendar-related: {"isCalendarTask": false, "response": "natural, helpful, friendly reply"}`;

  const response = await callGeminiAPI(prompt, systemPrompt);
  const parsed = parseGeminiResponse(response, 'task classification');
  
  if (typeof parsed.isCalendarTask !== 'boolean') {
    console.error('Invalid response format from Gemini:', response);
    return { isCalendarTask: false, response: "I'm not sure how to help with that." };
  }
  
  return parsed;
}

/**
 * Determines if a query is range-based
 * @param {string} prompt - User prompt
 * @returns {Promise<boolean>} Whether the query is range-based
 */
async function isRangeQuery(prompt) {
  const systemPrompt = `You are Serava — a helpful, friendly assistant specialized in calendar management.
Your task is to determine whether the query is a range-based calendar operation.
A range-based query is one that involves:
- Adding an event with a date range (e.g., "Add an event named Gym from 30 June to 30 August")
- Deleting an event with a date range (e.g., "Delete the event named Gym from 30 June to 30 August")
- Updating an event with a date range (e.g., "Update the event named Gym from 30 June to 30 August to Morning Walk")

Respond ONLY with a valid JSON object:
- If the query IS range-based: {"isRangeQuery": true}
- If the query is NOT range-based: {"isRangeQuery": false}`;

  const response = await callGeminiAPI(prompt, systemPrompt);
  const parsed = parseGeminiResponse(response, 'range query');
  return parsed.isRangeQuery === true;
}

/**
 * Formats calendar events for the prompt
 * @param {Array} events - List of calendar events
 * @returns {string} Formatted events string
 */
function formatEventsForPrompt(events) {
  return events.map(event => {
    const startDate = new Date(event.start.dateTime || event.start.date).toISOString().split('T')[0];
    const startTime = event.start.dateTime ? new Date(event.start.dateTime).toISOString().split('T')[1].substring(0, 5) : 'all-day';
    const isRecurring = event.recurringEventId ? ' (Recurring Event)' : '';
    return `- ${event.summary}${isRecurring} on ${startDate} at ${startTime} (ID: ${event.id})`;
  }).join('\n');
}

/**
 * Processes a calendar task using Gemini
 * @param {string} prompt - User prompt
 * @param {Array} events - List of calendar events
 * @param {boolean} isRangeQuery - Whether this is a range-based query
 * @returns {Promise<Object>} Processed calendar task
 */
async function processCalendarTask(prompt, events = [], isRangeQuery = false) {
  const today = DateTime.now().setZone('Asia/Kolkata');
  const formattedToday = today.toFormat('yyyy-MM-dd');
  const formattedEvents = formatEventsForPrompt(events);

  const systemPrompt = isRangeQuery 
    ? `You are Serava — a helpful, friendly assistant specialized in calendar management.
Today's date is ${formattedToday}

Your job is to analyze the user's range-based calendar request and respond with a structured JSON object:
{
  "intent": "create / update / delete",
  "title": "Event Title",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "eventId": "event_id_from_context_or_empty",
  "newTitle": "New Title (only for update operations)"
}

Rules for range queries:
- Parse date ranges in various formats (e.g., "30 June to 30 August", "June 30 - August 30")
- Convert all dates to YYYY-MM-DD format
- For updates and deletes, search for matching events in the current events list
- For existing events, include the correct eventId
- Consider timezone (Asia/Kolkata)
- If essential details are missing or unclear, respond with: { "error": "Missing required details" }
- For event series, use the recurringEventId if available
- When searching for events to delete/update:
  * Match events by title (case-insensitive)
  * Match events that fall within or overlap with the specified date range
  * For recurring events, use the recurringEventId
  * If multiple events match, use the one that best matches the date range

Current Calendar Events (for reference):
${formattedEvents}`
    : `You are Serava — a helpful, friendly assistant specialized in calendar management.
Today's date is ${formattedToday}

Your job is to analyze the user's calendar request and respond with a structured JSON object. The response format depends on the type of request:

1. For scheduling queries (e.g., "when should I schedule X?", "find a time for Y"):
{
  "intent": "schedule",
  "eventType": "type of event",
  "recommendations": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:mm",
      "reason": "explanation for this recommendation"
    }
  ],
  "conflicts": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:mm",
      "conflictingEvent": "event summary"
    }
  ],
  "suggestions": ["Compulsary array of relevant suggestions"]
}

2. For regular calendar operations (create/update/delete/fetch):
{
  "intent": "create / update / delete / fetch",
  "events": [
    {
      "title": "Event Title",
      "date": "YYYY-MM-DD",
      "time": "HH:mm",
      "eventId": "event_id_from_context_or_empty",
      "recurrence": "none"
    }
  ]
}

Rules:
- For scheduling queries, analyze the current events and suggest optimal times
- Consider time of day, existing commitments, and event type when making recommendations
- For regular operations, use one of these intents: create, update, delete, fetch
- For fetch requests, respond with: { "intent": "fetch", "date": "YYYY-MM-DD" }
- Use the current year if no year is provided
- Use "09:00" as the default time if no time is specified
- If it's an update or delete request, include the correct eventId from the current events list
- If essential details are missing or unclear, respond with: { "error": "Missing required details" }
- For relative dates, calculate based on today's date (${formattedToday})
- For scheduling recommendations, consider:
  * Morning slots (8-11 AM) for high-energy activities
  * Afternoon slots (2-5 PM) for meetings
  * Evening slots (6-8 PM) for social activities
  * Avoid scheduling during existing events
  * Consider timezone (Asia/Kolkata)
- IMPORTANT: Your response should ONLY include the fields specified in the format above
- For multiple events in a single request:
  * Parse all events mentioned in the query
  * Include all events in the "events" array
  * Each event should have its own title, date, and time
  * If the same title is used for multiple events, include it for each event
  * If no time is specified for an event, use "09:00" as default

Current Calendar Events (for reference):
${formattedEvents}`;

  const response = await callGeminiAPI(prompt, systemPrompt);
  return parseGeminiResponse(response, 'calendar task');
}

module.exports = {
  classifyTask,
  isRangeQuery,
  processCalendarTask
}; 
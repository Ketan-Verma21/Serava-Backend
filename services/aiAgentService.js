// File: Backend/services/aiAgentService.js
const axios = require('axios');
const { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = require('./calendarService');
const { buildPromptWithContext } = require('../utils/promptBuilder');

async function parseNaturalLanguage(prompt, access_token) {
  const events = await getCalendarEvents(access_token);
  const structuredPrompt = buildPromptWithContext(prompt, events);

  const response = await axios.post('http://127.0.0.1:11434/api/generate', {
    model: 'llama3.2',
    prompt: structuredPrompt,
    stream: false,
  });

  const rawOutput = response.data.response;
  console.log('AI Response:', rawOutput);
  
  try {
    // Try to parse the entire response as JSON first
    return JSON.parse(rawOutput);
  } catch (parseError) {
    console.error('Failed to parse AI response as JSON:', parseError.message);
    throw new Error('Invalid JSON response from AI');
  }
}

async function handleUserRequest(prompt, access_token) {
  const parsed = await parseNaturalLanguage(prompt, access_token);
  const intent = parsed.intent?.toLowerCase();
  let result;

  switch (intent) {
    case 'create':
      result = await createCalendarEvent(access_token, {
        summary: parsed.title,
        start: { dateTime: new Date(`${parsed.date}T${parsed.time}`).toISOString() },
        end: { dateTime: new Date(`${parsed.date}T${parsed.time}`).toISOString() }
      });
      break;

    case 'update':
      if (!parsed.eventId) {
        throw new Error('Event ID is required for update operation');
      }
      result = await updateCalendarEvent(access_token, parsed.eventId, {
        summary: parsed.title,
        start: { dateTime: new Date(`${parsed.date}T${parsed.time}`).toISOString() },
        end: { dateTime: new Date(`${parsed.date}T${parsed.time}`).toISOString() }
      });
      break;

    case 'delete':
      if (!parsed.eventId) {
        throw new Error('Event ID is required for delete operation');
      }
      result = await deleteCalendarEvent(access_token, parsed.eventId);
      break;

    case 'fetch':
    default:
      console.log("Fetching calendar events");
      result = await getCalendarEvents(access_token);
      break;
  }

  return { parsed, result };
}

module.exports = { parseNaturalLanguage, handleUserRequest };

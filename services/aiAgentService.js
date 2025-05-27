// File: Backend/services/aiAgentService.js
const axios = require('axios');
const { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = require('./calendarService');
const { buildPromptWithContext } = require('../utils/promptBuilder');

async function isCalendarTask(prompt) {
  // New serava implementation - using the model's built-in calendar detection
  const response = await axios.post('http://127.0.0.1:11434/api/generate', {
    model: 'serava',
    prompt: `Analyze if this is a calendar-related request. Respond with ONLY a JSON object in this format: {"isCalendarTask": true/false}

User request: "${prompt}"`,
    stream: false,
  });

  try {
    const parsed = JSON.parse(response.data.response);
    if (typeof parsed.isCalendarTask !== 'boolean') {
      console.error('Invalid response format from serava:', response.data.response);
      return false;
    }
    return parsed.isCalendarTask;
  } catch (error) {
    console.error('Error parsing serava response:', error);
    console.log('Raw response:', response.data.response);
    return false;
  }
}

async function parseNaturalLanguage(prompt, access_token) {
  // First check if this is a calendar-related task
  const isCalendar = await isCalendarTask(prompt);
  
  if (!isCalendar) {
    // New serava implementation
    const response = await axios.post('http://127.0.0.1:11434/api/generate', {
      model: 'serava',
      prompt: prompt,
      stream: false,
    });
    return { 
      isCalendarTask: false,
      response: response.data.response 
    };
  }

  // If it is calendar-related, proceed with calendar operations
  const events = await getCalendarEvents(access_token);
  const structuredPrompt = buildPromptWithContext(prompt, events);

  // New serava implementation
  const response = await axios.post('http://127.0.0.1:11434/api/generate', {
    model: 'serava',
    prompt: structuredPrompt,
    stream: false,
  });

  const rawOutput = response.data.response;
  console.log('AI Response:', rawOutput);
  
  try {
    // Try to parse the entire response as JSON first
    const parsed = JSON.parse(rawOutput);
    return { 
      isCalendarTask: true,
      ...parsed 
    };
  } catch (parseError) {
    console.error('Failed to parse AI response as JSON:', parseError.message);
    throw new Error('Invalid JSON response from AI');
  }
}

async function handleUserRequest(prompt, access_token) {
  const parsed = await parseNaturalLanguage(prompt, access_token);
  
  // If not a calendar task, return the direct LLM response
  if (!parsed.isCalendarTask) {
    return { 
      parsed: { intent: 'general' },
      result: parsed.response 
    };
  }

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
        throw new Error(`Cannot update event "${parsed.title}" - Event ID not found. Please specify the exact event name.`);
      }
      result = await updateCalendarEvent(access_token, parsed.eventId, {
        summary: parsed.title,
        start: { dateTime: new Date(`${parsed.date}T${parsed.time}`).toISOString() },
        end: { dateTime: new Date(`${parsed.date}T${parsed.time}`).toISOString() }
      });
      break;

    case 'delete':
      if (!parsed.eventId) {
        throw new Error(`Cannot delete event "${parsed.title}" - Event ID not found. Please specify the exact event name.`);
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

module.exports = { handleUserRequest };

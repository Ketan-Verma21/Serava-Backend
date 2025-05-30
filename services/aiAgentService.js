// File: Backend/services/aiAgentService.js
const { getCalendarEvents } = require('./calendarService');
const { classifyTask, processCalendarTask, isRangeQuery } = require('./geminiService');
const { handleCalendarOperation } = require('../controllers/calendarController');

async function parseNaturalLanguage(prompt, access_token) {
  // First check if this is a calendar-related task
  const classification = await classifyTask(prompt);
  
  if (!classification.isCalendarTask) {
    return classification;
  }

  // If it is calendar-related, check if it's a range query
  const isRange = await isRangeQuery(prompt);
  
  // Get calendar events
  const events = await getCalendarEvents(access_token);
  
  // Process with appropriate system prompt based on whether it's a range query
  const parsed = await processCalendarTask(prompt, events, isRange);
  
  return { 
    isCalendarTask: true,
    isRangeQuery: isRange,
    ...parsed 
  };
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

  // For scheduling queries, return only the parsed response
  if (parsed.intent === 'schedule') {
    return { parsed };
  }

  // If there's an error in the parsed response, return it
  if (parsed.error) {
    return {
      parsed,
      result: { error: parsed.error }
    };
  }

  // Handle calendar operations using the calendar controller
  const result = await handleCalendarOperation(parsed, access_token);

  return { 
    parsed, 
    result 
  };
}

module.exports = {
  parseNaturalLanguage,
  handleUserRequest
};

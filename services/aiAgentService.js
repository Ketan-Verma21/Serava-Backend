// File: Backend/services/aiAgentService.js
const { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = require('./calendarService');
const { classifyTask, processCalendarTask } = require('./geminiService');
const { DateTime } = require('luxon');

// Set default timezone to Asia/Kolkata
DateTime.local().setZone('Asia/Kolkata');

async function parseNaturalLanguage(prompt, access_token) {
  // First check if this is a calendar-related task
  const classification = await classifyTask(prompt);
  
  if (!classification.isCalendarTask) {
    return classification;
  }

  // If it is calendar-related, proceed with calendar operations
  const events = await getCalendarEvents(access_token);
  const parsed = await processCalendarTask(prompt, events);
  
  return { 
    isCalendarTask: true,
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

  const intent = parsed.intent?.toLowerCase();
  let result;

  switch (intent) {
    case 'create':
      // Create ISO datetime string using Luxon with Asia/Kolkata timezone
      const startDateTime = DateTime.fromFormat(`${parsed.date}T${parsed.time}`, "yyyy-MM-dd'T'HH:mm")
        .setZone('Asia/Kolkata');
      const endDateTime = startDateTime.plus({ hours: 1 }); // Default 1-hour duration

      result = await createCalendarEvent(access_token, {
        summary: parsed.title,
        start: { dateTime: startDateTime.toISO() },
        end: { dateTime: endDateTime.toISO() }
      });
      break;

    case 'update':
      if (!parsed.eventId) {
        throw new Error(`Cannot update event "${parsed.title}" - Event ID not found. Please specify the exact event name.`);
      }
      const updateStartDateTime = DateTime.fromFormat(`${parsed.date}T${parsed.time}`, "yyyy-MM-dd'T'HH:mm")
        .setZone('Asia/Kolkata');
      const updateEndDateTime = updateStartDateTime.plus({ hours: 1 }); // Default 1-hour duration

      result = await updateCalendarEvent(access_token, parsed.eventId, {
        summary: parsed.title,
        start: { dateTime: updateStartDateTime.toISO() },
        end: { dateTime: updateEndDateTime.toISO() }
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
      const events = await getCalendarEvents(access_token);
      // If a specific date was requested, filter events for that date
      if (parsed.date) {
        const requestedDate = DateTime.fromFormat(parsed.date, "yyyy-MM-dd")
          .setZone('Asia/Kolkata');
        result = events.filter(event => {
          const eventDateTime = DateTime.fromISO(event.start.dateTime || event.start.date)
            .setZone('Asia/Kolkata');
          return eventDateTime.hasSame(requestedDate, 'day');
        });
      } else {
        result = events;
      }
      break;
  }

  return { parsed, result };
}

module.exports = {
  parseNaturalLanguage,
  handleUserRequest
};

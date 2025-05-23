// File: Backend/services/intentDispatcher.js

const {
  createCalendarEvent,
  getCalendarEvents,
  deleteCalendarEvent,
  updateCalendarEvent,
} = require('./calendarService');

async function dispatchCalendarAction(parsed, token) {
  const intent = parsed.intent?.toLowerCase();

  switch (intent) {
    case 'create':
      return await createCalendarEvent(token, {
        summary: parsed.title,
        start: { dateTime: new Date(`${parsed.date}T${parsed.time}`) },
        end: { dateTime: new Date(`${parsed.date}T${parsed.time}`) }, // Adjust as needed
      });
    case 'get':
      return await getCalendarEvents(token);
    case 'delete':
      // You might need to find event by title/date first, this is simplified
      return await deleteCalendarEvent(token, parsed.eventId);
    case 'update':
      // Similarly, update logic depends on your parsed data
      return await updateCalendarEvent(token, parsed.eventId, parsed.updatedEvent);
    default:
      return { message: 'Sorry, I could not understand the intent.' };
  }
}

module.exports = { dispatchCalendarAction };

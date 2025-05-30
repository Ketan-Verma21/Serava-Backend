// File: Backend/controllers/calendarController.js
const { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = require('../services/calendarService');
const { DateTime } = require('luxon');
const { 
  CalendarError, 
  EventNotFoundError, 
  InvalidEventDataError,
  APIError 
} = require('../utils/errors');

// Set default timezone to Asia/Kolkata
DateTime.local().setZone('Asia/Kolkata');

/**
 * Handle calendar operations based on parsed intent
 * @param {Object} parsed - Parsed calendar request
 * @param {string} access_token - Google Calendar API access token
 * @returns {Promise<Object>} - Operation result
 */
async function handleCalendarOperation(parsed, access_token) {
  const intent = parsed.intent?.toLowerCase();
  let results = [];

  try {
    // Handle range-based queries
    if (parsed.isRangeQuery) {
      switch (intent) {
        case 'create':
          results = await createCalendarEvent(access_token, {
            summary: parsed.title,
            start: { date: parsed.startDate },
            end: { date: parsed.endDate }
          });
          break;

        case 'update':
          if (!parsed.eventId) {
            throw new EventNotFoundError(
              `Cannot update event "${parsed.title}" - No matching event found in the specified date range (${parsed.startDate} to ${parsed.endDate}). Please verify the event name and dates.`
            );
          }
          results = await updateCalendarEvent(access_token, parsed.eventId, {
            summary: parsed.newTitle || parsed.title,
            start: { date: parsed.startDate },
            end: { date: parsed.endDate }
          });
          break;

        case 'delete':
          if (!parsed.eventId) {
            throw new EventNotFoundError(
              `Cannot delete event "${parsed.title}" - No matching event found in the specified date range (${parsed.startDate} to ${parsed.endDate}). Please verify the event name and dates.`
            );
          }
          results = await deleteCalendarEvent(access_token, parsed.eventId);
          break;

        default:
          throw new CalendarError('Invalid intent for range-based query');
      }
    } else {
      // Handle regular calendar operations
      switch (intent) {
        case 'create':
          // Handle multiple events
          if (parsed.events && Array.isArray(parsed.events)) {
            results = await Promise.all(parsed.events.map(async (event) => {
              try {
                // Parse the date and time
                const dateTimeStr = `${event.date}T${event.time || '09:00'}`;
                const startDateTime = DateTime.fromFormat(dateTimeStr, "yyyy-MM-dd'T'HH:mm")
                  .setZone('Asia/Kolkata');
                
                if (!startDateTime.isValid) {
                  throw new InvalidEventDataError(`Invalid date/time format: ${dateTimeStr}`);
                }

                const endDateTime = startDateTime.plus({ hours: 1 }); // Default 1-hour duration

                return await createCalendarEvent(access_token, {
                  summary: event.title,
                  start: { dateTime: startDateTime.toISO() },
                  end: { dateTime: endDateTime.toISO() }
                });
              } catch (error) {
                throw new InvalidEventDataError(`Invalid event data for "${event.title}": ${error.message}`);
              }
            }));
          } else {
            // Handle single event (backward compatibility)
            try {
              const dateTimeStr = `${parsed.date}T${parsed.time || '09:00'}`;
              const startDateTime = DateTime.fromFormat(dateTimeStr, "yyyy-MM-dd'T'HH:mm")
                .setZone('Asia/Kolkata');
              
              if (!startDateTime.isValid) {
                throw new InvalidEventDataError(`Invalid date/time format: ${dateTimeStr}`);
              }

              const endDateTime = startDateTime.plus({ hours: 1 }); // Default 1-hour duration

              results = await createCalendarEvent(access_token, {
                summary: parsed.title,
                start: { dateTime: startDateTime.toISO() },
                end: { dateTime: endDateTime.toISO() }
              });
            } catch (error) {
              throw new InvalidEventDataError(`Invalid event data: ${error.message}`);
            }
          }
          break;

        case 'update':
          if (!parsed.events || !Array.isArray(parsed.events)) {
            throw new InvalidEventDataError('Invalid event data for update operation');
          }

          // First get all events to find the one we want to update
          const allEvents = await getCalendarEvents(access_token);
          
          results = await Promise.all(parsed.events.map(async (event) => {
            try {
              // Find the event by title and date
              const dateTimeStr = `${event.date}T${event.time || '09:00'}`;
              const targetDateTime = DateTime.fromFormat(dateTimeStr, "yyyy-MM-dd'T'HH:mm")
                .setZone('Asia/Kolkata');
              
              if (!targetDateTime.isValid) {
                throw new InvalidEventDataError(`Invalid date/time format: ${dateTimeStr}`);
              }

              // Find matching event
              const matchingEvent = allEvents.find(e => {
                const eventDateTime = DateTime.fromISO(e.start.dateTime || e.start.date)
                  .setZone('Asia/Kolkata');
                return e.summary.toLowerCase() === event.title.toLowerCase() && 
                       eventDateTime.hasSame(targetDateTime, 'day');
              });

              if (!matchingEvent) {
                throw new EventNotFoundError(
                  `Cannot find event "${event.title}" scheduled for ${event.date}. Please verify the event name and date.`
                );
              }

              // Update the event
              const updateStartDateTime = targetDateTime;
              const updateEndDateTime = updateStartDateTime.plus({ hours: 1 }); // Default 1-hour duration

              return await updateCalendarEvent(access_token, matchingEvent.id, {
                summary: event.title,
                start: { dateTime: updateStartDateTime.toISO() },
                end: { dateTime: updateEndDateTime.toISO() }
              });
            } catch (error) {
              if (error instanceof EventNotFoundError) {
                throw error;
              }
              throw new InvalidEventDataError(`Invalid event data for "${event.title}": ${error.message}`);
            }
          }));
          break;

        case 'delete':
          if (!parsed.events || !Array.isArray(parsed.events)) {
            throw new InvalidEventDataError('Invalid event data for delete operation');
          }

          // First get all events to find the one we want to delete
          const eventsToDelete = await getCalendarEvents(access_token);
          
          results = await Promise.all(parsed.events.map(async (event) => {
            try {
              // Find the event by title and date
              const dateTimeStr = `${event.date}T${event.time || '09:00'}`;
              const targetDateTime = DateTime.fromFormat(dateTimeStr, "yyyy-MM-dd'T'HH:mm")
                .setZone('Asia/Kolkata');
              
              if (!targetDateTime.isValid) {
                throw new InvalidEventDataError(`Invalid date/time format: ${dateTimeStr}`);
              }

              // Find matching event
              const matchingEvent = eventsToDelete.find(e => {
                const eventDateTime = DateTime.fromISO(e.start.dateTime || e.start.date)
                  .setZone('Asia/Kolkata');
                return e.summary.toLowerCase() === event.title.toLowerCase() && 
                       eventDateTime.hasSame(targetDateTime, 'day');
              });

              if (!matchingEvent) {
                throw new EventNotFoundError(
                  `Cannot find event "${event.title}" scheduled for ${event.date}. Please verify the event name and date.`
                );
              }

              return await deleteCalendarEvent(access_token, matchingEvent.id);
            } catch (error) {
              if (error instanceof EventNotFoundError) {
                throw error;
              }
              throw new InvalidEventDataError(`Invalid event data for "${event.title}": ${error.message}`);
            }
          }));
          break;

        case 'fetch':
        default:
          console.log("Fetching calendar events");
          const events = await getCalendarEvents(access_token);
          // If a specific date was requested, filter events for that date
          if (parsed.date) {
            try {
              const requestedDate = DateTime.fromFormat(parsed.date, "yyyy-MM-dd")
                .setZone('Asia/Kolkata');
              
              if (!requestedDate.isValid) {
                throw new InvalidEventDataError(`Invalid date format: ${parsed.date}`);
              }

              results = events.filter(event => {
                const eventDateTime = DateTime.fromISO(event.start.dateTime || event.start.date)
                  .setZone('Asia/Kolkata');
                return eventDateTime.hasSame(requestedDate, 'day');
              });
            } catch (error) {
              throw new InvalidEventDataError(`Invalid date format: ${error.message}`);
            }
          } else {
            results = events;
          }
          break;
      }
    }

    return Array.isArray(results) ? results : [results];
  } catch (error) {
    if (error instanceof CalendarError) {
      throw error;
    }
    throw new APIError(`Calendar operation failed: ${error.message}`);
  }
}

module.exports = {
  handleCalendarOperation
};



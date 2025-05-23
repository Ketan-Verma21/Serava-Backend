// File: Backend/utils/promptBuilder.js

function buildPromptWithContext(userPrompt, events = []) {
    const formattedEvents = events
      .map((event) => {
        const start = event.start.dateTime || event.start.date || '';
        const dateStr = new Date(start).toISOString().replace('T', ' ').substring(0, 16);
        return `- ${event.summary} at ${dateStr} (ID: ${event.id})`;
      })
      .join('\n');
  
      return `
      You are an intelligent assistant that manages the user's calendar.
      
      Current Calendar Events:
      ${formattedEvents || 'No upcoming events.'}
      
      User says: "${userPrompt}"
      
      Your task: Extract intent (get/create/update/delete), title, date (YYYY-MM-DD), time (HH:mm), and recurrence (if applicable) from the user's request.
      For update and delete operations, you MUST include the event ID from the matching event in the current events list.
      
      Respond in strict JSON format, with no explanations or surrounding text.
      Example for create:
      {
        "intent": "create",
        "title": "Doctor Appointment",
        "date": "2025-05-22",
        "time": "15:00",
        "recurrence": "none"
      }
      
      Example for update/delete:
      {
        "intent": "update",
        "eventId": "event_id_from_list",
        "title": "Updated Title",
        "date": "2025-05-22",
        "time": "15:00"
      }
      
      Respond with only the JSON object.
      `;
      
  }
  
  module.exports = { buildPromptWithContext };
  
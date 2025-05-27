// File: Backend/utils/promptBuilder.js

function buildPromptWithContext(userPrompt, events = []) {
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const formattedEvents = events
      .map((event) => {
        const start = event.start.dateTime || event.start.date || '';
        const dateStr = new Date(start).toISOString().replace('T', ' ').substring(0, 16);
        return `- ${event.summary} at ${dateStr} (ID: ${event.id})`;
      })
      .join('\n');
  
      // New serava prompt - simplified as the model already has the system prompt
      return `
      Today's date is ${formattedToday}
      
      Current Calendar Events:
      ${formattedEvents || 'No upcoming events.'}
      
      User says: "${userPrompt}"
      
      IMPORTANT: 
      - Respond with ONLY a JSON object, no explanations or additional text.
      - For delete or update operations, you MUST include the eventId from the matching event in the list above.
      - If you cannot find an exact match, respond with: {"error": "Event not found"}
      - When dates are mentioned without a specific year, use the current year (${today.getFullYear()}).
      - For relative dates (e.g., "tomorrow", "next week"), calculate based on today's date (${formattedToday}).
      - For create operations, always include a specific time (HH:mm format).
      - If no time is specified, use "09:00" as the default time.
      
      Example response format:
      {
        "intent": "create",
        "title": "Meeting",
        "date": "YYYY-MM-DD",
        "time": "HH:mm",
        "eventId": ""
      }
      `;
  }
  
  module.exports = { buildPromptWithContext };
  
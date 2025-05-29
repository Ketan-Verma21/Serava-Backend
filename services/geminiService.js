const axios = require('axios');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

function cleanGeminiResponse(text) {
  // Remove markdown code block formatting if present
  return text.replace(/```json\n?|\n?```/g, '').trim();
}

async function callGeminiAPI(prompt, systemPrompt = null) {
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

    const rawText = response.data.candidates[0].content.parts[0].text;
    return cleanGeminiResponse(rawText);
  } catch (error) {
    console.error('Error calling Gemini API:', error.response?.data || error.message);
    throw new Error('Failed to get response from Gemini API');
  }
}

async function classifyTask(prompt) {
  const systemPrompt = `You are Serava — a helpful, friendly assistant specialized in calendar management and general conversation.
Your task is to determine whether the query is calendar-related.
Respond ONLY with a valid JSON object:
- If the query IS calendar-related: {"isCalendarTask": true}
- If the query is NOT calendar-related: {"isCalendarTask": false, "response": "natural, helpful, friendly reply"}`;

  const response = await callGeminiAPI(prompt, systemPrompt);
  
  try {
    const parsed = JSON.parse(response);
    if (typeof parsed.isCalendarTask !== 'boolean') {
      console.error('Invalid response format from Gemini:', response);
      return { isCalendarTask: false, response: "I'm not sure how to help with that." };
    }
    return parsed;
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    return { isCalendarTask: false, response: "I'm having trouble understanding that." };
  }
}

async function processCalendarTask(prompt, events = []) {
  const today = new Date();
  const formattedToday = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const systemPrompt = `You are Serava — a helpful, friendly assistant specialized in calendar management.
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
  "title": "Event Title",
  "date": "YYYY-MM-DD",
  "time": "HH:mm",
  "eventId": "event_id_from_context_or_empty",
  "recurrence": "none"
}

Current Calendar Events (for reference only, do not include in response):
${events.map(event => `- ${event.summary} at ${new Date(event.start.dateTime || event.start.date).toISOString().replace('T', ' ').substring(0, 16)} (ID: ${event.id})`).join('\n')}

Rules:
- For scheduling queries, analyze the current events and suggest optimal times
- Consider time of day, existing commitments, and event type when making recommendations
- For regular operations, use one of these intents: create, update, delete, fetch
- For fetch requests, respond with: { "intent": "fetch", "date": "YYYY-MM-DD" }
- Use the current year if no year is provided
- Use "09:00" as the default time if no time is specified
- If it's an update or delete request, include the correct eventId
- If essential details are missing or unclear, respond with: { "error": "Missing required details" }
- For relative dates, calculate based on today's date (${formattedToday})
- For scheduling recommendations, consider:
  * Morning slots (8-11 AM) for high-energy activities
  * Afternoon slots (2-5 PM) for meetings
  * Evening slots (6-8 PM) for social activities
  * Avoid scheduling during existing events
  * Consider timezone (Asia/Kolkata)
- IMPORTANT: Your response should ONLY include the fields specified in the format above`;

  const response = await callGeminiAPI(prompt, systemPrompt);
  
  try {
    return JSON.parse(response);
  } catch (error) {
    console.error('Error parsing Gemini calendar response:', error);
    throw new Error('Invalid JSON response from Gemini for calendar task');
  }
}

module.exports = {
  classifyTask,
  processCalendarTask
}; 
// services/aiAgentService.js
const axios = require('axios');

async function parseNaturalLanguage(prompt) {
  try {
    const response = await axios.post('http://127.0.0.1:11434/api/generate', {
      model: 'llama3.2', // e.g., 'llama3' or your custom model
      prompt: `Convert the following user request into a JSON object with date, time, title,
       and recurrence (if applicable):\n\n"${prompt}"`,
      stream: false
    });

    const rawOutput = response.data.response;
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/); // Extract JSON from response
    if (!jsonMatch) throw new Error('Invalid response from AI');

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('Error parsing natural language:', err.message);
    throw err;
  }
}

module.exports = { parseNaturalLanguage };

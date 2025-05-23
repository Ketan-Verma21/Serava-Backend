// File: Backend/controllers/aiAgentController.js

const { handleUserRequest } = require('../services/aiAgentService');

async function handleUserPrompt(req, res) {
  try {
    const { prompt, access_token } = req.body;

    const { parsed, result } = await handleUserRequest(prompt, access_token);

    res.json({ success: true, parsed, result });
  } catch (err) {
    console.error('AI error:', err.message);
    res.status(500).json({ success: false, message: 'AI processing failed.' });
  }
}

module.exports = { handleUserPrompt };

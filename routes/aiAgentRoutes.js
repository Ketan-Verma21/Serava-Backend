// File: Backend/routes/aiAgentRoutes.js

const express = require('express');
const router = express.Router();
const { handleUserPrompt } = require('../controllers/aiAgentController');

router.post('/prompt', handleUserPrompt);
const { handleUserRequest } = require('../services/aiAgentService');

router.post('/handle', async (req, res) => {
  const { prompt, access_token } = req.body;

  if (!prompt || !access_token) {
    return res.status(400).json({ success: false, message: 'Missing prompt or access_token' });
  }

  try {
    const { parsed, result } = await handleUserRequest(prompt, access_token);
    return res.json({ success: true, parsed, result });
  } catch (err) {
    console.error('AI request failed:', err.message);
    return res.status(500).json({ success: false, message: 'AI interpretation or calendar action failed' });
  }
});
module.exports = router;

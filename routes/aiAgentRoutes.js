const express = require('express');
const router = express.Router();
const aiAgentService = require('../services/aiAgentService');

// POST: Send a natural language prompt to the AI agent
router.post('/prompt', async (req, res) => {
  try {
    const { message } = req.body;
    const response = await aiAgentService.processPrompt(message);
    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Error in /ai/prompt:', error);
    res.status(500).json({ success: false, message: 'Failed to process prompt' });
  }
});

module.exports = router;

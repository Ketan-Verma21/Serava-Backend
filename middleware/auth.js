// File: Backend/middleware/auth.js

const tokenService = require('../services/tokenService');

const authMiddleware = async (req, res, next) => {
  try {
    // Get email from query parameter or request body
    const email = req.query.email || req.body.email;
    
    if (!email) {
      return res.status(401).json({ error: 'Email is required' });
    }

    // Check if user has valid tokens
    const tokens = await tokenService.getTokens(email);
    if (!tokens) {
      return res.status(401).json({ error: 'No tokens found for user' });
    }

    // Add user info to request
    req.user = { email };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = authMiddleware; 
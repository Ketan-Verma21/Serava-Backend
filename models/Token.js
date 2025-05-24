// File: Backend/models/Token.js

const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Create compound index for faster queries
tokenSchema.index({ email: 1, expiresAt: 1 });

module.exports = mongoose.model('Token', tokenSchema); 
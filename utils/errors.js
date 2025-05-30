// File: Backend/utils/errors.js

// Base error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Authentication errors
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Not authorized to perform this action') {
    super(message, 403);
  }
}

// Calendar operation errors
class CalendarError extends AppError {
  constructor(message = 'Calendar operation failed') {
    super(message, 400);
  }
}

class EventNotFoundError extends CalendarError {
  constructor(message = 'Event not found') {
    super(message);
  }
}

class InvalidEventDataError extends CalendarError {
  constructor(message = 'Invalid event data provided') {
    super(message);
  }
}

// AI/LLM errors
class AIProcessingError extends AppError {
  constructor(message = 'Failed to process AI request') {
    super(message, 500);
  }
}

class InvalidPromptError extends AIProcessingError {
  constructor(message = 'Invalid prompt provided') {
    super(message);
  }
}

// Validation errors
class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

// Database errors
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500);
  }
}

// API errors
class APIError extends AppError {
  constructor(message = 'External API request failed') {
    super(message, 500);
  }
}

// Rate limiting errors
class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}

module.exports = {
  AppError,
  AuthenticationError,
  AuthorizationError,
  CalendarError,
  EventNotFoundError,
  InvalidEventDataError,
  AIProcessingError,
  InvalidPromptError,
  ValidationError,
  DatabaseError,
  APIError,
  RateLimitError
}; 
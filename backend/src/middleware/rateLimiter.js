// src/middleware/rateLimiter.js
// Critical for a calling product — without this someone can hammer
// /campaigns/:id/launch and trigger thousands of calls instantly.
const rateLimit = require('express-rate-limit')

// General API limit — 200 requests per 15 minutes per IP
const rateLimiter = rateLimit({
  windowMs:  15 * 60 * 1000,
  max:       200,
  message:   { error: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

// Auth endpoints — stricter: 20 attempts per 15 minutes
// Prevents brute-force login attacks
const authRateLimiter = rateLimit({
  windowMs:  15 * 60 * 1000,
  max:       20,
  message:   { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

// Campaign launch — very strict: 10 launches per hour per IP
// Prevents accidental double-launching of large campaigns
const launchRateLimiter = rateLimit({
  windowMs:  60 * 60 * 1000,
  max:       10,
  message:   { error: 'Too many campaign launches. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

module.exports = { rateLimiter, authRateLimiter, launchRateLimiter }


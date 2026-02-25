// src/middleware/auth.js
const jwt    = require('jsonwebtoken')
const config = require('../config')

module.exports = function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const token   = header.replace('Bearer ', '')
    const decoded = jwt.verify(token, config.jwtSecret)
    req.userId    = decoded.userId
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}


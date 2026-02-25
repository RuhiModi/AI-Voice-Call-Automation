// src/middleware/errorHandler.js
// Catches ALL unhandled errors. Without this, Express exposes
// raw stack traces to users — a security + UX issue.
const config = require('../config')

module.exports = function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message, err.stack)

  const status  = err.status || err.statusCode || 500
  const message = config.isProduction
    ? (status < 500 ? err.message : 'Internal server error')
    : err.message

  res.status(status).json({
    error: message,
    ...(config.isProduction ? {} : { stack: err.stack }),
  })
}


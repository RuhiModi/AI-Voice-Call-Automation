const config = require('../config')

module.exports = function errorHandler(err, req, res, next) {
  // Don't log timeout noise
  const isTimeout = err.message?.includes('timeout') || err.message?.includes('terminated')
  if (!isTimeout) console.error('[Error]', err.message, err.stack?.split('\n')[1])

  const status = err.status || err.statusCode || 500

  // Friendly messages for common errors
  let message = 'Something went wrong. Please try again.'
  if (status === 401) message = 'Please login again.'
  else if (status === 403) message = 'You don\'t have permission to do this.'
  else if (status === 404) message = 'Not found.'
  else if (isTimeout) message = 'Server is slow right now. Please try again in a few seconds.'
  else if (status < 500) message = err.message  // Validation errors — show as-is

  res.status(status).json({ error: message })
}

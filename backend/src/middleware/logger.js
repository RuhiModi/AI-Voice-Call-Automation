// src/middleware/logger.js
// Logs every API request with timing. Essential for debugging
// call failures in production on Render.
module.exports = function logger(req, res, next) {
  const start = Date.now()
  res.on('finish', () => {
    const ms     = Date.now() - start
    const status = res.statusCode
    const color  = status >= 500 ? '\x1b[31m'  // red
                 : status >= 400 ? '\x1b[33m'  // yellow
                 : status >= 200 ? '\x1b[32m'  // green
                 : '\x1b[0m'
    if (req.path !== '/health') { // Skip health check spam
      console.log(`${color}[API] ${req.method} ${req.path} → ${status} (${ms}ms)\x1b[0m`)
    }
  })
  next()
}


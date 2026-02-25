// src/jobs/queue.js
// BullMQ queue for high-scale campaigns (1000+ calls/day).
// Currently NOT used — scheduler.service.js handles MVP with node-cron.
// Switch to this when you need Redis-backed job queue with retries + monitoring.
//
// To enable: uncomment in scheduler.service.js and add REDIS_URL to .env

/*
const { Queue, Worker } = require('bullmq')
const Redis = require('ioredis')
const config = require('../config')

const redisConnection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
})

redisConnection.on('connect', () => console.log('✅ Redis connected'))
redisConnection.on('error',   (err) => console.error('❌ Redis error:', err.message))

const callQueue = new Queue('calls', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail:     200,
  },
})

const callWorker = new Worker('calls', async (job) => {
  // See scheduler.service.js for job processing logic
  const { contactId, campaignId, sessionId } = job.data
  // ... process call job
}, {
  connection: redisConnection,
  concurrency: config.maxConcurrentCalls,
})

module.exports = { callQueue, callWorker }
*/

// Placeholder export so imports don't break
module.exports = {}


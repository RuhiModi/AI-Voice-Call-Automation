// src/routes/auth.routes.js
const express     = require('express')
const authService = require('../services/auth.service')
const auth        = require('../middleware/auth')

const router = express.Router()

router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, company_name } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
    const result = await authService.signup(email, password, company_name)
    console.log(`✅ New user: ${email}`)
    res.status(201).json(result)
  } catch (err) { next(err) }
})

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
    const result = await authService.login(email, password)
    console.log(`✅ Login: ${email}`)
    res.json(result)
  } catch (err) { next(err) }
})

router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await authService.me(req.userId)
    res.json({ user })
  } catch (err) { next(err) }
})

module.exports = router


// src/services/auth.service.js
// All authentication business logic lives here.
// Routes just validate input and call these functions.
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const config   = require('../config')
const userRepo = require('../repositories/user.repo')

const authService = {

  async signup(email, password, companyName) {
    const normalEmail = email.toLowerCase().trim()
    if (await userRepo.findByEmail(normalEmail)) {
      const err = new Error('Email already registered')
      err.status = 409
      throw err
    }
    const passwordHash = await bcrypt.hash(password, 12)
    const user  = await userRepo.create(normalEmail, passwordHash, companyName)
    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
    return { token, user }
  },

  async login(email, password) {
    const normalEmail = email.toLowerCase().trim()
    const user = await userRepo.findByEmail(normalEmail)
    if (!user) {
      const err = new Error('Invalid email or password')
      err.status = 401
      throw err
    }
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      const err = new Error('Invalid email or password')
      err.status = 401
      throw err
    }
    const { password_hash, ...safeUser } = user
    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
    return { token, user: safeUser }
  },

  async me(userId) {
    const user = await userRepo.findById(userId)
    if (!user) {
      const err = new Error('User not found')
      err.status = 404
      throw err
    }
    return user
  },

}

module.exports = authService

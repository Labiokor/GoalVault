const User = require('../models/User')
const jwt = require('jsonwebtoken')
const { success, error } = require('../Utils/responseHandler')

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return error(res, 'All fields are required', 400)
    }
    const existing = await User.findOne({ email })
    if (existing) return error(res, 'Email already exists', 400)

    const user = await User.create({ name, email, password })
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    })
    success(res, { token, user: { id: user._id, name: user.name, email: user.email } }, 'Registration successful', 201)
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return error(res, 'Email and password are required', 400)

    const user = await User.findOne({ email }).select('+password')
    if (!user) return error(res, 'Invalid credentials', 400)

    const match = await user.comparePassword(password)
    if (!match) return error(res, 'Invalid credentials', 400)

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    })
    success(res, { token, user: { id: user._id, name: user.name, email: user.email } }, 'Login successful')
  } catch (err) {
    error(res, err.message, 500)
  }
}
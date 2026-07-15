const User = require('../models/User')
const jwt = require('jsonwebtoken')
const { success, error } = require('../Utils/responseHandler')
const { sendWelcomeEmail } = require('../Utils/emailService')

// Password validation helper
function validatePassword(password, name, email) {
  const errors = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one symbol (!@#$%^&* etc)')
  }

  const emailPrefix = email ? email.split('@')[0].toLowerCase() : ''
  const nameParts = name ? name.toLowerCase().split(' ') : []

  if (emailPrefix && password.toLowerCase().includes(emailPrefix)) {
    errors.push('Password cannot contain your email name')
  }

  nameParts.forEach(part => {
    if (part.length > 2 && password.toLowerCase().includes(part)) {
      errors.push('Password cannot contain your name')
    }
  })

  return errors
}

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return error(res, 'All fields are required', 400)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return error(res, 'Please enter a valid email address', 400)
    }

    const passwordErrors = validatePassword(password, name, email)
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        status: false,
        message: passwordErrors[0],
        errors: passwordErrors
      })
    }

    const normalizedEmail = email.toLowerCase()
    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) return error(res, 'An account with this email already exists', 400)

    const user = await User.create({
      name,
      email: normalizedEmail,
      password
    })

    // Send welcome email
    sendWelcomeEmail(user.email, user.name)

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    })

    success(res, {
      token,
      user: { id: user._id, name: user.name, email: user.email }
    }, 'Registration successful', 201)
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return error(res, 'Email and password are required', 400)

    const normalizedEmail = email.toLowerCase()
    const user = await User.findOne({ email: normalizedEmail }).select('+password')
    if (!user) return error(res, 'No account found with this email. Please register first.', 400)

    const match = await user.comparePassword(password)
    if (!match) return error(res, 'Incorrect password. Please try again.', 400)

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    })

    success(res, { token, user: { id: user._id, name: user.name, email: user.email } }, 'Login successful')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    if (!user) return error(res, 'User not found', 404)
    success(res, { id: user._id, name: user.name, email: user.email }, 'User profile retrieved')
  } catch (err) {
    error(res, err.message, 500)
  }
}
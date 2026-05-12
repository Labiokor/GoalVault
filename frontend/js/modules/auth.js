import { api } from '../api/api.js'
import { saveAuth, isLoggedIn } from '../utils/helpers.js'

const page = document.body.dataset.page

if (isLoggedIn() && (page === 'login' || page === 'register')) {
  window.location.href = '/pages/dashboard.html'
}

// ─── LOGIN ────────────────────────────────────────────────────────
if (page === 'login') {
  const form = document.getElementById('login-form')
  const btn = document.getElementById('login-btn')

  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    clearError()
    setLoading(btn, true, 'Signing in...')

    const email = document.getElementById('email').value.trim()
    const password = document.getElementById('password').value

    if (!email || !password) {
      showError('Please fill in all fields')
      setLoading(btn, false, 'Sign In')
      return
    }

    try {
      const res = await api.auth.login({ email, password })
      saveAuth(res.data.token, res.data.user)
      window.location.href = '/pages/dashboard.html'
    } catch (err) {
      showError(err.message)
      setLoading(btn, false, 'Sign In')
    }
  })
}

// ─── REGISTER ─────────────────────────────────────────────────────
if (page === 'register') {
  const form = document.getElementById('register-form')
  const btn = document.getElementById('register-btn')
  const passwordInput = document.getElementById('password')
  const confirmInput = document.getElementById('confirm-password')
  const nameInput = document.getElementById('name')
  const emailInput = document.getElementById('email')

  // Toggle password visibility
  document.getElementById('toggle-password')?.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password'
    passwordInput.type = type
    const icon = document.querySelector('#toggle-password .material-symbols-outlined')
    if (icon) icon.textContent = type === 'password' ? 'visibility' : 'visibility_off'
  })

  // Real-time password strength
  passwordInput?.addEventListener('input', () => {
    updatePasswordStrength(
      passwordInput.value,
      nameInput?.value || '',
      emailInput?.value || ''
    )
    checkConfirmMatch()
  })

  confirmInput?.addEventListener('input', checkConfirmMatch)

  function checkConfirmMatch() {
    const confirmError = document.getElementById('confirm-error')
    if (!confirmError) return
    if (confirmInput.value && confirmInput.value !== passwordInput.value) {
      confirmError.classList.remove('hidden')
    } else {
      confirmError.classList.add('hidden')
    }
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    clearError()

    const name = nameInput.value.trim()
    const email = emailInput.value.trim()
    const password = passwordInput.value
    const confirm = confirmInput.value

    if (!name || !email || !password || !confirm) {
      showError('Please fill in all fields')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      showError('Please enter a valid email address')
      return
    }

    if (password !== confirm) {
      showError('Passwords do not match')
      return
    }

    const errors = validatePasswordClient(password, name, email)
    if (errors.length > 0) {
      showError(errors[0])
      return
    }

    setLoading(btn, true, 'Creating account...')

    try {
      const res = await api.auth.register({ name, email, password })
      saveAuth(res.data.token, res.data.user)
      window.location.href = '/pages/dashboard.html'
    } catch (err) {
      showError(err.message)
      setLoading(btn, false, 'Create Account')
    }
  })
}

// ─── PASSWORD VALIDATION ──────────────────────────────────────────
function validatePasswordClient(password, name, email) {
  const errors = []
  if (password.length < 8) errors.push('Password must be at least 8 characters')
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter')
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter')
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number')
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one symbol')
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

function updatePasswordStrength(password, name, email) {
  const checks = {
    'req-length': password.length >= 8,
    'req-upper':  /[A-Z]/.test(password),
    'req-lower':  /[a-z]/.test(password),
    'req-number': /[0-9]/.test(password),
    'req-symbol': /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    'req-noname': !containsNameOrEmail(password, name, email)
  }

  // Update requirement indicators
  Object.entries(checks).forEach(([id, passed]) => {
    const el = document.getElementById(id)
    if (!el) return
    const icon = el.querySelector('.material-symbols-outlined')
    if (passed) {
      el.style.color = '#006d4a'
      if (icon) icon.textContent = 'check_circle'
    } else {
      el.style.color = ''
      if (icon) icon.textContent = 'radio_button_unchecked'
    }
  })

  // Strength score
  const score = Object.values(checks).filter(Boolean).length
  const bars = ['str-1', 'str-2', 'str-3', 'str-4']
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e']
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']

  bars.forEach((id, i) => {
    const el = document.getElementById(id)
    if (!el) return
    el.style.background = i < score ? colors[Math.min(score - 1, 3)] : '#e2e8f0'
  })

  const label = document.getElementById('strength-label')
  if (label) {
    label.textContent = password.length > 0 ? labels[score] || 'Strong' : ''
    label.style.color = score >= 4 ? '#22c55e' : score >= 2 ? '#eab308' : '#ef4444'
  }
}

function containsNameOrEmail(password, name, email) {
  const emailPrefix = email ? email.split('@')[0].toLowerCase() : ''
  const nameParts = name ? name.toLowerCase().split(' ') : []
  const pwd = password.toLowerCase()
  if (emailPrefix && pwd.includes(emailPrefix)) return true
  return nameParts.some(part => part.length > 2 && pwd.includes(part))
}

// ─── HELPERS ──────────────────────────────────────────────────────
function showError(message) {
  const errorBox = document.getElementById('auth-error')
  const errorText = document.getElementById('auth-error-text')
  if (!errorBox) return
  if (errorText) errorText.textContent = message
  errorBox.classList.remove('hidden')
}

function clearError() {
  const errorBox = document.getElementById('auth-error')
  if (!errorBox) return
  errorBox.classList.add('hidden')
}

function setLoading(btn, loading, label) {
  if (!btn) return
  btn.disabled = loading
  btn.textContent = label
  btn.style.opacity = loading ? '0.7' : '1'
}
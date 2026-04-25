import { api } from '../api/api.js'
import { saveAuth, isLoggedIn } from '../utils/helpers.js'

const page = document.body.dataset.page

// Only redirect away from login/register if already logged in
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

  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    clearError()

    const name = document.getElementById('name').value.trim()
    const email = document.getElementById('email').value.trim()
    const password = document.getElementById('password').value
    const confirm = document.getElementById('confirm-password').value

    if (password !== confirm) {
      showError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters')
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

// ─── HELPERS ──────────────────────────────────────────────────────
function showError(message) {
  const errorBox = document.getElementById('auth-error')
  if (!errorBox) return
  errorBox.textContent = message
  errorBox.classList.remove('hidden')
}

function clearError() {
  const errorBox = document.getElementById('auth-error')
  if (!errorBox) return
  errorBox.textContent = ''
  errorBox.classList.add('hidden')
}

function setLoading(btn, loading, label) {
  if (!btn) return
  btn.disabled = loading
  btn.textContent = label
  btn.style.opacity = loading ? '0.7' : '1'
}
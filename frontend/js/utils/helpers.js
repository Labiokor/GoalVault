// ─── HELPER UTILITIES ─────────────────────────────────────────────
export function getToken() { return localStorage.getItem('gv_token') }
export function getUser() { return JSON.parse(localStorage.getItem('gv_user') || '{}') }

export function saveAuth(token, user) {
  localStorage.setItem('gv_token', token)
  localStorage.setItem('gv_user', JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem('gv_token')
  localStorage.removeItem('gv_user')
}

export function isLoggedIn() { return !!getToken() }

export function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/login.html'
  }
}

export function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export function formatCurrency(amount, currency = 'GHS') {
  return `${currency} ${Number(amount).toFixed(2)}`
}

export function priorityBadge(priority) {
  const map = { high: 'badge--high', medium: 'badge--medium', low: 'badge--low' }
  return map[priority] || 'badge--medium'
}

export function statusBadge(status) {
  const map = {
    todo: 'badge--pending',
    doing: 'badge--medium',
    done: 'badge--done',
    active: 'badge--medium',
    paused: 'badge--pending',
    completed: 'badge--done'
  }
  return map[status] || 'badge--medium'
}

export function truncate(str, max = 80) {
  return str.length > max ? str.slice(0, max) + '...' : str
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}
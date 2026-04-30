import '../css/main.css'
import { renderSidebar } from './components/sidebar.js'
import { renderNavbar } from './components/navbar.js'
import { isLoggedIn, clearAuth } from './utils/helpers.js'

// Restore dark mode preference
if (localStorage.getItem('gv_dark_mode') === 'true') {
  document.documentElement.classList.add('dark')
}

const page = document.body.dataset.page || ''
const publicPages = ['login', 'register']

if (publicPages.includes(page)) {
  // Always clear auth when visiting login/register
  // This forces user to login every time they visit
  clearAuth()
} else {
  // On protected pages — if not logged in go to login
  if (!isLoggedIn()) {
    window.location.href = '/login.html'
  } else {
    renderSidebar(page)
    renderNavbar({ placeholder: getPlaceholder(page) })
  }
}

function getPlaceholder(page) {
  const map = {
    dashboard:     'Search your sanctuary...',
    tasks:         'Search tasks...',
    habits:        'Search habits...',
    notes:         'Search notes...',
    goals:         'Search goals...',
    finance:       'Search transactions...',
    reminders:     'Search reminders...',
    notifications: 'Search notifications...',
    settings:      'Search settings...',
  }
  return map[page] || 'Search...'
}
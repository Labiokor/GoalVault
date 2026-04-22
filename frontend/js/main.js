// ENTRY POINT
import '../css/main.css'
import { renderSidebar } from './components/sidebar.js'
import { renderNavbar } from './components/navbar.js'
import { requireAuth, isLoggedIn } from './utils/helpers.js'

const page = document.body.dataset.page || ''
const publicPages = ['login', 'register']

if (!publicPages.includes(page)) {
  requireAuth()
  renderSidebar(page)
  renderNavbar({ placeholder: getPlaceholder(page) })
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
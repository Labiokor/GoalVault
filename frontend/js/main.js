import '../css/main.css'
import { renderSidebar } from './components/sidebar.js'
import { renderNavbar } from './components/navbar.js'
import { isLoggedIn, clearAuth } from './utils/helpers.js'
import { api } from './api/api.js'

// Restore dark mode
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
    startGlobalReminderPolling()
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


async function startGlobalReminderPolling() {
  // Request permission
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission()
  }

  const poll = async () => {
    try {
      const res = await api.reminders.getAll()
      const reminders = res.data || []
      const now = new Date()

      for (const reminder of reminders) {
        if (reminder.completed) continue

        const dt = new Date(reminder.datetime)
        const diffMs = dt - now
        const diffMins = diffMs / 60000

        // Fire when within 1 minute of reminder time
        if (diffMins >= 0 && diffMins <= 1) {
          // Browser notification popup
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('GoalVault — ' + reminder.title, {
              body: reminder.notes || 'Reminder is due now!',
              icon: '/favicon.ico'
            })
          }

          // Mark reminder completed
          try {
            await api.reminders.update(reminder._id, { completed: true })
          } catch (e) {
            console.error('Failed to complete reminder:', e.message)
          }

          // Show bell dot
          const dot = document.getElementById('notif-dot')
          if (dot) dot.classList.remove('hidden')
        }
      }
    } catch (err) {
      console.error('Global reminder poll failed:', err.message)
    }
  }

  // Run immediately then every 30 seconds
  poll()
  setInterval(poll, 30000)
}
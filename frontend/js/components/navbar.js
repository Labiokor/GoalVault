import { api } from '../api/api.js'
import { isLoggedIn } from '../utils/helpers.js'

export function renderNavbar({ placeholder = 'Search your sanctuary...', createLabel = 'Create New', showCreate = true } = {}) {
  const topBar = document.getElementById('top-bar')
  if (!topBar) return

  topBar.innerHTML = `
    <div class="flex items-center bg-surface-container-low px-4 py-2 rounded-full w-96 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
      <span class="material-symbols-outlined text-outline-variant text-xl mr-2">search</span>
      <input class="bg-transparent border-none outline-none text-sm w-full placeholder:text-outline-variant"
             type="text" placeholder="${placeholder}" id="global-search">
    </div>

    <div class="flex items-center gap-4">
      <button class="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
              id="notif-btn" onclick="window.location.href='/pages/notifications.html'">
        <span class="material-symbols-outlined text-on-surface-variant">notifications</span>
        <span class="notif-dot hidden" id="notif-dot"></span>
      </button>

      ${showCreate ? `
        <button class="vault-gradient text-on-primary px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2"
                id="create-btn">
          <span class="material-symbols-outlined text-sm">add</span>
          ${createLabel}
        </button>
      ` : ''}
    </div>
  `

  if (isLoggedIn()) checkUnreadNotifications()
}

async function checkUnreadNotifications() {
  try {
    const res = await api.notifications.getUnread()
    const dot = document.getElementById('notif-dot')
    if (dot && res.data?.length > 0) dot.classList.remove('hidden')
  } catch (err) {
    console.error('Notifications check failed:', err.message)
  }
}
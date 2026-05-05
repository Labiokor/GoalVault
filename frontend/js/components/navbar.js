import { api } from '../api/api.js'
import { isLoggedIn } from '../utils/helpers.js'

export function renderNavbar({ placeholder = 'Search your sanctuary...', createLabel = 'Create New', showCreate = true } = {}) {
  const topBar = document.getElementById('top-bar')
  if (!topBar) return

  const isDark = document.documentElement.classList.contains('dark')

  topBar.innerHTML = `
    <div class="flex items-center bg-surface-container-low px-4 py-2 rounded-full w-96 focus-within:ring-2 focus-within:ring-pink-500/20 transition-all">
      <span class="material-symbols-outlined text-outline-variant text-xl mr-2">search</span>
      <input class="bg-transparent border-none outline-none text-sm w-full placeholder:text-outline-variant"
             type="text" placeholder="${placeholder}" id="global-search">
    </div>

    <div class="flex items-center gap-3">
      <button id="dark-mode-toggle"
              class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
              title="Toggle dark mode">
        <span class="material-symbols-outlined text-on-surface-variant">${isDark ? 'light_mode' : 'dark_mode'}</span>
      </button>

      <button class="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
              id="notif-btn">
        <span class="material-symbols-outlined text-on-surface-variant">notifications</span>
        <span class="notif-dot hidden" id="notif-dot"
              style="position:absolute;top:8px;right:8px;width:8px;height:8px;background:#ec4899;border-radius:50%;border:2px solid white"></span>
      </button>

      ${showCreate ? `
        <button class="text-white px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2"
                id="create-btn"
                style="background:linear-gradient(135deg,#005bc4 0%,#4388fd 100%)">
          <span class="material-symbols-outlined text-sm">add</span>
          ${createLabel}
        </button>
      ` : ''}
    </div>
  `

  document.getElementById('dark-mode-toggle')?.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark')
    localStorage.setItem('gv_dark_mode', document.documentElement.classList.contains('dark') ? 'true' : 'false')
    const icon = document.querySelector('#dark-mode-toggle .material-symbols-outlined')
    if (icon) icon.textContent = document.documentElement.classList.contains('dark') ? 'light_mode' : 'dark_mode'
  })

  document.getElementById('notif-btn')?.addEventListener('click', () => {
    window.location.href = '/pages/notification.html'
  })

  if (isLoggedIn()) {
    checkUnreadNotifications()
    // Poll every 60 seconds for new notifications
    setInterval(checkUnreadNotifications, 60000)
  }
}

async function checkUnreadNotifications() {
  try {
    const res = await api.notifications.getUnread()
    const dot = document.getElementById('notif-dot')
    if (dot) {
      if (res.data?.length > 0) {
        dot.classList.remove('hidden')
      } else {
        dot.classList.add('hidden')
      }
    }
  } catch (err) {
    console.error('Notifications check failed:', err.message)
  }
}
import { getUser } from '../utils/helpers.js'

const NAV_ITEMS = [
  { icon: 'dashboard',           label: 'Dashboard',     href: '/pages/dashboard.html' },
  { icon: 'check_circle',        label: 'Tasks',         href: '/pages/tasks.html' },
  { icon: 'repeat',              label: 'Habits',        href: '/pages/habits.html' },
  { icon: 'description',         label: 'Notes',         href: '/pages/notes.html' },
  { icon: 'emoji_events',        label: 'Goals',         href: '/pages/goals.html' },
  { icon: 'notifications_active',label: 'Reminders',     href: '/pages/reminders.html' },
  { icon: 'payments',            label: 'Finance',       href: '/pages/finance.html' },
  { icon: 'notifications',       label: 'Notifications', href: '/pages/notifications.html' },
  { icon: 'settings',            label: 'Settings',      href: '/pages/settings.html' },
]

export function renderSidebar(activePage = '') {
  const sidebar = document.getElementById('sidebar')
  if (!sidebar) return

  const user = getUser()
  const initials = user.name ? user.name.charAt(0).toUpperCase() : 'A'
  const userName = user.name || 'User'

  sidebar.innerHTML = `
    <div class="logo-section mb-10 px-4 flex items-center justify-between">
      <div class="sidebar-text">
        <h1 class="text-xl font-black text-blue-600 font-headline">GoalVault</h1>
        <p class="text-[10px] font-label uppercase tracking-widest text-on-surface-variant opacity-70">Be PRODUCTIVE</p>
      </div>
      <button class="text-slate-500 hover:text-blue-600 transition-colors" id="sidebar-toggle">
        <span class="material-symbols-outlined">menu</span>
      </button>
    </div>

    <nav class="flex-1 space-y-1 overflow-y-auto no-scrollbar">
      ${NAV_ITEMS.map(item => {
        const isActive = activePage === item.label.toLowerCase()
        return `
          <a href="${item.href}"
             class="nav-item ${isActive ? 'nav-item--active' : ''}">
            <span class="material-symbols-outlined"
              style="${isActive ? "font-variation-settings:'FILL' 1" : ''}">
              ${item.icon}
            </span>
            <span class="sidebar-text text-sm">${item.label}</span>
          </a>
        `
      }).join('')}
    </nav>

    <div class="mt-auto pt-6 border-t border-surface-container-low flex items-center gap-3 px-2">
      <div class="avatar">${initials}</div>
      <div class="sidebar-text overflow-hidden">
        <p class="text-sm font-bold text-on-surface truncate">${userName}</p>
        <p class="text-xs text-on-surface-variant truncate">Member</p>
      </div>
    </div>
  `

  document.getElementById('sidebar-toggle')?.addEventListener('click', toggleSidebar)

  // At the end of renderSidebar function, after the innerHTML is set
  document.querySelector('.avatar')?.addEventListener('click', () => {
  window.location.href = '/pages/settings.html'
})
  document.querySelector('.avatar')?.style.setProperty('cursor', 'pointer')
}

export function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('collapsed')
  document.getElementById('main-content')?.classList.toggle('expanded')
  document.getElementById('top-bar')?.classList.toggle('expanded')
}
import { api } from '../api/api.js'
import { timeAgo } from '../utils/helpers.js'

const root = document.getElementById('page-root')
let allNotifications = []

async function init() {
  root.innerHTML = '<div class="flex items-center justify-center py-12 text-on-surface-variant gap-2"><span class="material-symbols-outlined">progress_activity</span><span class="text-sm">Loading notifications...</span></div>'

  try {
    const res = await api.notifications.getAll()
    allNotifications = res.data || []
    renderPage()
  } catch (err) {
    root.innerHTML = '<p class="text-error text-sm p-8">' + err.message + '</p>'
  }
}

function renderPage() {
  const unreadCount = allNotifications.filter(n => !n.read).length

  root.innerHTML = `
    <div class="max-w-3xl mx-auto">

      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <p class="text-primary font-bold uppercase tracking-widest text-xs mb-2">Updates</p>
          <h2 class="text-4xl font-extrabold font-headline text-on-surface tracking-tight">Notifications</h2>
          ${unreadCount > 0
            ? '<p class="text-on-surface-variant text-sm mt-1">You have ' + unreadCount + ' unread notification' + (unreadCount !== 1 ? 's' : '') + '</p>'
            : '<p class="text-on-surface-variant text-sm mt-1">All caught up!</p>'}
        </div>
        <div class="flex gap-3">
          ${unreadCount > 0
            ? '<button id="mark-all-read-btn" class="bg-secondary-container text-on-secondary-container px-5 py-2 rounded-full font-bold text-sm hover:brightness-95 transition-all">Mark all read</button>'
            : ''}
          ${allNotifications.length > 0
            ? '<button id="clear-all-btn" class="bg-error-container/20 text-error px-5 py-2 rounded-full font-bold text-sm hover:bg-error-container/30 transition-all">Clear all</button>'
            : ''}
        </div>
      </div>

      <div id="notifications-list"></div>

    </div>
  `

  renderNotificationsList()
  attachEvents()
}

function renderNotificationsList() {
  const list = document.getElementById('notifications-list')
  if (!list) return

  if (allNotifications.length === 0) {
    list.innerHTML = '<div class="flex flex-col items-center justify-center py-20 gap-4 text-center">'
      + '<div class="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center">'
      + '<span class="material-symbols-outlined text-on-surface-variant text-5xl">notifications_off</span></div>'
      + '<h3 class="text-xl font-bold text-on-surface">No notifications</h3>'
      + '<p class="text-on-surface-variant text-sm">You are all caught up. Check back later.</p>'
      + '</div>'
    return
  }

  const typeIcons = {
    goal:     { icon: 'emoji_events',         color: 'bg-primary-container/20 text-primary' },
    habit:    { icon: 'repeat',               color: 'bg-tertiary-container/30 text-tertiary' },
    task:     { icon: 'check_circle',         color: 'bg-secondary-container text-secondary' },
    reminder: { icon: 'notifications_active', color: 'bg-amber-100 text-amber-700' },
    finance:  { icon: 'payments',             color: 'bg-error-container/20 text-error' },
    general:  { icon: 'info',                 color: 'bg-surface-container text-on-surface' },
  }

  let html = '<div class="space-y-3">'

  allNotifications.forEach(notif => {
    const typeInfo = typeIcons[notif.type] || typeIcons.general

    html += '<div class="bg-surface-container-lowest p-5 rounded-xl flex items-start gap-4 group transition-all '
      + (!notif.read ? 'border-l-4 border-primary' : 'opacity-70')
      + '" data-id="' + notif._id + '">'
      + '<div class="w-10 h-10 rounded-full ' + typeInfo.color + ' flex items-center justify-center shrink-0">'
      + '<span class="material-symbols-outlined text-sm">' + typeInfo.icon + '</span></div>'
      + '<div class="flex-1 min-w-0">'
      + '<div class="flex items-start justify-between gap-4">'
      + '<h4 class="font-bold text-sm text-on-surface">' + notif.title + '</h4>'
      + '<span class="text-[10px] text-on-surface-variant whitespace-nowrap shrink-0">' + timeAgo(notif.createdAt) + '</span>'
      + '</div>'
      + '<p class="text-xs text-on-surface-variant mt-1">' + notif.message + '</p>'
      + '</div>'
      + '<button class="delete-notif-btn opacity-0 group-hover:opacity-100 text-error transition-opacity shrink-0" data-id="' + notif._id + '">'
      + '<span class="material-symbols-outlined text-sm">close</span></button>'
      + '</div>'
  })

  html += '</div>'
  list.innerHTML = html
}

function attachEvents() {
  document.getElementById('mark-all-read-btn')?.addEventListener('click', async () => {
    try {
      await api.notifications.markAllRead()
      allNotifications = allNotifications.map(n => ({ ...n, read: true }))
      renderPage()
    } catch (err) {
      alert('Failed: ' + err.message)
    }
  })

  document.getElementById('clear-all-btn')?.addEventListener('click', async () => {
    if (confirm('Clear all notifications?')) {
      try {
        await api.notifications.deleteAll()
        allNotifications = []
        renderPage()
      } catch (err) {
        alert('Failed: ' + err.message)
      }
    }
  })

  document.getElementById('notifications-list')?.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.delete-notif-btn')
    const card = e.target.closest('[data-id]')

    if (deleteBtn) {
      const id = deleteBtn.dataset.id
      try {
        await api.notifications.delete(id)
        allNotifications = allNotifications.filter(n => n._id !== id)
        renderNotificationsList()
      } catch (err) {
        alert('Failed: ' + err.message)
      }
      return
    }

    if (card && !e.target.closest('button')) {
      const id = card.dataset.id
      const notif = allNotifications.find(n => n._id === id)
      if (notif && !notif.read) {
        try {
          await api.notifications.markRead(id)
          const idx = allNotifications.findIndex(n => n._id === id)
          if (idx !== -1) allNotifications[idx].read = true
          renderNotificationsList()
        } catch (err) {
          console.error('Failed to mark read:', err.message)
        }
      }
    }
  })
}

init()
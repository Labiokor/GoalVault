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
  const unread = allNotifications.filter(n => !n.read)
  const unreadCount = unread.length

  const typeIcons = {
    goal:     { icon: 'emoji_events',         color: 'bg-primary-container/20 text-primary' },
    habit:    { icon: 'repeat',               color: 'bg-tertiary-container/30 text-tertiary' },
    task:     { icon: 'check_circle',         color: 'bg-secondary-container text-secondary' },
    reminder: { icon: 'notifications_active', color: 'bg-amber-100 text-amber-700' },
    finance:  { icon: 'payments',             color: 'bg-error-container/20 text-error' },
    general:  { icon: 'info',                 color: 'bg-surface-container text-on-surface' },
  }

  let notifHTML = ''

  if (allNotifications.length === 0) {
    notifHTML = '<div class="flex flex-col items-center justify-center py-20 gap-4 text-center">'
      + '<div class="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center">'
      + '<span class="material-symbols-outlined text-on-surface-variant text-5xl">notifications_none</span></div>'
      + '<h3 class="text-xl font-bold text-on-surface">All caught up!</h3>'
      + '<p class="text-on-surface-variant text-sm max-w-sm">You have no notifications right now. Complete tasks, habits or goals to get updates here.</p>'
      + '</div>'
  } else {
    notifHTML = '<div class="space-y-3">'
    allNotifications.forEach(notif => {
      const typeInfo = typeIcons[notif.type] || typeIcons.general

      notifHTML += '<div class="bg-surface-container-lowest p-5 rounded-xl flex items-start gap-4 group transition-all cursor-pointer notif-card '
        + (!notif.read ? 'border-l-4 border-primary' : 'opacity-80')
        + '" data-id="' + notif._id + '">'
        + '<div class="w-10 h-10 rounded-full ' + typeInfo.color + ' flex items-center justify-center shrink-0">'
        + '<span class="material-symbols-outlined text-sm">' + typeInfo.icon + '</span></div>'
        + '<div class="flex-1 min-w-0">'
        + '<div class="flex items-start justify-between gap-4">'
        + '<h4 class="font-bold text-sm text-on-surface">' + notif.title + '</h4>'
        + '<div class="flex items-center gap-2 shrink-0">'
        + '<span class="text-[10px] text-on-surface-variant whitespace-nowrap">' + timeAgo(notif.createdAt) + '</span>'
        + (!notif.read ? '<span class="w-2 h-2 rounded-full bg-primary shrink-0"></span>' : '')
        + '</div>'
        + '</div>'
        + '<p class="text-xs text-on-surface-variant mt-1">' + notif.message + '</p>'
        + '</div>'
        + '<button class="delete-notif-btn opacity-0 group-hover:opacity-100 text-error transition-opacity shrink-0 p-1" data-id="' + notif._id + '">'
        + '<span class="material-symbols-outlined text-sm">close</span></button>'
        + '</div>'
    })
    notifHTML += '</div>'
  }

  let actionBtns = ''
  if (unreadCount > 0) {
    actionBtns += '<button id="mark-all-read-btn" class="bg-secondary-container text-on-secondary-container px-5 py-2 rounded-full font-bold text-sm hover:brightness-95 transition-all">Mark all read</button>'
  }
  if (allNotifications.length > 0) {
    actionBtns += '<button id="clear-all-btn" class="bg-error-container/20 text-error px-5 py-2 rounded-full font-bold text-sm hover:bg-error-container/30 transition-all">Clear all</button>'
  }

  root.innerHTML = `
    <div class="max-w-3xl mx-auto">

      <!-- Header -->
      <div class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p class="text-primary font-bold uppercase tracking-widest text-xs mb-2">Activity Feed</p>
          <h2 class="text-4xl font-extrabold font-headline text-on-surface tracking-tight">Notifications</h2>
          <p class="text-on-surface-variant text-sm mt-1">
            ${unreadCount > 0
              ? unreadCount + ' unread notification' + (unreadCount !== 1 ? 's' : '')
              : 'You are all caught up'}
          </p>
        </div>
        <div class="flex gap-3">${actionBtns}</div>
      </div>

      <!-- Filter pills -->
      ${allNotifications.length > 0 ? `
        <div class="flex gap-2 mb-6 flex-wrap">
          <button class="type-filter-btn px-4 py-1.5 rounded-full text-xs font-bold bg-primary-container text-on-primary-container" data-type="all">All</button>
          <button class="type-filter-btn px-4 py-1.5 rounded-full text-xs font-bold bg-surface-container-low text-on-surface-variant" data-type="goal">Goals</button>
          <button class="type-filter-btn px-4 py-1.5 rounded-full text-xs font-bold bg-surface-container-low text-on-surface-variant" data-type="habit">Habits</button>
          <button class="type-filter-btn px-4 py-1.5 rounded-full text-xs font-bold bg-surface-container-low text-on-surface-variant" data-type="task">Tasks</button>
          <button class="type-filter-btn px-4 py-1.5 rounded-full text-xs font-bold bg-surface-container-low text-on-surface-variant" data-type="reminder">Reminders</button>
        </div>
      ` : ''}

      <!-- Notifications -->
      <div id="notifications-list">${notifHTML}</div>

    </div>
  `

  attachEvents()
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

  // Type filter pills
  document.querySelectorAll('.type-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-filter-btn').forEach(b => {
        b.className = 'type-filter-btn px-4 py-1.5 rounded-full text-xs font-bold bg-surface-container-low text-on-surface-variant'
      })
      btn.className = 'type-filter-btn px-4 py-1.5 rounded-full text-xs font-bold bg-primary-container text-on-primary-container'

      const type = btn.dataset.type
      const notifList = document.getElementById('notifications-list')
      if (!notifList) return

      const filtered = type === 'all' ? allNotifications : allNotifications.filter(n => n.type === type)
      renderFilteredNotifications(filtered, notifList)
    })
  })

  document.getElementById('notifications-list')?.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.delete-notif-btn')
    const card = e.target.closest('.notif-card')

    if (deleteBtn) {
      e.stopPropagation()
      const id = deleteBtn.dataset.id
      try {
        await api.notifications.delete(id)
        allNotifications = allNotifications.filter(n => n._id !== id)
        renderPage()
      } catch (err) {
        alert('Failed: ' + err.message)
      }
      return
    }

    if (card) {
      const id = card.dataset.id
      const notif = allNotifications.find(n => n._id === id)
      if (notif && !notif.read) {
        try {
          await api.notifications.markRead(id)
          const idx = allNotifications.findIndex(n => n._id === id)
          if (idx !== -1) allNotifications[idx].read = true
          card.classList.remove('border-l-4', 'border-primary')
          card.classList.add('opacity-80')
          const dot = card.querySelector('.bg-primary.rounded-full')
          if (dot) dot.remove()
        } catch (err) {
          console.error('Mark read failed:', err.message)
        }
      }
    }
  })
}

function renderFilteredNotifications(notifications, container) {
  const typeIcons = {
    goal:     { icon: 'emoji_events',         color: 'bg-primary-container/20 text-primary' },
    habit:    { icon: 'repeat',               color: 'bg-tertiary-container/30 text-tertiary' },
    task:     { icon: 'check_circle',         color: 'bg-secondary-container text-secondary' },
    reminder: { icon: 'notifications_active', color: 'bg-amber-100 text-amber-700' },
    finance:  { icon: 'payments',             color: 'bg-error-container/20 text-error' },
    general:  { icon: 'info',                 color: 'bg-surface-container text-on-surface' },
  }

  if (notifications.length === 0) {
    container.innerHTML = '<div class="flex flex-col items-center justify-center py-12 gap-3 text-center">'
      + '<span class="material-symbols-outlined text-on-surface-variant text-4xl opacity-40">filter_list</span>'
      + '<p class="text-sm text-on-surface-variant">No notifications of this type</p>'
      + '</div>'
    return
  }

  let html = '<div class="space-y-3">'
  notifications.forEach(notif => {
    const typeInfo = typeIcons[notif.type] || typeIcons.general
    html += '<div class="bg-surface-container-lowest p-5 rounded-xl flex items-start gap-4 group transition-all cursor-pointer notif-card '
      + (!notif.read ? 'border-l-4 border-primary' : 'opacity-80')
      + '" data-id="' + notif._id + '">'
      + '<div class="w-10 h-10 rounded-full ' + typeInfo.color + ' flex items-center justify-center shrink-0">'
      + '<span class="material-symbols-outlined text-sm">' + typeInfo.icon + '</span></div>'
      + '<div class="flex-1">'
      + '<div class="flex items-start justify-between gap-4">'
      + '<h4 class="font-bold text-sm text-on-surface">' + notif.title + '</h4>'
      + '<span class="text-[10px] text-on-surface-variant">' + timeAgo(notif.createdAt) + '</span>'
      + '</div>'
      + '<p class="text-xs text-on-surface-variant mt-1">' + notif.message + '</p>'
      + '</div>'
      + '<button class="delete-notif-btn opacity-0 group-hover:opacity-100 text-error transition-opacity shrink-0 p-1" data-id="' + notif._id + '">'
      + '<span class="material-symbols-outlined text-sm">close</span></button>'
      + '</div>'
  })
  html += '</div>'
  container.innerHTML = html
}

init()
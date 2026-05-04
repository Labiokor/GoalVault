import { api } from '../api/api.js'

const root = document.getElementById('page-root')
let allReminders = []
let activeTab = 'upcoming'

async function init() {
  root.innerHTML = '<div class="flex items-center justify-center py-12 text-on-surface-variant gap-2"><span class="material-symbols-outlined">progress_activity</span><span class="text-sm">Loading reminders...</span></div>'

  try {
    const res = await api.reminders.getAll()
    allReminders = res.data || []
    renderPage()
  } catch (err) {
    root.innerHTML = '<p class="text-error text-sm p-8">' + err.message + '</p>'
  }
}

function renderPage() {
  const upcoming = allReminders.filter(r => !r.completed)
  const completed = allReminders.filter(r => r.completed)
  const overdue = upcoming.filter(r => new Date(r.datetime) < new Date())

  const heroMessage = upcoming.length === 0
    ? 'You have no upcoming reminders. Set one to stay ahead.'
    : overdue.length > 0
      ? overdue.length + ' overdue reminder' + (overdue.length !== 1 ? 's' : '') + ' need your attention.'
      : upcoming.length + ' upcoming reminder' + (upcoming.length !== 1 ? 's' : '') + '. Keep it up!'

  root.innerHTML = `
    <div class="max-w-4xl mx-auto">

      <!-- Hero — red gradient -->
      <div class="rounded-xl p-8 text-white relative overflow-hidden mb-8"
           style="background:linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)">
        <div class="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24"></div>
        <div class="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p class="text-white/70 font-bold uppercase tracking-widest text-xs mb-2">Stay on Track</p>
            <h2 class="text-3xl font-extrabold font-headline tracking-tight mb-2">My Reminders</h2>
            <p class="text-white/80 text-sm">${heroMessage}</p>
          </div>
          <button id="open-reminder-modal"
                  class="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 transition-all shrink-0">
            <span class="material-symbols-outlined text-sm">add</span>
            New Reminder
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-8">
        <div class="bg-surface-container-lowest p-5 rounded-xl text-center ring-1 ring-outline-variant/5">
          <p class="text-2xl font-black font-headline" style="color:#ef4444">${upcoming.length}</p>
          <p class="text-xs text-on-surface-variant uppercase font-bold mt-1">Upcoming</p>
        </div>
        <div class="bg-surface-container-lowest p-5 rounded-xl text-center ring-1 ring-outline-variant/5">
          <p class="text-2xl font-black font-headline text-error">${overdue.length}</p>
          <p class="text-xs text-on-surface-variant uppercase font-bold mt-1">Overdue</p>
        </div>
        <div class="bg-surface-container-lowest p-5 rounded-xl text-center ring-1 ring-outline-variant/5">
          <p class="text-2xl font-black font-headline text-tertiary">${completed.length}</p>
          <p class="text-xs text-on-surface-variant uppercase font-bold mt-1">Completed</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 mb-6 bg-surface-container-low p-1 rounded-xl w-fit">
        <button class="tab-btn px-5 py-2 rounded-lg text-sm font-bold transition-all" data-tab="upcoming">Upcoming</button>
        <button class="tab-btn px-5 py-2 rounded-lg text-sm font-bold transition-all" data-tab="completed">Completed</button>
      </div>

      <div id="reminders-list"></div>

    </div>

    <!-- Modal -->
    <div id="reminder-modal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center hidden">
      <div class="bg-surface-container-lowest rounded-xl p-8 w-full max-w-md mx-4 shadow-xl">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold font-headline">New Reminder</h3>
          <button id="close-reminder-modal" class="text-on-surface-variant hover:text-on-surface">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div id="reminder-form-error" class="hidden mb-4 p-3 bg-error-container/20 text-error rounded-lg text-sm"></div>
        <div class="space-y-4">
          <div>
            <label class="form-label">Reminder Title</label>
            <input class="form-input" id="reminder-title" type="text" placeholder="What do you need to remember?">
          </div>
          <div>
            <label class="form-label">Date and Time</label>
            <input class="form-input" id="reminder-datetime" type="datetime-local">
          </div>
          <div>
            <label class="form-label">Notes (optional)</label>
            <textarea class="form-input resize-none" id="reminder-notes" rows="2" placeholder="Additional details..."></textarea>
          </div>
          <div class="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl cursor-pointer" id="recurring-toggle">
            <input type="checkbox" id="reminder-recurring" class="w-4 h-4" style="accent-color:#ef4444">
            <label for="reminder-recurring" class="text-sm font-medium text-on-surface cursor-pointer flex-1">Recurring reminder</label>
          </div>
          <div id="recurrence-options" class="hidden">
            <label class="form-label">Repeat Every</label>
            <select class="form-input" id="reminder-recurrence">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <button id="save-reminder-btn"
                  class="w-full text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                  style="background:linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)">
            Set Reminder
          </button>
        </div>
      </div>
    </div>
  `

  setActiveTab(activeTab)
  renderRemindersList()
  attachEvents()
}

function renderRemindersList() {
  const list = document.getElementById('reminders-list')
  if (!list) return

  const filtered = activeTab === 'upcoming'
    ? allReminders.filter(r => !r.completed)
    : allReminders.filter(r => r.completed)

  if (filtered.length === 0) {
    list.innerHTML = '<div class="flex flex-col items-center justify-center py-16 gap-4 text-center">'
      + '<div class="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center">'
      + '<span class="material-symbols-outlined text-4xl" style="color:#ef4444">'
      + (activeTab === 'upcoming' ? 'notifications_none' : 'task_alt')
      + '</span></div>'
      + '<h3 class="text-lg font-bold text-on-surface">'
      + (activeTab === 'upcoming' ? 'No upcoming reminders' : 'No completed reminders yet')
      + '</h3>'
      + '<p class="text-sm text-on-surface-variant max-w-xs">'
      + (activeTab === 'upcoming'
        ? 'Set a reminder to stay ahead of your schedule and never miss a thing.'
        : 'Completed reminders will appear here.')
      + '</p>'
      + (activeTab === 'upcoming'
        ? '<button id="empty-new-reminder" class="text-white px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-90 transition-all" style="background:linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)">Set First Reminder</button>'
        : '')
      + '</div>'

    document.getElementById('empty-new-reminder')?.addEventListener('click', openModal)
    return
  }

  let html = '<div class="space-y-3">'

  filtered.forEach(reminder => {
    const dt = new Date(reminder.datetime)
    const isOverdue = !reminder.completed && dt < new Date()
    const timeStr = dt.toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

    let badgeText = ''
    let badgeStyle = ''
    let iconStyle = ''
    let borderStyle = ''

    if (reminder.completed) {
      badgeText = 'Done'
      badgeStyle = 'background:rgba(105,246,184,0.3);color:#006d4a'
      iconStyle = 'background:rgba(105,246,184,0.3);color:#006d4a'
      borderStyle = ''
    } else if (isOverdue) {
      badgeText = 'Overdue'
      badgeStyle = 'background:rgba(239,68,68,0.15);color:#ef4444'
      iconStyle = 'background:rgba(239,68,68,0.15);color:#ef4444'
      borderStyle = 'border-left:4px solid #ef4444'
    } else if (reminder.recurring) {
      badgeText = reminder.recurrenceType || 'Recurring'
      badgeStyle = 'background:rgba(0,91,196,0.1);color:#005bc4'
      iconStyle = 'background:rgba(0,91,196,0.1);color:#005bc4'
      borderStyle = 'border-left:4px solid #005bc4'
    } else {
      badgeText = 'One-time'
      badgeStyle = 'background:rgba(239,68,68,0.1);color:#ef4444'
      iconStyle = 'background:rgba(239,68,68,0.1);color:#ef4444'
      borderStyle = 'border-left:4px solid #ef4444'
    }

    html += '<div class="bg-surface-container-lowest p-6 rounded-xl flex items-start gap-5 group hover:shadow-sm transition-all" style="' + borderStyle + '">'
      + '<div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style="' + iconStyle + '">'
      + '<span class="material-symbols-outlined">notifications_active</span></div>'
      + '<div class="flex-1 min-w-0">'
      + '<div class="flex items-start justify-between gap-4 mb-1">'
      + '<h4 class="font-bold text-on-surface ' + (reminder.completed ? 'line-through opacity-50' : '') + '">' + reminder.title + '</h4>'
      + '<span class="text-[10px] px-2 py-0.5 font-bold rounded-full whitespace-nowrap" style="' + badgeStyle + '">' + badgeText + '</span>'
      + '</div>'
      + '<div class="flex items-center gap-1 text-xs text-on-surface-variant mt-1">'
      + '<span class="material-symbols-outlined text-xs">schedule</span> ' + timeStr
      + '</div>'
      + (reminder.notes ? '<p class="text-xs text-on-surface-variant mt-2 bg-surface-container p-2 rounded-lg">' + reminder.notes + '</p>' : '')
      + '<div class="flex items-center gap-4 mt-4">'
      + (!reminder.completed
        ? '<button class="complete-reminder-btn text-xs font-bold flex items-center gap-1 hover:underline" style="color:#ef4444" data-id="' + reminder._id + '">'
          + '<span class="material-symbols-outlined text-sm">check_circle</span> Mark Done</button>'
        : '')
      + '<button class="delete-reminder-btn text-xs font-medium text-error flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" data-id="' + reminder._id + '">'
      + '<span class="material-symbols-outlined text-sm">delete</span> Delete</button>'
      + '</div>'
      + '</div>'
      + '</div>'
  })

  html += '</div>'
  list.innerHTML = html
}

function setActiveTab(tab) {
  activeTab = tab
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const isActive = btn.dataset.tab === tab
    btn.className = 'tab-btn px-5 py-2 rounded-lg text-sm font-bold transition-all '
      + (isActive ? 'bg-surface-container-lowest shadow-sm' : 'text-on-surface-variant hover:text-on-surface')
    if (isActive) btn.style.color = '#ef4444'
    else btn.style.color = ''
  })
}

function attachEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveTab(btn.dataset.tab)
      renderRemindersList()
    })
  })

  document.getElementById('open-reminder-modal')?.addEventListener('click', openModal)
  document.getElementById('close-reminder-modal')?.addEventListener('click', closeModal)
  document.getElementById('reminder-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('reminder-modal')) closeModal()
  })
  document.getElementById('save-reminder-btn')?.addEventListener('click', saveReminder)
  document.getElementById('fab')?.addEventListener('click', openModal)

  document.getElementById('recurring-toggle')?.addEventListener('click', (e) => {
    if (e.target.tagName === 'INPUT') return
    const cb = document.getElementById('reminder-recurring')
    cb.checked = !cb.checked
    document.getElementById('recurrence-options')?.classList.toggle('hidden', !cb.checked)
  })

  document.getElementById('reminder-recurring')?.addEventListener('change', (e) => {
    document.getElementById('recurrence-options')?.classList.toggle('hidden', !e.target.checked)
  })

  document.getElementById('reminders-list')?.addEventListener('click', async (e) => {
    const completeBtn = e.target.closest('.complete-reminder-btn')
    const deleteBtn = e.target.closest('.delete-reminder-btn')
    if (completeBtn) await completeReminder(completeBtn.dataset.id)
    if (deleteBtn && confirm('Delete this reminder?')) await deleteReminder(deleteBtn.dataset.id)
  })
}

function openModal() {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 30)
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  document.getElementById('reminder-datetime').value = local
  document.getElementById('reminder-modal')?.classList.remove('hidden')
  document.getElementById('reminder-title')?.focus()
}

function closeModal() {
  document.getElementById('reminder-modal')?.classList.add('hidden')
  document.getElementById('reminder-title').value = ''
  document.getElementById('reminder-notes').value = ''
  document.getElementById('reminder-datetime').value = ''
  document.getElementById('reminder-recurring').checked = false
  document.getElementById('recurrence-options')?.classList.add('hidden')
  document.getElementById('reminder-form-error')?.classList.add('hidden')
  document.getElementById('save-reminder-btn').textContent = 'Set Reminder'
  document.getElementById('save-reminder-btn').disabled = false
}

async function saveReminder() {
  const title = document.getElementById('reminder-title')?.value.trim()
  const datetime = document.getElementById('reminder-datetime')?.value
  const notes = document.getElementById('reminder-notes')?.value.trim()
  const recurring = document.getElementById('reminder-recurring')?.checked
  const recurrenceType = document.getElementById('reminder-recurrence')?.value
  const errorBox = document.getElementById('reminder-form-error')
  const btn = document.getElementById('save-reminder-btn')

  if (!title) { errorBox.textContent = 'Title is required'; errorBox.classList.remove('hidden'); return }
  if (!datetime) { errorBox.textContent = 'Date and time is required'; errorBox.classList.remove('hidden'); return }

  errorBox.classList.add('hidden')
  btn.textContent = 'Setting...'
  btn.disabled = true

  const body = { title, datetime, recurring }
  if (notes) body.notes = notes
  if (recurring) body.recurrenceType = recurrenceType

  try {
    const res = await api.reminders.create(body)
    allReminders.unshift(res.data)
    closeModal()
    setActiveTab('upcoming')
    renderPage()
  } catch (err) {
    errorBox.textContent = err.message
    errorBox.classList.remove('hidden')
    btn.textContent = 'Set Reminder'
    btn.disabled = false
  }
}

async function completeReminder(id) {
  try {
    const res = await api.reminders.update(id, { completed: true })
    const idx = allReminders.findIndex(r => r._id === id)
    if (idx !== -1) allReminders[idx] = res.data
    renderPage()
  } catch (err) {
    alert('Failed: ' + err.message)
  }
}

async function deleteReminder(id) {
  try {
    await api.reminders.delete(id)
    allReminders = allReminders.filter(r => r._id !== id)
    renderPage()
  } catch (err) {
    alert('Failed: ' + err.message)
  }
}

init()
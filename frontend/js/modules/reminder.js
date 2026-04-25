import { api } from '../api/api.js'
import { formatDate } from '../utils/helpers.js'

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
  root.innerHTML = `
    <div class="max-w-4xl mx-auto">

      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <p class="text-primary font-bold uppercase tracking-widest text-xs mb-2">Stay on Track</p>
          <h2 class="text-4xl font-extrabold font-headline text-on-surface tracking-tight">Reminders</h2>
        </div>
        <button id="open-reminder-modal"
                class="vault-gradient text-on-primary px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all w-fit">
          <span class="material-symbols-outlined text-sm">add</span>
          New Reminder
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 mb-8 bg-surface-container-low p-1 rounded-xl w-fit">
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
            <label class="form-label">Date & Time</label>
            <input class="form-input" id="reminder-datetime" type="datetime-local">
          </div>
          <div>
            <label class="form-label">Notes (optional)</label>
            <textarea class="form-input resize-none" id="reminder-notes" rows="2" placeholder="Additional details..."></textarea>
          </div>
          <div class="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl">
            <input type="checkbox" id="reminder-recurring" class="w-4 h-4 accent-primary">
            <label for="reminder-recurring" class="text-sm font-medium text-on-surface cursor-pointer">Recurring reminder</label>
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
                  class="w-full vault-gradient text-on-primary py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all">
            Set Reminder
          </button>
        </div>
      </div>
    </div>
  `

  setActiveTab('upcoming')
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
    list.innerHTML = '<div class="flex flex-col items-center justify-center py-16 gap-3 text-center">'
      + '<div class="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center">'
      + '<span class="material-symbols-outlined text-on-surface-variant text-3xl">notifications_off</span></div>'
      + '<p class="text-base font-bold text-on-surface">' + (activeTab === 'upcoming' ? 'No upcoming reminders' : 'No completed reminders') + '</p>'
      + '<p class="text-sm text-on-surface-variant">Click "New Reminder" to add one</p>'
      + '</div>'
    return
  }

  let html = '<div class="space-y-4">'

  filtered.forEach(reminder => {
    const dt = new Date(reminder.datetime)
    const isOverdue = !reminder.completed && dt < new Date()
    const timeStr = dt.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

    const dotColor = isOverdue
      ? 'bg-error'
      : reminder.recurring
        ? 'bg-tertiary'
        : 'bg-primary'

    html += '<div class="bg-surface-container-lowest p-6 rounded-xl flex items-start gap-5 group hover:shadow-sm transition-all">'
      + '<div class="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary shrink-0">'
      + '<span class="material-symbols-outlined">notifications_active</span></div>'
      + '<div class="flex-1 min-w-0">'
      + '<div class="flex items-start justify-between gap-4">'
      + '<h4 class="font-bold text-on-surface ' + (reminder.completed ? 'line-through opacity-50' : '') + '">' + reminder.title + '</h4>'
      + '<span class="text-[10px] px-2 py-0.5 font-bold rounded-full whitespace-nowrap '
      + (reminder.completed ? 'bg-tertiary-container/30 text-tertiary' : isOverdue ? 'bg-error-container/20 text-error' : 'bg-primary-container/20 text-primary') + '">'
      + (reminder.completed ? 'Done' : isOverdue ? 'Overdue' : reminder.recurring ? reminder.recurrenceType : 'Once')
      + '</span>'
      + '</div>'
      + '<div class="flex items-center gap-2 mt-1">'
      + '<span class="material-symbols-outlined text-xs text-on-surface-variant">schedule</span>'
      + '<span class="text-xs text-on-surface-variant">' + timeStr + '</span>'
      + '</div>'
      + (reminder.notes ? '<p class="text-xs text-on-surface-variant mt-2">' + reminder.notes + '</p>' : '')
      + '<div class="flex items-center gap-4 mt-4">'
      + (!reminder.completed
        ? '<button class="complete-reminder-btn text-xs font-bold text-primary flex items-center gap-1 hover:underline" data-id="' + reminder._id + '">'
          + '<span class="material-symbols-outlined text-sm">check_circle</span> Mark Done</button>'
        : '')
      + '<button class="delete-reminder-btn text-xs font-medium text-error flex items-center gap-1 hover:underline opacity-0 group-hover:opacity-100 transition-opacity" data-id="' + reminder._id + '">'
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
      + (isActive ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')
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
  const localStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  document.getElementById('reminder-datetime').value = localStr
  document.getElementById('reminder-modal')?.classList.remove('hidden')
  document.getElementById('reminder-title')?.focus()
}

function closeModal() {
  document.getElementById('reminder-modal')?.classList.add('hidden')
  document.getElementById('reminder-title').value = ''
  document.getElementById('reminder-notes').value = ''
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
    renderRemindersList()
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
    renderRemindersList()
  } catch (err) {
    alert('Failed to update reminder: ' + err.message)
  }
}

async function deleteReminder(id) {
  try {
    await api.reminders.delete(id)
    allReminders = allReminders.filter(r => r._id !== id)
    renderRemindersList()
  } catch (err) {
    alert('Failed to delete reminder: ' + err.message)
  }
}

init()
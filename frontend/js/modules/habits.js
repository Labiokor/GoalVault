import { api } from '../api/api.js'
import { getUser } from '../utils/helpers.js'

const root = document.getElementById('page-root')
const user = getUser()
let allHabits = []

async function init() {
  root.innerHTML = '<div class="flex items-center justify-center py-12 text-on-surface-variant gap-2"><span class="material-symbols-outlined">progress_activity</span><span class="text-sm">Loading habits...</span></div>'

  try {
    const res = await api.habits.getAll()
    allHabits = res.data || []
    renderPage()
  } catch (err) {
    root.innerHTML = '<p class="text-error text-sm p-8">' + err.message + '</p>'
  }
}

function renderPage() {
  const firstName = user.name ? user.name.split(' ')[0] : 'there'
  const totalStreak = allHabits.reduce((sum, h) => sum + (h.currentstreak || 0), 0)
  const bestStreak = allHabits.reduce((max, h) => Math.max(max, h.higheststreak || 0), 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const completedToday = allHabits.filter(h => {
    if (!h.lastCompletedDates) return false
    const last = new Date(h.lastCompletedDates)
    last.setHours(0, 0, 0, 0)
    return last.getTime() === today.getTime()
  }).length

  root.innerHTML = `
    <div class="max-w-5xl mx-auto">

      <!-- Welcome Hero -->
      <div class="bg-gradient-to-br from-tertiary to-tertiary-fixed rounded-xl p-8 text-on-tertiary relative overflow-hidden mb-8">
        <div class="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24"></div>
        <div class="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p class="text-on-tertiary/70 font-bold uppercase tracking-widest text-xs mb-2">Habit Tracker</p>
            <h2 class="text-3xl font-extrabold font-headline tracking-tight mb-2 text-white">
              ${allHabits.length === 0
                ? 'Build great habits, ' + firstName + '!'
                : completedToday === allHabits.length
                  ? 'Crushing it today, ' + firstName + '!'
                  : 'Stay consistent, ' + firstName + '!'}
            </h2>
            <p class="text-white/80 text-sm">
              ${allHabits.length === 0
                ? 'Habits compound over time. Start with one small action done consistently.'
                : completedToday + ' of ' + allHabits.length + ' habits done today. ' + (completedToday === allHabits.length ? 'Perfect day!' : 'Keep going!')}
            </p>
          </div>
          <button id="open-habit-modal"
                  class="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 transition-all shrink-0">
            <span class="material-symbols-outlined text-sm">add</span>
            New Habit
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-8">
        <div class="bg-surface-container-lowest p-5 rounded-xl text-center ring-1 ring-outline-variant/5">
          <p class="text-2xl font-black font-headline text-on-surface">${allHabits.length}</p>
          <p class="text-xs text-on-surface-variant uppercase font-bold mt-1">Total Habits</p>
        </div>
        <div class="bg-surface-container-lowest p-5 rounded-xl text-center ring-1 ring-outline-variant/5">
          <p class="text-2xl font-black font-headline text-tertiary">${totalStreak}</p>
          <p class="text-xs text-on-surface-variant uppercase font-bold mt-1">Total Streak Days</p>
        </div>
        <div class="bg-surface-container-lowest p-5 rounded-xl text-center ring-1 ring-outline-variant/5">
          <p class="text-2xl font-black font-headline text-primary">${bestStreak}</p>
          <p class="text-xs text-on-surface-variant uppercase font-bold mt-1">Best Streak</p>
        </div>
      </div>

      <!-- Habits List -->
      <div id="habits-list"></div>

    </div>

    <!-- Modal -->
    <div id="habit-modal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center hidden">
      <div class="bg-surface-container-lowest rounded-xl p-8 w-full max-w-md mx-4 shadow-xl">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold font-headline">New Habit</h3>
          <button id="close-habit-modal" class="text-on-surface-variant hover:text-on-surface">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div id="habit-form-error" class="hidden mb-4 p-3 bg-error-container/20 text-error rounded-lg text-sm"></div>

        <div class="space-y-4">
          <div>
            <label class="form-label">Habit Name</label>
            <input class="form-input" id="habit-name" type="text" placeholder="e.g. Morning Meditation">
          </div>
          <div>
            <label class="form-label">Target (optional)</label>
            <input class="form-input" id="habit-target" type="text" placeholder="e.g. 15 mins, 5km, 10 pages">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Frequency</label>
              <select class="form-input" id="habit-frequency">
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
                <option value="weekends">Weekends</option>
              </select>
            </div>
            <div>
              <label class="form-label">Icon (emoji)</label>
              <input class="form-input" id="habit-icon" type="text" placeholder="e.g. 🧘 📚 💧" maxlength="2">
            </div>
          </div>

          <!-- Daily reminder time -->
          <div>
            <label class="form-label">Daily Reminder Time (optional)</label>
            <input class="form-input" id="habit-reminder-time" type="time">
            <p class="text-xs text-on-surface-variant mt-1">You will get a daily reminder at this time</p>
          </div>

          <button id="save-habit-btn"
                  class="w-full vault-gradient text-on-primary py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all">
            Create Habit
          </button>
        </div>
      </div>
    </div>
  `

  renderHabitsList()
  attachEvents()
}

function renderHabitsList() {
  const list = document.getElementById('habits-list')
  if (!list) return

  if (allHabits.length === 0) {
    list.innerHTML = '<div class="flex flex-col items-center justify-center py-16 gap-4 text-center">'
      + '<div class="w-24 h-24 rounded-full bg-secondary-container flex items-center justify-center">'
      + '<span class="material-symbols-outlined text-secondary text-5xl">repeat</span></div>'
      + '<h3 class="text-xl font-bold text-on-surface">No habits yet</h3>'
      + '<p class="text-on-surface-variant text-sm max-w-sm">Habits are the compound interest of self-improvement. Start with just one.</p>'
      + '<button id="empty-new-habit" class="vault-gradient text-on-primary px-8 py-3 rounded-full font-bold text-sm">Start First Habit</button>'
      + '</div>'
    document.getElementById('empty-new-habit')?.addEventListener('click', openModal)
    return
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon...5=Fri, 6=Sat
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  let html = '<div class="space-y-4">'

  allHabits.forEach(habit => {
    // Check if habit is due today based on frequency
    let dueToday = false
    if (habit.frequency === 'daily') dueToday = true
    else if (habit.frequency === 'weekdays') dueToday = isWeekday
    else if (habit.frequency === 'weekends') dueToday = isWeekend

    // Check if already completed today
    const lastCompleted = habit.lastCompletedDates ? new Date(habit.lastCompletedDates) : null
    if (lastCompleted) lastCompleted.setHours(0, 0, 0, 0)
    const completedToday = lastCompleted && lastCompleted.getTime() === today.getTime()

    const streakColor = habit.currentstreak >= 30 ? 'text-error'
      : habit.currentstreak >= 14 ? 'text-primary' : 'text-tertiary'

    const progressPct = habit.higheststreak > 0
      ? Math.min(100, Math.round((habit.currentstreak / habit.higheststreak) * 100))
      : habit.currentstreak > 0 ? 100 : 0

    // Button state logic
    let btnClass = ''
    let btnText = ''
    let btnDisabled = ''

    if (!dueToday) {
      btnClass = 'bg-surface-container text-on-surface-variant cursor-not-allowed opacity-60'
      btnText = 'Not due today'
      btnDisabled = 'disabled'
    } else if (completedToday) {
      btnClass = 'bg-tertiary-container/30 text-tertiary cursor-default'
      btnText = '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">check</span> Done today</span>'
      btnDisabled = 'disabled'
    } else {
      btnClass = 'vault-gradient text-on-primary hover:opacity-90 active:scale-95'
      btnText = 'Mark done'
      btnDisabled = ''
    }

    const frequencyBadge = '<span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase '
      + (habit.frequency === 'daily' ? 'bg-primary-container/20 text-primary'
        : habit.frequency === 'weekdays' ? 'bg-secondary-container text-secondary'
        : 'bg-tertiary-container/30 text-tertiary')
      + '">' + habit.frequency + '</span>'

    const dueTodayBadge = !dueToday
      ? '<span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-surface-container text-on-surface-variant">Not due today</span>'
      : ''

    html += '<div class="bg-surface-container-lowest p-6 rounded-xl group hover:shadow-sm transition-all">'
      + '<div class="flex items-center justify-between">'
      + '<div class="flex items-center gap-5">'
      + '<div class="w-14 h-14 rounded-full bg-tertiary-container/30 flex items-center justify-center text-2xl shrink-0">'
      + (habit.icon || '✅') + '</div>'
      + '<div>'
      + '<h4 class="font-bold text-lg text-on-surface">' + habit.name + '</h4>'
      + '<div class="flex items-center gap-2 mt-1 flex-wrap">'
      + '<span class="flex items-center gap-1 font-bold text-sm ' + streakColor + '">'
      + '<span class="material-symbols-outlined text-sm" style="font-variation-settings:\'FILL\' 1">local_fire_department</span>'
      + habit.currentstreak + ' day streak</span>'
      + (habit.target ? '<span class="text-on-surface-variant text-xs">• ' + habit.target + '</span>' : '')
      + '</div>'
      + '<div class="flex items-center gap-2 mt-1 flex-wrap">'
      + frequencyBadge
      + dueTodayBadge
      + '<span class="text-[10px] text-on-surface-variant">Best: ' + habit.higheststreak + ' days</span>'
      + '</div>'
      + '</div>'
      + '</div>'
      + '<div class="flex items-center gap-3">'
      + '<button class="delete-habit-btn opacity-0 group-hover:opacity-100 text-error transition-opacity p-2" data-id="' + habit._id + '">'
      + '<span class="material-symbols-outlined text-sm">delete</span></button>'
      + '<button class="complete-habit-btn px-5 py-2.5 rounded-full font-bold text-sm transition-all ' + btnClass + '" data-id="' + habit._id + '" ' + btnDisabled + '>'
      + btnText + '</button>'
      + '</div>'
      + '</div>'
      + '<div class="mt-4">'
      + '<div class="flex justify-between items-center mb-1">'
      + '<span class="text-[10px] text-on-surface-variant font-bold uppercase">Progress to personal best</span>'
      + '<span class="text-[10px] font-bold text-tertiary">' + progressPct + '%</span>'
      + '</div>'
      + '<div class="progress-bar" style="height:6px">'
      + '<div class="progress-bar__fill" style="width:' + progressPct + '%"></div>'
      + '</div>'
      + '</div>'
      + '</div>'
  })

  html += '</div>'
  list.innerHTML = html
}

function openModal() {
  document.getElementById('habit-modal')?.classList.remove('hidden')
  document.getElementById('habit-name')?.focus()
}

function closeModal() {
  document.getElementById('habit-modal')?.classList.add('hidden')
  document.getElementById('habit-name').value = ''
  document.getElementById('habit-target').value = ''
  document.getElementById('habit-frequency').value = 'daily'
  document.getElementById('habit-icon').value = ''
  document.getElementById('habit-reminder-time').value = ''
  document.getElementById('habit-form-error')?.classList.add('hidden')
  document.getElementById('save-habit-btn').textContent = 'Create Habit'
  document.getElementById('save-habit-btn').disabled = false
}

function attachEvents() {
  document.getElementById('open-habit-modal')?.addEventListener('click', openModal)
  document.getElementById('close-habit-modal')?.addEventListener('click', closeModal)
  document.getElementById('habit-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('habit-modal')) closeModal()
  })
  document.getElementById('save-habit-btn')?.addEventListener('click', saveHabit)
  document.getElementById('fab')?.addEventListener('click', openModal)

  document.getElementById('habits-list')?.addEventListener('click', async (e) => {
    const completeBtn = e.target.closest('.complete-habit-btn')
    const deleteBtn = e.target.closest('.delete-habit-btn')

    if (completeBtn && !completeBtn.disabled) {
      await completeHabit(completeBtn.dataset.id)
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.id
      if (confirm('Delete this habit?')) await deleteHabit(id)
    }
  })
}

async function saveHabit() {
  const name = document.getElementById('habit-name')?.value.trim()
  const target = document.getElementById('habit-target')?.value.trim()
  const frequency = document.getElementById('habit-frequency')?.value
  const icon = document.getElementById('habit-icon')?.value.trim()
  const reminderTime = document.getElementById('habit-reminder-time')?.value
  const errorBox = document.getElementById('habit-form-error')
  const btn = document.getElementById('save-habit-btn')

  if (!name) {
    errorBox.textContent = 'Habit name is required'
    errorBox.classList.remove('hidden')
    return
  }

  errorBox.classList.add('hidden')
  btn.textContent = 'Creating...'
  btn.disabled = true

  const body = { name, frequency }
  if (target) body.target = target
  if (icon) body.icon = icon

  try {
    const res = await api.habits.create(body)
    allHabits.unshift(res.data)

    // Auto-create daily recurring reminder if time is set
    if (reminderTime) {
      await createHabitReminder(name, reminderTime, frequency)
    }

    closeModal()
    renderPage()
  } catch (err) {
    errorBox.textContent = err.message
    errorBox.classList.remove('hidden')
    btn.textContent = 'Create Habit'
    btn.disabled = false
  }
}

async function createHabitReminder(habitName, time, frequency) {
  const [hours, minutes] = time.split(':').map(Number)
  const now = new Date()
  const reminderDate = new Date()
  reminderDate.setHours(hours, minutes, 0, 0)

  // If time has already passed today, schedule for tomorrow
  if (reminderDate <= now) {
    reminderDate.setDate(reminderDate.getDate() + 1)
  }

  const recurrenceType = frequency === 'daily' || frequency === 'weekdays' || frequency === 'weekends'
    ? 'daily'
    : 'daily'

  try {
    await api.reminders.create({
      title: 'Habit reminder: ' + habitName,
      datetime: reminderDate.toISOString(),
      notes: 'Time to complete your ' + frequency + ' habit: ' + habitName,
      recurring: true,
      recurrenceType
    })
  } catch (err) {
    console.error('Failed to create habit reminder:', err.message)
  }
}

async function completeHabit(id) {
  try {
    const res = await api.habits.complete(id)
    const idx = allHabits.findIndex(h => h._id === id)
    if (idx !== -1) allHabits[idx] = res.data
    renderPage()
  } catch (err) {
    alert('Failed: ' + err.message)
  }
}

async function deleteHabit(id) {
  try {
    await api.habits.delete(id)
    allHabits = allHabits.filter(h => h._id !== id)
    renderPage()
  } catch (err) {
    alert('Failed: ' + err.message)
  }
}

init()
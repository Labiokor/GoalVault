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

  const heroTitle = 'Daily Habits'
  const heroMsg = 'Consistency is the bridge between goals and accomplishment.'

  root.innerHTML = `
    <div class="max-w-5xl mx-auto">

      <div class="bg-gradient-to-br from-tertiary to-tertiary-fixed rounded-xl p-8 text-white relative overflow-hidden mb-8">
        <div class="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24"></div>
        <div class="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p class="text-white/70 font-bold uppercase tracking-widest text-xs mb-2">Habit Tracker</p>
            <h2 class="text-3xl font-extrabold font-headline tracking-tight mb-2">${heroTitle}</h2>
            <p class="text-white/80 text-sm">${heroMsg}</p>
          </div>
          <button id="open-habit-modal"
                  class="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 transition-all shrink-0">
            <span class="material-symbols-outlined text-sm">add</span>
            New Habit
          </button>
        </div>
      </div>

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

      <!-- Weekly Performance Chart -->
      <div class="bg-surface-container-lowest p-6 rounded-xl mb-8">
        <h3 class="text-sm font-bold text-on-surface mb-4">Weekly Performance</h3>
        <div class="flex items-end justify-between gap-3 h-40" id="weekly-chart">
          ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => `
            <div class="flex flex-col items-center gap-2 flex-1">
              <div class="w-full rounded-t-lg transition-all" style="height: 120px; background: rgba(105,246,184,0.3); opacity: 0.6;" data-day-index="${i}"></div>
              <span class="text-xs font-bold text-on-surface-variant">${day}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Calendar View -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div class="bg-surface-container-lowest p-6 rounded-xl">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-on-surface">Calendar</h3>
            <div class="flex gap-2">
              <button id="cal-prev" class="p-1.5 hover:bg-surface-container-high rounded-lg transition-colors">
                <span class="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <span id="cal-month" class="text-xs font-bold text-on-surface-variant px-3 py-1"></span>
              <button id="cal-next" class="p-1.5 hover:bg-surface-container-high rounded-lg transition-colors">
                <span class="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
          <div class="grid grid-cols-7 gap-1" id="cal-grid">
            ${['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => `<div class="text-[10px] font-bold text-on-surface-variant text-center py-1">${day}</div>`).join('')}
          </div>
        </div>

        <!-- Stats Box -->
        <div class="bg-surface-container-lowest p-6 rounded-xl">
          <h3 class="text-sm font-bold text-on-surface mb-4">Statistics</h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs text-on-surface-variant">Completed this week</span>
              <span class="text-sm font-bold text-tertiary" id="stat-week">0</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-on-surface-variant">Completed today</span>
              <span class="text-sm font-bold text-primary" id="stat-today">0</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-on-surface-variant">Completion rate</span>
              <span class="text-sm font-bold text-secondary" id="stat-rate">0%</span>
            </div>
            <div class="h-px bg-outline-variant my-2"></div>
            <div class="flex items-center justify-between pt-2">
              <span class="text-xs font-bold text-on-surface">Longest streak</span>
              <span class="text-lg font-black text-tertiary">${bestStreak}d</span>
            </div>
          </div>
        </div>
      </div>

      <div id="habits-list"></div>

    </div>

    <div id="habit-modal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center hidden">
      <div class="bg-surface-container-lowest rounded-xl p-8 w-full max-w-md mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
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
              <input class="form-input" id="habit-icon" type="text" placeholder="🧘 📚 💧" maxlength="2">
            </div>
          </div>
          <div class="bg-surface-container-low p-4 rounded-xl">
            <p class="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-3">Consistency Challenge</p>
            <p class="text-xs text-on-surface-variant mb-3">Can you stay consistent? Pick a challenge to unlock rewards.</p>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" class="challenge-btn p-3 rounded-xl border-2 border-outline-variant/20 text-center hover:border-tertiary transition-all" data-days="3">
                <span class="text-xl">🔥</span>
                <p class="text-xs font-bold text-on-surface mt-1">3 Days</p>
                <p class="text-[10px] text-on-surface-variant">Fire</p>
              </button>
              <button type="button" class="challenge-btn p-3 rounded-xl border-2 border-outline-variant/20 text-center hover:border-tertiary transition-all" data-days="7">
                <span class="text-xl">🏆</span>
                <p class="text-xs font-bold text-on-surface mt-1">7 Days</p>
                <p class="text-[10px] text-on-surface-variant">Trophy</p>
              </button>
              <button type="button" class="challenge-btn p-3 rounded-xl border-2 border-outline-variant/20 text-center hover:border-tertiary transition-all" data-days="14">
                <span class="text-xl">🏅</span>
                <p class="text-xs font-bold text-on-surface mt-1">14 Days</p>
                <p class="text-[10px] text-on-surface-variant">Badge</p>
              </button>
              <button type="button" class="challenge-btn p-3 rounded-xl border-2 border-outline-variant/20 text-center hover:border-tertiary transition-all" data-days="21">
                <span class="text-xl">⭐</span>
                <p class="text-xs font-bold text-on-surface mt-1">21 Days</p>
                <p class="text-[10px] text-on-surface-variant">Star</p>
              </button>
              <button type="button" class="challenge-btn p-3 rounded-xl border-2 border-outline-variant/20 text-center hover:border-tertiary transition-all" data-days="30">
                <span class="text-xl">💎</span>
                <p class="text-xs font-bold text-on-surface mt-1">30 Days</p>
                <p class="text-[10px] text-on-surface-variant">Diamond</p>
              </button>
            </div>
            <input type="hidden" id="habit-challenge" value="">
            <p class="text-xs text-tertiary font-bold mt-2 hidden" id="challenge-selected-label"></p>
          </div>
          <div>
            <label class="form-label">Daily Reminder Time (optional)</label>
            <input class="form-input" id="habit-reminder-time" type="time">
            <p class="text-xs text-on-surface-variant mt-1">Get a daily reminder at this time</p>
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
  const dayOfWeek = today.getDay()
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  let html = '<div class="space-y-4">'

  allHabits.forEach(habit => {
    let dueToday = false
    if (habit.frequency === 'daily') dueToday = true
    else if (habit.frequency === 'weekdays') dueToday = isWeekday
    else if (habit.frequency === 'weekends') dueToday = isWeekend

    const lastCompleted = habit.lastCompletedDates ? new Date(habit.lastCompletedDates) : null
    if (lastCompleted) lastCompleted.setHours(0, 0, 0, 0)
    const completedToday = lastCompleted && lastCompleted.getTime() === today.getTime()

    const streakColor = habit.currentstreak >= 30 ? 'text-error'
      : habit.currentstreak >= 14 ? 'text-primary' : 'text-tertiary'

    const progressPct = habit.higheststreak > 0
      ? Math.min(100, Math.round((habit.currentstreak / habit.higheststreak) * 100))
      : habit.currentstreak > 0 ? 100 : 0

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

    // Challenge progress indicator
    const challengeBadge = habit.challengeDays
      ? '<span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700">'
        + habit.currentstreak + '/' + habit.challengeDays + ' day challenge</span>'
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
      + challengeBadge
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
  document.getElementById('habit-challenge').value = ''
  document.getElementById('challenge-selected-label')?.classList.add('hidden')
  document.querySelectorAll('.challenge-btn').forEach(b => {
    b.style.borderColor = ''
    b.style.background = ''
  })
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
  
  initWeeklyChart()

  document.querySelectorAll('.challenge-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const days = btn.dataset.days
      const current = document.getElementById('habit-challenge').value

      if (current === days) {
        document.getElementById('habit-challenge').value = ''
        document.getElementById('challenge-selected-label').classList.add('hidden')
        document.querySelectorAll('.challenge-btn').forEach(b => {
          b.style.borderColor = ''
          b.style.background = ''
        })
      } else {
        document.getElementById('habit-challenge').value = days
        const label = document.getElementById('challenge-selected-label')
        label.textContent = 'Challenge set: ' + days + ' days — you got this!'
        label.classList.remove('hidden')
        document.querySelectorAll('.challenge-btn').forEach(b => {
          b.style.borderColor = b.dataset.days === days ? '#006d4a' : ''
          b.style.background = b.dataset.days === days ? 'rgba(105,246,184,0.15)' : ''
        })
      }
    })
  })

  document.getElementById('habits-list')?.addEventListener('click', async (e) => {
    const completeBtn = e.target.closest('.complete-habit-btn')
    const deleteBtn = e.target.closest('.delete-habit-btn')
    if (completeBtn && !completeBtn.disabled) await completeHabit(completeBtn.dataset.id)
    if (deleteBtn && confirm('Delete this habit?')) await deleteHabit(deleteBtn.dataset.id)
  })

  // Calendar navigation
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1)
    updateCalendar()
  })

  document.getElementById('cal-next')?.addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1)
    updateCalendar()
  })
}

async function saveHabit() {
  const name = document.getElementById('habit-name')?.value.trim()
  const target = document.getElementById('habit-target')?.value.trim()
  const frequency = document.getElementById('habit-frequency')?.value
  const icon = document.getElementById('habit-icon')?.value.trim()
  const reminderTime = document.getElementById('habit-reminder-time')?.value
  const challenge = document.getElementById('habit-challenge')?.value
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
  if (challenge) body.challengeDays = parseInt(challenge)

  try {
    const res = await api.habits.create(body)
    allHabits.unshift(res.data)
    if (reminderTime) await createHabitReminder(name, reminderTime, frequency)
    closeModal()
    renderPage()
    if (challenge) showChallengeAccepted(name, parseInt(challenge))
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
  if (reminderDate <= now) reminderDate.setDate(reminderDate.getDate() + 1)

  try {
    await api.reminders.create({
      title: 'Habit reminder: ' + habitName,
      datetime: reminderDate.toISOString(),
      notes: 'Time to complete your ' + frequency + ' habit: ' + habitName,
      recurring: true,
      recurrenceType: 'daily'
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

    const updatedHabit = res.data
    const milestones = [3, 7, 14, 21, 30, 60, 100]

    if (milestones.includes(updatedHabit.currentstreak)) {
      renderPage()
      initWeeklyChart()
      setTimeout(() => showMilestoneReward(updatedHabit.currentstreak, updatedHabit.name), 300)
    } else {
      renderPage()
      initWeeklyChart()
    }
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

function showChallengeAccepted(habitName, days) {
  const rewards = { 3: '🔥 Fire', 7: '🏆 Trophy', 14: '🏅 Badge', 21: '⭐ Star', 30: '💎 Diamond' }
  const reward = rewards[days] || '🔥 Fire'

  const popup = document.createElement('div')
  popup.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center'
  popup.innerHTML = '<div class="bg-surface-container-lowest rounded-xl p-8 max-w-sm mx-4 text-center shadow-2xl">'
    + '<div class="text-5xl mb-4">' + reward.split(' ')[0] + '</div>'
    + '<h3 class="text-xl font-black font-headline text-on-surface mb-2">Challenge Accepted!</h3>'
    + '<p class="text-on-surface-variant text-sm mb-2">Can you stay consistent with</p>'
    + '<p class="font-bold text-on-surface mb-1">"' + habitName + '"</p>'
    + '<p class="text-on-surface-variant text-sm mb-4">for <span class="font-black text-tertiary">' + days + ' days</span>?</p>'
    + '<p class="text-xs text-on-surface-variant mb-6">Complete your habit daily and earn a <strong>' + reward + '</strong> when you hit ' + days + ' days!</p>'
    + '<button id="challenge-ok-btn" class="vault-gradient text-on-primary px-8 py-3 rounded-full font-bold text-sm w-full">Let\'s Go!</button>'
    + '</div>'

  document.body.appendChild(popup)
  document.getElementById('challenge-ok-btn')?.addEventListener('click', () => {
    document.body.removeChild(popup)
  })
}

function showMilestoneReward(streak, habitName) {
  const rewards = {
    3:  { emoji: '🔥', name: 'Fire',    msg: "3 days in! You're building momentum. Keep going! 💪" },
    7:  { emoji: '🏆', name: 'Trophy',  msg: 'One full week! You\'re officially consistent. 🌟' },
    14: { emoji: '🏅', name: 'Badge',   msg: 'Two weeks strong! Halfway to a habit. 🔥' },
    21: { emoji: '⭐', name: 'Star',    msg: '21 days — science says this is now a habit! 🧠' },
    30: { emoji: '💎', name: 'Diamond', msg: '30-day streak! You\'re on fire! 🏆' },
    60: { emoji: '⚡', name: 'Thunder',  msg: '60 days! You are absolutely unstoppable! ⚡' },
    100: { emoji: '🏅', name: 'Legend', msg: '100 DAYS! You are a Goal Vault legend! 🏅' }
  }

  const reward = rewards[streak]
  if (!reward) return

  const popup = document.createElement('div')
  popup.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center'
  popup.innerHTML = '<div class="bg-surface-container-lowest rounded-xl p-8 max-w-sm mx-4 text-center shadow-2xl">'
    + '<div class="text-6xl mb-4">' + reward.emoji + '</div>'
    + '<h3 class="text-2xl font-black font-headline text-on-surface mb-2">Congratulations!</h3>'
    + '<p class="font-bold text-tertiary text-lg mb-2">' + streak + '-Day Streak!</p>'
    + '<p class="text-on-surface-variant text-sm mb-2">' + reward.msg + '</p>'
    + '<p class="font-bold text-on-surface mb-1">"' + habitName + '"</p>'
    + '<div class="my-4 p-4 rounded-xl" style="background:rgba(105,246,184,0.15)">'
    + '<p class="text-xs font-black uppercase tracking-widest text-tertiary mb-1">Reward Unlocked</p>'
    + '<p class="text-2xl">' + reward.emoji + ' ' + reward.name + '</p>'
    + '</div>'
    + '<button id="reward-ok-btn" class="vault-gradient text-on-primary px-8 py-3 rounded-full font-bold text-sm w-full">Keep Going!</button>'
    + '</div>'

  document.body.appendChild(popup)
  document.getElementById('reward-ok-btn')?.addEventListener('click', () => {
    document.body.removeChild(popup)
  })
}

function initWeeklyChart() {
  const today = new Date()
  const chartBars = document.querySelectorAll('#weekly-chart [data-day-index]')
  
  chartBars.forEach((bar, dayIndex) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - dayIndex))
    
    const completedCount = allHabits.filter(h => {
      if (!h.lastCompletedDates) return false
      const lastCompleted = new Date(h.lastCompletedDates)
      lastCompleted.setHours(0, 0, 0, 0)
      const checkDate = new Date(date)
      checkDate.setHours(0, 0, 0, 0)
      return lastCompleted.getTime() === checkDate.getTime()
    }).length
    
    const pct = allHabits.length === 0 ? 0 : Math.round((completedCount / allHabits.length) * 100)
    bar.style.height = Math.max(20, (pct / 100) * 120) + 'px'
    bar.style.opacity = pct > 0 ? '1' : '0.3'
  })
  
  updateCalendar()
  updateStats()
}

let currentCalendarDate = new Date()

function updateCalendar() {
  const month = currentCalendarDate.getMonth()
  const year = currentCalendarDate.getFullYear()
  const today = new Date()
  
  document.getElementById('cal-month').textContent = currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  let html = document.querySelectorAll('#cal-grid div:first-child').length === 7 
    ? Array.from(document.querySelectorAll('#cal-grid div')).slice(0, 7).map(el => el.outerHTML).join('')
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => `<div class="text-[10px] font-bold text-on-surface-variant text-center py-1">${day}</div>`).join('')
  
  for (let i = 0; i < firstDay; i++) html += '<div></div>'
  
  for (let day = 1; day <= daysInMonth; day++) {
    const checkDate = new Date(year, month, day)
    checkDate.setHours(0, 0, 0, 0)
    const todayCheck = new Date(today)
    todayCheck.setHours(0, 0, 0, 0)
    const isToday = checkDate.getTime() === todayCheck.getTime()
    
    const completedToday = allHabits.filter(h => {
      if (!h.lastCompletedDates) return false
      const last = new Date(h.lastCompletedDates)
      last.setHours(0, 0, 0, 0)
      return last.getTime() === checkDate.getTime()
    }).length
    const allCompleted = completedToday === allHabits.length && allHabits.length > 0
    
    html += `<div class="p-1 rounded text-[11px] font-bold text-center ${ 
      isToday ? 'bg-tertiary text-white' : 
      allCompleted ? 'bg-tertiary-container/50 text-tertiary' : 
      'text-on-surface'
    }">${day}</div>`
  }
  
  document.getElementById('cal-grid').innerHTML = html
}

function updateStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const completedToday = allHabits.filter(h => {
    if (!h.lastCompletedDates) return false
    const last = new Date(h.lastCompletedDates)
    last.setHours(0, 0, 0, 0)
    return last.getTime() === today.getTime()
  }).length
  
  let completedWeek = 0
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const count = allHabits.filter(h => {
      if (!h.lastCompletedDates) return false
      const last = new Date(h.lastCompletedDates)
      last.setHours(0, 0, 0, 0)
      return last.getTime() === date.getTime()
    }).length
    if (count === allHabits.length && allHabits.length > 0) completedWeek++
  }
  
  const completionRate = allHabits.length === 0 ? 0 : Math.round((completedToday / allHabits.length) * 100)
  
  document.getElementById('stat-today').textContent = completedToday
  document.getElementById('stat-week').textContent = completedWeek
  document.getElementById('stat-rate').textContent = completionRate + '%'
}

init()
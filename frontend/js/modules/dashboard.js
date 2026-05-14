import { api } from '../api/api.js'
import { getUser, formatDate } from '../utils/helpers.js'

const root = document.getElementById('page-root')
const user = getUser()

async function init() {
  root.innerHTML = '<div class="flex items-center justify-center py-12 text-on-surface-variant gap-2"><span class="material-symbols-outlined">progress_activity</span><span class="text-sm">Loading your sanctuary...</span></div>'

  const [tasks, habits, goals, reminders, notes] = await Promise.allSettled([
    api.tasks.getAll(),
    api.habits.getAll(),
    api.goals.getAll(),
    api.reminders.getAll(),
    api.notes.getAll()
  ])

  const tasksData     = tasks.status     === 'fulfilled' ? (tasks.value?.data     || []) : []
  const habitsData    = habits.status    === 'fulfilled' ? (habits.value?.data    || []) : []
  const goalsData     = goals.status     === 'fulfilled' ? (goals.value?.data     || []) : []
  const remindersData = reminders.status === 'fulfilled' ? (reminders.value?.data || []) : []
  const notesData     = notes.status     === 'fulfilled' ? (notes.value?.data     || []) : []

  render(tasksData, habitsData, goalsData, remindersData, notesData)
}

function badgeText(s) {
  if (s >= 100) return '🏆 LEGEND'
  if (s >= 60)  return '⚡ UNSTOPPABLE'
  if (s >= 30)  return '🌟 ON FIRE'
  if (s >= 21)  return '🚀 MASTER'
  if (s >= 14)  return '💪 CONSISTENT'
  if (s >= 7)   return '✨ BUILDING MOMENTUM'
  return '🎯 KEEP GOING'
}

function buildDots(streakVal) {
  let html = ''
  for (let i = 0; i < 21; i++) {
    html += '<div class="s-dot' + (i < streakVal ? ' lit' : '') + '"></div>'
  }
  return html
}

function buildRing(streakVal) {
  const milestones = [7, 14, 21, 30, 60, 100]
  const prev = milestones.filter(m => m <= streakVal).pop() || 0
  const next = milestones.find(m => m > streakVal) || 100
  const pct  = Math.round(((streakVal - prev) / (next - prev)) * 100)
  const circ = 188.5
  return { offset: circ - (pct / 100) * circ, pct }
}

function render(tasks, habits, goals, reminders, notes) {
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user.name ? user.name.split(' ')[0] : 'there'
  const today     = formatDate(new Date())

  const pendingTasks   = tasks.filter(t => t.status !== 'done')
  const activeGoals    = goals.filter(g => g.status === 'active')
  const shortTermGoals = goals.filter(g => g.status === 'active' && g.deadline && 
    (new Date(g.deadline) - new Date()) <= 30 * 24 * 60 * 60 * 1000)
  const longTermGoals  = goals.filter(g => g.status === 'active' && (!g.deadline ||
    (new Date(g.deadline) - new Date()) > 30 * 24 * 60 * 60 * 1000))
  const taskCount  = pendingTasks.length
  const goalCount  = activeGoals.length
  const habitCount = habits.length

  const heroMessage = taskCount === 0 && goalCount === 0
    ? 'Your sanctuary awaits. Start by creating your first task or goal.'
    : 'You have ' + taskCount + ' pending task' + (taskCount !== 1 ? 's' : '')
      + ' and ' + goalCount + ' active goal' + (goalCount !== 1 ? 's' : '') + ' today.'

  // ── Streak ────────────────────────────────────────────
  const topStreak = habits.reduce((max, h) => Math.max(max, h.currentstreak || 0), 0)
  const { offset, pct: ringPct } = buildRing(topStreak)
  const dotsHTML = buildDots(Math.min(topStreak, 21))

  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  const completedHabitsToday = habits.filter(h => {
    if (!h.lastCompletedDates) return false
    const last = new Date(h.lastCompletedDates)
    last.setHours(0, 0, 0, 0)
    return last.getTime() === todayDate.getTime()
  }).length
  const habitPct = habits.length === 0 ? 0
    : Math.round((completedHabitsToday / habits.length) * 100)

  const activeReminders = reminders.filter(r => new Date(r.datetime) > new Date() && !r.completed)

  // Reminder trend
  let reminderTrendText  = 'None set'
  let reminderTrendClass = 'neu'
  if (activeReminders.length > 0) {
    const next = [...activeReminders].sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0]
    const hoursLeft = Math.round((new Date(next.datetime) - new Date()) / (1000 * 60 * 60))
    if (hoursLeft < 1)       { reminderTrendText = 'Soon!';                          reminderTrendClass = 'warn' }
    else if (hoursLeft < 24) { reminderTrendText = hoursLeft + 'h left';             reminderTrendClass = 'warn' }
    else                     { reminderTrendText = Math.round(hoursLeft / 24) + 'd left'; reminderTrendClass = 'up' }
  }

  const notesTrendText  = notes.length > 0 ? notes.length + ' notes' : 'Empty'
  const notesTrendClass = notes.length > 0 ? 'up' : 'neu'

  // ── Global progress ───────────────────────────────────
  const doneH  = completedHabitsToday
  const totalH = habits.length
  const doneT  = tasks.filter(t => t.status === 'done').length
  const totalT = tasks.length
  const total  = totalH + totalT
  const done   = doneH + doneT
  const globalPct = total === 0 ? 0 : Math.round((done / total) * 100)

  // ── Merged tasks+habits blue card ─────────────────────
  const mergedCardHTML = '<div class="dash-merged-card" onclick="window.location.href=\'/pages/tasks.html\'">'
    + '<div class="dash-merged-left">'
    + '<div class="dash-merged-icon"><i class="fa-solid fa-list-check"></i></div>'
    + '<div>'
    + '<div class="dash-merged-label">Tasks & Habits</div>'
    + '<div class="dash-merged-value">' + taskCount + ' tasks · ' + habitPct + '% habits</div>'
    + '<div class="dash-merged-sub">'
    + (taskCount === 0 ? '✓ All tasks done' : taskCount + ' pending') 
    + ' · ' + completedHabitsToday + '/' + habitCount + ' habits today'
    + '</div>'
    + '</div>'
    + '</div>'
    + '<div class="dash-merged-right">'
    + '<div class="dash-merged-trend-tasks ' + (taskCount === 0 ? 'up' : 'warn') + '">'
    + (taskCount === 0 ? '✓ Tasks done' : taskCount + ' left') + '</div>'
    + '<div class="dash-merged-trend-habits ' + (habitPct === 100 ? 'up' : habitPct > 0 ? 'warn' : 'neu') + '">'
    + (habitPct === 100 ? '✓ Habits done' : habitPct > 0 ? habitPct + '% habits' : 'Habits pending') + '</div>'
    + '</div>'
    + '</div>'

  // ── Quick actions ─────────────────────────────────────
  const quickActions = [
    { icon: 'add_task',             label: 'New Task',     href: '/pages/tasks.html',     color: 'bg-primary-container/20 text-primary' },
    { icon: 'repeat',               label: 'Log Habit',    href: '/pages/habits.html',    color: 'bg-tertiary-container/30 text-tertiary' },
    { icon: 'emoji_events',         label: 'New Goal',     href: '/pages/goals.html',     color: 'bg-secondary-container text-secondary' },
    { icon: 'edit_note',            label: 'Write Note',   href: '/pages/notes.html',     color: 'bg-surface-container text-on-surface' },
    { icon: 'payments',             label: 'Finance',      href: '/pages/finance.html',   color: 'bg-error-container/20 text-error' },
    { icon: 'notifications_active', label: 'Set Reminder', href: '/pages/reminders.html', color: 'bg-tertiary-container/20 text-tertiary' },
  ]

  let quickActionsHTML = ''
  quickActions.forEach(a => {
    quickActionsHTML += '<a href="' + a.href + '" class="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container transition-all group">'
      + '<div class="w-9 h-9 rounded-lg ' + a.color + ' flex items-center justify-center shrink-0">'
      + '<span class="material-symbols-outlined text-sm">' + a.icon + '</span></div>'
      + '<span class="text-sm font-medium text-on-surface group-hover:text-primary transition-colors flex-1">' + a.label + '</span>'
      + '<span class="material-symbols-outlined text-on-surface-variant text-sm opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>'
      + '</a>'
  })

  // ── Short-term goals block ────────────────────────────
  const buildGoalItems = (goalsList) => {
    if (goalsList.length === 0) return ''
    let html = ''
    goalsList.slice(0, 3).forEach(goal => {
      const daysLeft = goal.deadline
        ? Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24))
        : null
      const deadlineHTML = daysLeft !== null
        ? '<span class="text-[10px] ' + (daysLeft <= 7 ? 'text-error' : 'text-on-surface-variant') + ' font-bold">'
          + (daysLeft < 0 ? 'Overdue' : daysLeft + 'd left') + '</span>'
        : ''
      html += '<div class="space-y-2">'
        + '<div class="flex justify-between items-center">'
        + '<p class="text-sm font-bold text-on-surface truncate flex-1 mr-2">' + goal.title + '</p>'
        + '<div class="flex items-center gap-2 shrink-0">'
        + deadlineHTML
        + '<p class="text-[10px] font-bold text-tertiary uppercase">' + goal.progress + '%</p>'
        + '</div>'
        + '</div>'
        + '<div class="progress-bar"><div class="progress-bar__fill" style="width:' + goal.progress + '%"></div></div>'
        + '</div>'
    })
    return html
  }

  const shortTermHTML = shortTermGoals.length === 0
    ? '<p class="text-xs text-on-surface-variant text-center py-4">No short-term goals (due within 30 days)</p>'
    : buildGoalItems(shortTermGoals)

  const longTermHTML = longTermGoals.length === 0
    ? '<div class="flex flex-col items-center justify-center py-8 gap-3 text-center">'
      + '<span class="material-symbols-outlined text-primary text-3xl">emoji_events</span>'
      + '<p class="text-sm text-on-surface-variant">No long-term goals yet</p>'
      + '<a href="/pages/goals.html" class="vault-gradient text-on-primary px-6 py-2 rounded-full font-bold text-xs">Add Goal</a>'
      + '</div>'
    : buildGoalItems(longTermGoals)

  // ── Final render ──────────────────────────────────────
  root.innerHTML = `
    <div class="dash-root" id="dash-root">

      <!-- 1. Motivational hero -->
      <div class="vault-gradient rounded-xl p-8 text-on-primary relative overflow-hidden dash-motivational">
        <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div class="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p class="text-on-primary/70 font-bold uppercase tracking-widest text-xs mb-2">${today}</p>
            <h2 class="text-3xl md:text-4xl font-extrabold font-headline tracking-tight leading-none mb-2">
              ${greeting}, ${firstName} 👋
            </h2>
            <p class="text-on-primary/80 text-sm">${heroMessage}</p>
          </div>
          <div class="dash-hero-stats">
            <div class="text-center">
              <p class="text-2xl font-black font-headline">${taskCount}</p>
              <p class="text-[10px] text-on-primary/70 uppercase font-bold">Tasks</p>
            </div>
            <div class="w-px bg-white/20"></div>
            <div class="text-center">
              <p class="text-2xl font-black font-headline">${goalCount}</p>
              <p class="text-[10px] text-on-primary/70 uppercase font-bold">Goals</p>
            </div>
            <div class="w-px bg-white/20"></div>
            <div class="text-center">
              <p class="text-2xl font-black font-headline">${habitCount}</p>
              <p class="text-[10px] text-on-primary/70 uppercase font-bold">Habits</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Streak hero -->
      <div class="streak-hero">
        <div class="streak-flame">🔥</div>
        <div class="streak-text">
          <div class="streak-num">${topStreak}</div>
          <div class="streak-label">Day Winning Streak</div>
          <div class="streak-badge">${badgeText(topStreak)}</div>
        </div>
        <div class="streak-progress-wrap">
          <div class="streak-progress-label">Next Milestone</div>
          <div class="streak-ring-wrap">
            <svg width="76" height="76" viewBox="0 0 76 76">
              <circle class="ring-bg"   cx="38" cy="38" r="30"/>
              <circle class="ring-fill" cx="38" cy="38" r="30"
                stroke-dasharray="188.5" stroke-dashoffset="${offset}"/>
            </svg>
            <div class="ring-inner-text">
              <div class="ring-pct">${ringPct}%</div>
              <div class="ring-sub">to goal</div>
            </div>
          </div>
        </div>
        <div class="streak-dots-wrap">
          <div class="streak-dots-label">This Month</div>
          <div class="streak-dots-grid">${dotsHTML}</div>
        </div>
      </div>

      <!-- 3. Stat cards: merged blue + reminders + notes -->
      <div class="dash-stat-row">
        ${mergedCardHTML}
        <div class="stat-card" onclick="window.location.href='/pages/reminders.html'">
          <div class="stat-icon-wrap reminders"><i class="fa-solid fa-bell"></i></div>
          <div class="stat-info">
            <div class="stat-label">Reminders</div>
            <div class="stat-value">${activeReminders.length}</div>
            <div class="stat-sub">${activeReminders.length === 0 ? 'no active' : 'upcoming'}</div>
          </div>
          <div class="stat-trend ${reminderTrendClass}">${reminderTrendText}</div>
        </div>
        <div class="stat-card" onclick="window.location.href='/pages/notes.html'">
          <div class="stat-icon-wrap notes"><i class="fa-solid fa-note-sticky"></i></div>
          <div class="stat-info">
            <div class="stat-label">Notes</div>
            <div class="stat-value">${notes.length}</div>
            <div class="stat-sub">saved in notebook</div>
          </div>
          <div class="stat-trend ${notesTrendClass}">${notesTrendText}</div>
        </div>
      </div>

      <!-- 4. Global progress -->
      <div class="progress-card">
        <div class="progress-card-header">
          <div class="progress-card-title">Today's Overall Progress</div>
          <div class="progress-card-count">${done} / ${total} done</div>
        </div>
        <div class="progress-track">
          <div class="progress-fill" id="dash-global-fill" style="width:0%"></div>
        </div>
        <div class="progress-legend">
          <div class="prog-legend-item"><div class="prog-dot orange"></div>Completed</div>
          <div class="prog-legend-item"><div class="prog-dot grey"></div>Remaining</div>
        </div>
      </div>

      <!-- 5. Goals + Quick Actions -->
      <div class="dash-goals-grid">

        <!-- Short-term goals -->
        <div class="bg-surface-container-lowest p-6 rounded-xl ring-1 ring-outline-variant/5">
          <div class="flex items-center justify-between mb-5">
            <div>
              <h3 class="text-base font-bold font-headline">Short-term Goals</h3>
              <p class="text-xs text-on-surface-variant mt-0.5">Due within 30 days</p>
            </div>
            <a href="/pages/goals.html" class="text-xs font-bold text-primary hover:underline">View All</a>
          </div>
          <div class="space-y-4">${shortTermHTML}</div>

          <!-- Daily reminder toggle for short-term goals -->
          ${shortTermGoals.length > 0 ? `
          <div class="mt-4 pt-4 border-t border-outline-variant/10">
            <button id="dash-goal-reminder-btn"
                    class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container transition-all text-left"
                    onclick="setGoalDailyReminder()">
              <span class="material-symbols-outlined text-sm text-primary">notifications_active</span>
              <span class="text-xs font-bold text-on-surface">Set daily reminder for goals</span>
              <span class="material-symbols-outlined text-on-surface-variant text-sm ml-auto">chevron_right</span>
            </button>
          </div>` : ''}
        </div>

        <!-- Strategic (long-term) goals -->
        <div class="bg-surface-container-lowest p-6 rounded-xl ring-1 ring-outline-variant/5">
          <div class="flex items-center justify-between mb-5">
            <div>
              <h3 class="text-base font-bold font-headline">Strategic Goals</h3>
              <p class="text-xs text-on-surface-variant mt-0.5">Long-term vision</p>
            </div>
            <a href="/pages/goals.html" class="text-xs font-bold text-primary hover:underline">Manage</a>
          </div>
          <div class="space-y-4">${longTermHTML}</div>

          ${longTermGoals.length > 0 ? `
          <div class="mt-4 pt-4 border-t border-outline-variant/10">
            <button class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container transition-all text-left"
                    onclick="setGoalDailyReminder()">
              <span class="material-symbols-outlined text-sm text-primary">alarm</span>
              <span class="text-xs font-bold text-on-surface">Set daily reminder for goals</span>
              <span class="material-symbols-outlined text-on-surface-variant text-sm ml-auto">chevron_right</span>
            </button>
          </div>` : ''}
        </div>

        <!-- Quick actions -->
        <div class="bg-surface-container-low p-6 rounded-xl">
          <h3 class="text-base font-bold font-headline mb-5">Quick Actions</h3>
          <div class="space-y-1">${quickActionsHTML}</div>
        </div>

      </div>

    </div>

    <!-- Goal reminder modal -->
    <div id="goal-reminder-modal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center hidden">
      <div class="bg-surface-container-lowest rounded-xl p-8 w-full max-w-sm mx-4 shadow-xl">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold font-headline">Daily Goal Reminder</h3>
          <button onclick="document.getElementById('goal-reminder-modal').classList.add('hidden')"
                  class="text-on-surface-variant hover:text-on-surface">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <p class="text-sm text-on-surface-variant mb-5">Pick a time to receive a daily reminder to work on your goals.</p>
        <div class="space-y-4">
          <div>
            <label class="form-label">Reminder Time</label>
            <input class="form-input" id="goal-reminder-time" type="time" value="09:00">
          </div>
          <button onclick="saveGoalReminder()"
                  class="w-full vault-gradient text-on-primary py-3 rounded-xl font-bold text-sm hover:opacity-90">
            Set Daily Reminder
          </button>
        </div>
      </div>
    </div>
  `

  // Animate progress bar
  setTimeout(() => {
    const fill = document.getElementById('dash-global-fill')
    if (fill) fill.style.width = globalPct + '%'
  }, 300)

  // Search functionality
  setupSearch(tasks, habits, goals, notes, reminders)
}

// ── Search ────────────────────────────────────────────────────
function setupSearch(tasks, habits, goals, notes, reminders) {
  const searchInput = document.getElementById('global-search')
  if (!searchInput) return

  let searchDropdown = null

  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase()

    if (searchDropdown) { searchDropdown.remove(); searchDropdown = null }
    if (!q) return

    const results = []

    tasks.forEach(t => {
      if (t.title.toLowerCase().includes(q)) {
        results.push({ type: 'Task', icon: 'check_circle', label: t.title, href: '/pages/tasks.html', color: 'text-pink-500' })
      }
    })
    habits.forEach(h => {
      if (h.name.toLowerCase().includes(q)) {
        results.push({ type: 'Habit', icon: 'repeat', label: h.name, href: '/pages/habits.html', color: 'text-tertiary' })
      }
    })
    goals.forEach(g => {
      if (g.title.toLowerCase().includes(q)) {
        results.push({ type: 'Goal', icon: 'emoji_events', label: g.title, href: '/pages/goals.html', color: 'text-primary' })
      }
    })
    notes.forEach(n => {
      if ((n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)) {
        results.push({ type: 'Note', icon: 'edit_note', label: n.title || 'Untitled', href: '/pages/notes.html', color: 'text-amber-500' })
      }
    })
    reminders.forEach(r => {
      if (r.title.toLowerCase().includes(q)) {
        results.push({ type: 'Reminder', icon: 'notifications_active', label: r.title, href: '/pages/reminders.html', color: 'text-error' })
      }
    })

    if (results.length === 0) {
      results.push({ type: '', icon: 'search_off', label: 'No results found', href: null, color: 'text-on-surface-variant' })
    }

    // Build dropdown
    searchDropdown = document.createElement('div')
    searchDropdown.className = 'fixed z-50 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/10 overflow-hidden'
    searchDropdown.style.cssText = 'width:380px;max-height:320px;overflow-y:auto'

    const rect = searchInput.getBoundingClientRect()
    searchDropdown.style.top = (rect.bottom + 8) + 'px'
    searchDropdown.style.left = rect.left + 'px'

    results.slice(0, 8).forEach(r => {
      const item = document.createElement('div')
      item.className = 'flex items-center gap-3 px-4 py-3 hover:bg-surface-container cursor-pointer transition-colors'
      item.innerHTML = '<span class="material-symbols-outlined text-sm ' + r.color + '">' + r.icon + '</span>'
        + '<div class="flex-1 min-w-0">'
        + '<p class="text-sm font-medium text-on-surface truncate">' + r.label + '</p>'
        + (r.type ? '<p class="text-xs text-on-surface-variant">' + r.type + '</p>' : '')
        + '</div>'

      if (r.href) {
        item.addEventListener('click', () => {
          window.location.href = r.href
          searchDropdown?.remove()
        })
      }
      searchDropdown.appendChild(item)
    })

    document.body.appendChild(searchDropdown)
  })

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (searchDropdown && !searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
      searchDropdown.remove()
      searchDropdown = null
    }
  })
}

// ── Goal daily reminder ───────────────────────────────────────
window.setGoalDailyReminder = function() {
  document.getElementById('goal-reminder-modal')?.classList.remove('hidden')
}

window.saveGoalReminder = async function() {
  const time = document.getElementById('goal-reminder-time')?.value
  if (!time) return

  const [hours, minutes] = time.split(':').map(Number)
  const now = new Date()
  const reminderDate = new Date()
  reminderDate.setHours(hours, minutes, 0, 0)
  if (reminderDate <= now) reminderDate.setDate(reminderDate.getDate() + 1)

  try {
    await api.reminders.create({
      title: 'Daily Goal Check-in',
      datetime: reminderDate.toISOString(),
      notes: 'Time to review and work on your goals for today!',
      recurring: true,
      recurrenceType: 'daily'
    })
    document.getElementById('goal-reminder-modal')?.classList.add('hidden')
    const btn = document.getElementById('dash-goal-reminder-btn')
    if (btn) {
      btn.innerHTML = '<span class="material-symbols-outlined text-sm text-tertiary">check_circle</span>'
        + '<span class="text-xs font-bold text-tertiary">Daily reminder set for ' + time + '</span>'
      btn.onclick = null
    }
  } catch (err) {
    alert('Failed to set reminder: ' + err.message)
  }
}

document.addEventListener('click', (e) => {
  if (e.target.closest('.avatar')) window.location.href = '/pages/settings.html'
})

init()
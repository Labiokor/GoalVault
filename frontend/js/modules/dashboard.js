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

  const pendingTasks = tasks.filter(t => t.status !== 'done')
  const activeGoals  = goals.filter(g => g.status === 'active')
  const taskCount    = pendingTasks.length
  const goalCount    = activeGoals.length
  const habitCount   = habits.length

  // ── Motivational message (yours) ─────────────────────
  const heroMessage = taskCount === 0 && goalCount === 0
    ? 'Your sanctuary awaits. Start by creating your first task or goal.'
    : 'You have ' + taskCount + ' pending task' + (taskCount !== 1 ? 's' : '')
      + ' and ' + goalCount + ' active goal' + (goalCount !== 1 ? 's' : '') + ' today.'

  // ── Streak (from habits backend data) ────────────────
  const topStreak = habits.reduce((max, h) => Math.max(max, h.currentstreak || 0), 0)
  const { offset, pct: ringPct } = buildRing(topStreak)
  const dotsHTML = buildDots(Math.min(topStreak, 21))

  // ── Today's date helpers ──────────────────────────────
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  // ── Stat card values (hers) ───────────────────────────
  const completedHabitsToday = habits.filter(h => {
    if (!h.lastCompletedDates) return false
    const last = new Date(h.lastCompletedDates)
    last.setHours(0, 0, 0, 0)
    return last.getTime() === todayDate.getTime()
  }).length
  const habitPct = habits.length === 0 ? 0
    : Math.round((completedHabitsToday / habits.length) * 100)

  const activeReminders = reminders.filter(r => new Date(r.datetime) > new Date() && !r.completed)

  // Task trend
  const taskTrendText  = taskCount === 0 ? '✓ All done' : taskCount + ' left'
  const taskTrendClass = taskCount === 0 ? 'up' : 'warn'

  // Habit trend
  const habitTrendText  = habitPct === 100 ? '✓ All done' : habitPct > 0 ? habitPct + '% done' : 'Not started'
  const habitTrendClass = habitPct === 100 ? 'up' : habitPct > 0 ? 'warn' : 'neu'

  // Reminder trend
  let reminderTrendText  = 'None set'
  let reminderTrendClass = 'neu'
  if (activeReminders.length > 0) {
    const next = [...activeReminders].sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0]
    const hoursLeft = Math.round((new Date(next.datetime) - new Date()) / (1000 * 60 * 60))
    if (hoursLeft < 1)       { reminderTrendText = 'Soon!';                  reminderTrendClass = 'warn' }
    else if (hoursLeft < 24) { reminderTrendText = hoursLeft + 'h left';     reminderTrendClass = 'warn' }
    else                     { reminderTrendText = Math.round(hoursLeft / 24) + 'd left'; reminderTrendClass = 'up' }
  }

  // Notes trend
  const notesTrendText  = notes.length > 0 ? notes.length + ' notes' : 'Empty'
  const notesTrendClass = notes.length > 0 ? 'up' : 'neu'

  // ── Global progress (hers) ────────────────────────────
  const doneH  = completedHabitsToday
  const totalH = habits.length
  const doneT  = tasks.filter(t => t.status === 'done').length
  const totalT = tasks.length
  const total  = totalH + totalT
  const done   = doneH + doneT
  const globalPct = total === 0 ? 0 : Math.round((done / total) * 100)

  // ── Tasks block (yours) ───────────────────────────────
  let taskItems = ''
  pendingTasks.slice(0, 5).forEach(task => {
    let pc = 'bg-tertiary-container/30 text-tertiary'
    if (task.priority === 'high')   pc = 'bg-error-container/20 text-error'
    if (task.priority === 'medium') pc = 'bg-secondary-container text-on-secondary-container'
    taskItems += '<div class="flex items-start gap-3">'
      + '<div class="w-5 h-5 rounded border-2 border-primary-container mt-0.5 shrink-0"></div>'
      + '<div class="flex-1 min-w-0">'
      + '<p class="font-medium text-on-surface text-sm truncate">' + task.title + '</p>'
      + '<span class="text-[10px] px-2 py-0.5 font-bold rounded mt-1 inline-block uppercase ' + pc + '">' + task.priority + '</span>'
      + '</div></div>'
  })

  const moreTasksLink = pendingTasks.length > 5
    ? '<a href="/pages/tasks.html" class="text-xs text-on-surface-variant hover:text-primary block text-center pt-2">+'
      + (pendingTasks.length - 5) + ' more tasks</a>'
    : ''

  const tasksBlock = taskCount === 0
    ? '<div class="flex flex-col items-center justify-center py-8 gap-3 text-center">'
      + '<div class="w-14 h-14 rounded-full bg-primary-container/20 flex items-center justify-center">'
      + '<span class="material-symbols-outlined text-primary text-2xl">check_circle</span></div>'
      + '<p class="text-sm font-medium text-on-surface">All clear!</p>'
      + '<p class="text-xs text-on-surface-variant">No pending tasks right now</p>'
      + '<a href="/pages/tasks.html" class="text-xs font-bold text-primary hover:underline">Add a task</a>'
      + '</div>'
    : '<div class="space-y-4">' + taskItems + moreTasksLink + '</div>'

  // ── Habits block — top streak only (yours) ────────────
  let habitsBlock = ''
  if (habitCount === 0) {
    habitsBlock = '<div class="flex flex-col items-center justify-center py-6 gap-3 text-center">'
      + '<div class="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center">'
      + '<span class="material-symbols-outlined text-secondary text-2xl">repeat</span></div>'
      + '<p class="text-sm font-medium text-on-surface">No habits tracked yet</p>'
      + '<a href="/pages/habits.html" class="text-xs font-bold text-primary hover:underline">Start a habit</a>'
      + '</div>'
  } else {
    const top = habits.reduce((best, h) =>
      (h.currentstreak || 0) > (best.currentstreak || 0) ? h : best, habits[0])
    const streakPct = top.higheststreak > 0
      ? Math.min(100, Math.round((top.currentstreak / top.higheststreak) * 100))
      : 100
    const streakColor = top.currentstreak >= 30 ? '#ef4444'
      : top.currentstreak >= 14 ? '#005bc4' : '#006d4a'

    habitsBlock = '<div class="flex flex-col gap-4">'
      + '<div class="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl">'
      + '<div class="w-12 h-12 rounded-full bg-tertiary-container/30 flex items-center justify-center text-2xl shrink-0">'
      + (top.icon || '✅') + '</div>'
      + '<div class="flex-1 min-w-0">'
      + '<p class="font-bold text-on-surface text-sm truncate">' + top.name + '</p>'
      + '<div class="flex items-center gap-1 mt-1">'
      + '<span class="material-symbols-outlined text-sm" style="font-variation-settings:\'FILL\' 1;color:' + streakColor + '">local_fire_department</span>'
      + '<span class="text-sm font-black" style="color:' + streakColor + '">' + top.currentstreak + ' day streak</span>'
      + '</div>'
      + '<div class="w-full h-1.5 rounded-full mt-2" style="background:#e5e9eb">'
      + '<div class="h-1.5 rounded-full transition-all" style="width:' + streakPct + '%;background:' + streakColor + '"></div>'
      + '</div>'
      + '</div>'
      + '</div>'
      + (habits.length > 1
        ? '<a href="/pages/habits.html" class="text-xs text-on-surface-variant text-center hover:text-primary transition-colors">+'
          + (habits.length - 1) + ' more habit' + (habits.length > 2 ? 's' : '') + ' — View all</a>'
        : '')
      + '</div>'
  }

  // ── Goals block (yours) ───────────────────────────────
  let goalItems = ''
  activeGoals.slice(0, 4).forEach(goal => {
    goalItems += '<div class="space-y-3">'
      + '<div class="flex justify-between items-end">'
      + '<p class="text-sm font-bold text-on-surface truncate flex-1 mr-4">' + goal.title + '</p>'
      + '<p class="text-[10px] font-bold text-tertiary uppercase shrink-0">' + goal.progress + '%</p>'
      + '</div>'
      + '<div class="progress-bar"><div class="progress-bar__fill" style="width:' + goal.progress + '%"></div></div>'
      + (goal.description ? '<p class="text-[10px] text-on-surface-variant italic">' + goal.description + '</p>' : '')
      + '</div>'
  })

  const goalsBlock = goalCount === 0
    ? '<div class="flex flex-col items-center justify-center py-12 gap-4 text-center">'
      + '<div class="w-20 h-20 rounded-full bg-primary-container/10 flex items-center justify-center">'
      + '<span class="material-symbols-outlined text-primary text-4xl">emoji_events</span></div>'
      + '<h4 class="text-lg font-bold text-on-surface">No goals yet</h4>'
      + '<p class="text-on-surface-variant text-sm max-w-sm">Goals give your productivity direction.</p>'
      + '<a href="/pages/goals.html" class="vault-gradient text-on-primary px-8 py-3 rounded-full font-bold text-sm">Create First Goal</a>'
      + '</div>'
    : '<div class="grid md:grid-cols-2 gap-x-16 gap-y-8">' + goalItems + '</div>'

  // ── Quick actions (yours) ─────────────────────────────
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

  // ── Final render ──────────────────────────────────────
  root.innerHTML = `
    <div class="dash-root">

      <!-- 1. YOUR motivational hero -->
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

      <!-- 2. HER streak hero -->
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
              <circle class="ring-bg" cx="38" cy="38" r="30"/>
              <circle class="ring-fill" cx="38" cy="38" r="30"
                stroke-dasharray="188.5"
                stroke-dashoffset="${offset}"/>
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

      <!-- 3. HER 4 stat cards -->
      <div class="stat-row">
        <div class="stat-card" onclick="window.location.href='/pages/tasks.html'">
          <div class="stat-icon-wrap tasks"><i class="fa-solid fa-list-check"></i></div>
          <div class="stat-info">
            <div class="stat-label">Tasks</div>
            <div class="stat-value">${taskCount}</div>
            <div class="stat-sub">remaining today</div>
          </div>
          <div class="stat-trend ${taskTrendClass}">${taskTrendText}</div>
        </div>
        <div class="stat-card" onclick="window.location.href='/pages/habits.html'">
          <div class="stat-icon-wrap habits"><i class="fa-solid fa-seedling"></i></div>
          <div class="stat-info">
            <div class="stat-label">Habits</div>
            <div class="stat-value">${habitPct}%</div>
            <div class="stat-sub">completed today</div>
          </div>
          <div class="stat-trend ${habitTrendClass}">${habitTrendText}</div>
        </div>
        <div class="stat-card" onclick="window.location.href='/pages/reminders.html'">
          <div class="stat-icon-wrap reminders"><i class="fa-solid fa-bell"></i></div>
          <div class="stat-info">
            <div class="stat-label">Reminders</div>
            <div class="stat-value">${activeReminders.length}</div>
            <div class="stat-sub">${activeReminders.length === 0 ? 'no active reminders' : 'upcoming'}</div>
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

      <!-- 4. HER global progress bar -->
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

      <!-- 5. YOUR tasks + habits + quick actions -->
      <div class="dash-bottom-grid">

        <div class="bg-surface-container-lowest p-8 rounded-xl ring-1 ring-outline-variant/5 dash-tasks-col">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold font-headline">Today Tasks</h3>
            <a href="/pages/tasks.html" class="text-xs font-bold text-primary hover:underline">View All</a>
          </div>
          ${tasksBlock}
        </div>

        <div class="bg-surface-container-lowest p-8 rounded-xl ring-1 ring-outline-variant/5 dash-habits-col">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold font-headline">Habit Streaks</h3>
            <a href="/pages/habits.html" class="text-xs font-bold text-primary hover:underline">View All</a>
          </div>
          ${habitsBlock}
        </div>

        <div class="bg-surface-container-low p-8 rounded-xl dash-actions-col">
          <h3 class="text-lg font-bold font-headline mb-6">Quick Actions</h3>
          <div class="space-y-2">${quickActionsHTML}</div>
        </div>

      </div>

      <!-- 6. YOUR strategic goals -->
      <div class="bg-surface-container-lowest p-10 rounded-xl ring-1 ring-outline-variant/5">
        <div class="flex items-center justify-between mb-8">
          <div>
            <h3 class="text-2xl font-bold font-headline">Strategic Goals</h3>
            <p class="text-on-surface-variant text-sm mt-1">Track your long-term vision</p>
          </div>
          <a href="/pages/goals.html"
             class="bg-secondary-container text-on-secondary-container font-bold px-6 py-2 rounded-full text-sm hover:brightness-95 transition-all">
            Manage Goals
          </a>
        </div>
        ${goalsBlock}
      </div>

    </div>
  `

  // Animate progress bar
  setTimeout(() => {
    const fill = document.getElementById('dash-global-fill')
    if (fill) fill.style.width = globalPct + '%'
  }, 300)
}

document.addEventListener('click', (e) => {
  if (e.target.closest('.avatar')) window.location.href = '/pages/settings.html'
})

init()
import { api } from '../api/api.js'
import { getUser, formatDate, formatCurrency } from '../utils/helpers.js'

const root = document.getElementById('page-root')
const user = getUser()

async function init() {
  root.innerHTML = '<div class="flex items-center justify-center py-12 text-on-surface-variant gap-2"><span class="material-symbols-outlined">progress_activity</span><span class="text-sm">Loading your sanctuary...</span></div>'

  const [tasks, habits, goals, summary] = await Promise.allSettled([
    api.tasks.getAll(),
    api.habits.getAll(),
    api.goals.getAll(),
    api.finance.getSummary()
  ])

  const tasksData   = tasks.status   === 'fulfilled' ? (tasks.value?.data   || []) : []
  const habitsData  = habits.status  === 'fulfilled' ? (habits.value?.data  || []) : []
  const goalsData   = goals.status   === 'fulfilled' ? (goals.value?.data   || []) : []
  const summaryData = summary.status === 'fulfilled' ? (summary.value?.data || {}) : {}

  render(tasksData, habitsData, goalsData, summaryData)
}

function render(tasks, habits, goals, summary) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user.name ? user.name.split(' ')[0] : 'there'
  const today = formatDate(new Date())
  const pendingTasks = tasks.filter(t => t.status !== 'done')
  const activeGoals = goals.filter(g => g.status === 'active')

  const taskCount = pendingTasks.length
  const goalCount = activeGoals.length
  const habitCount = habits.length

  const heroMessage = taskCount === 0 && goalCount === 0
    ? 'Your sanctuary awaits. Start by creating your first task or goal.'
    : 'You have ' + taskCount + ' pending task' + (taskCount !== 1 ? 's' : '') + ' and ' + goalCount + ' active goal' + (goalCount !== 1 ? 's' : '') + ' today.'

  // ── Tasks block ────────────────────────────────────────────────
  let taskItems = ''
  pendingTasks.slice(0, 5).forEach(task => {
    let pc = 'bg-tertiary-container/30 text-tertiary'
    if (task.priority === 'high') pc = 'bg-error-container/20 text-error'
    if (task.priority === 'medium') pc = 'bg-secondary-container text-on-secondary-container'
    taskItems += '<div class="flex items-start gap-3">'
      + '<div class="w-5 h-5 rounded border-2 border-primary-container mt-0.5 shrink-0"></div>'
      + '<div class="flex-1 min-w-0">'
      + '<p class="font-medium text-on-surface text-sm truncate">' + task.title + '</p>'
      + '<span class="text-[10px] px-2 py-0.5 font-bold rounded mt-1 inline-block uppercase ' + pc + '">' + task.priority + '</span>'
      + '</div></div>'
  })

  const moreTasksLink = pendingTasks.length > 5
    ? '<a href="/pages/tasks.html" class="text-xs text-on-surface-variant hover:text-primary block text-center pt-2">+' + (pendingTasks.length - 5) + ' more tasks</a>'
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

  // ── Habits block ───────────────────────────────────────────────
  let habitItems = ''
  habits.slice(0, 4).forEach(habit => {
    habitItems += '<div class="flex-1 bg-surface-container-low p-4 rounded-xl flex flex-col items-center text-center min-w-[70px]">'
      + '<span class="material-symbols-outlined text-tertiary mb-1" style="font-variation-settings:\'FILL\' 1">local_fire_department</span>'
      + '<p class="text-xl font-black font-headline">' + habit.currentstreak + '</p>'
      + '<p class="text-[10px] text-on-surface-variant uppercase leading-tight truncate w-full">' + habit.name + '</p>'
      + '</div>'
  })

  const habitsBlock = habitCount === 0
    ? '<div class="flex flex-col items-center justify-center py-6 gap-3 text-center">'
      + '<div class="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center">'
      + '<span class="material-symbols-outlined text-secondary text-2xl">repeat</span></div>'
      + '<p class="text-sm font-medium text-on-surface">No habits tracked yet</p>'
      + '<a href="/pages/habits.html" class="text-xs font-bold text-primary hover:underline">Start a habit</a>'
      + '</div>'
    : '<div class="flex gap-2 flex-wrap">' + habitItems + '</div>'

  // ── Finance block ──────────────────────────────────────────────
  const financeBlock = !summary.deposit && !summary.expense
    ? '<div class="flex flex-col items-center justify-center py-6 gap-3 text-center">'
      + '<div class="w-14 h-14 rounded-full bg-tertiary-container/30 flex items-center justify-center">'
      + '<span class="material-symbols-outlined text-tertiary text-2xl">payments</span></div>'
      + '<p class="text-sm font-medium text-on-surface">No transactions yet</p>'
      + '<a href="/pages/finance.html" class="text-xs font-bold text-primary hover:underline">Set up your wallet</a>'
      + '</div>'
    : '<div class="grid grid-cols-3 gap-3">'
      + '<div class="bg-surface-container-lowest p-4 rounded-xl">'
      + '<p class="text-[10px] font-label text-on-surface-variant uppercase mb-1">Income</p>'
      + '<p class="text-base font-bold text-tertiary">' + formatCurrency(summary.deposit || 0) + '</p></div>'
      + '<div class="bg-surface-container-lowest p-4 rounded-xl">'
      + '<p class="text-[10px] font-label text-on-surface-variant uppercase mb-1">Expenses</p>'
      + '<p class="text-base font-bold text-error">' + formatCurrency(summary.expense || 0) + '</p></div>'
      + '<div class="vault-gradient p-4 rounded-xl">'
      + '<p class="text-[10px] font-label text-on-primary opacity-80 uppercase mb-1">Balance</p>'
      + '<p class="text-base font-bold text-on-primary">' + formatCurrency(summary.netBalance || 0) + '</p></div>'
      + '</div>'

  // ── Goals block ────────────────────────────────────────────────
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
      + '<p class="text-on-surface-variant text-sm max-w-sm">Goals give your productivity direction. Create your first goal and start tracking progress.</p>'
      + '<a href="/pages/goals.html" class="vault-gradient text-on-primary px-8 py-3 rounded-full font-bold text-sm hover:opacity-90 transition-all">Create First Goal</a>'
      + '</div>'
    : '<div class="grid md:grid-cols-2 gap-x-16 gap-y-8">' + goalItems + '</div>'

  // ── Quick actions ──────────────────────────────────────────────
  const quickActions = [
    { icon: 'add_task',             label: 'New Task',        href: '/pages/tasks.html',     color: 'bg-primary-container/20 text-primary' },
    { icon: 'repeat',               label: 'Log Habit',       href: '/pages/habits.html',    color: 'bg-tertiary-container/30 text-tertiary' },
    { icon: 'emoji_events',         label: 'New Goal',        href: '/pages/goals.html',     color: 'bg-secondary-container text-secondary' },
    { icon: 'edit_note',            label: 'Write Note',      href: '/pages/notes.html',     color: 'bg-surface-container text-on-surface' },
    { icon: 'payments',             label: 'Add Transaction', href: '/pages/finance.html',   color: 'bg-error-container/20 text-error' },
    { icon: 'notifications_active', label: 'Set Reminder',    href: '/pages/reminders.html', color: 'bg-tertiary-container/20 text-tertiary' },
  ]

  let quickActionsHTML = ''
  quickActions.forEach(a => {
    quickActionsHTML += '<a href="' + a.href + '" class="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container transition-all group cursor-pointer">'
      + '<div class="w-9 h-9 rounded-lg ' + a.color + ' flex items-center justify-center shrink-0">'
      + '<span class="material-symbols-outlined text-sm">' + a.icon + '</span></div>'
      + '<span class="text-sm font-medium text-on-surface group-hover:text-primary transition-colors flex-1">' + a.label + '</span>'
      + '<span class="material-symbols-outlined text-on-surface-variant text-sm opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>'
      + '</a>'
  })

  // ── Final render ───────────────────────────────────────────────
  root.innerHTML = `
    <section class="mb-10">
      <div class="vault-gradient rounded-xl p-8 text-on-primary relative overflow-hidden mb-6">
        <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div class="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p class="text-on-primary/70 font-bold uppercase tracking-widest text-xs mb-2">${today}</p>
            <h2 class="text-3xl md:text-4xl font-extrabold font-headline tracking-tight leading-none mb-2">
              ${greeting}, ${firstName}
            </h2>
            <p class="text-on-primary/80 text-sm">${heroMessage}</p>
          </div>
          <div class="flex gap-6 shrink-0">
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
    </section>

    <div class="grid grid-cols-12 gap-6">

      <div class="col-span-12 lg:col-span-4 bg-surface-container-lowest p-8 rounded-xl ring-1 ring-outline-variant/5">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold font-headline">Today Tasks</h3>
          <a href="/pages/tasks.html" class="text-xs font-bold text-primary hover:underline">View All</a>
        </div>
        ${tasksBlock}
      </div>

      <div class="col-span-12 lg:col-span-5 flex flex-col gap-6">
        <div class="bg-surface-container-low p-8 rounded-xl flex-1">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold font-headline">Finance Summary</h3>
            <a href="/pages/finance.html" class="text-xs font-bold text-primary hover:underline">View All</a>
          </div>
          ${financeBlock}
        </div>
        <div class="bg-surface-container-lowest p-8 rounded-xl ring-1 ring-outline-variant/5 flex-1">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold font-headline">Habit Streaks</h3>
            <a href="/pages/habits.html" class="text-xs font-bold text-primary hover:underline">View All</a>
          </div>
          ${habitsBlock}
        </div>
      </div>

      <div class="col-span-12 lg:col-span-3 bg-surface-container-low p-8 rounded-xl">
        <h3 class="text-lg font-bold font-headline mb-6">Quick Actions</h3>
        <div class="space-y-2">${quickActionsHTML}</div>
      </div>

      <div class="col-span-12 bg-surface-container-lowest p-10 rounded-xl ring-1 ring-outline-variant/5">
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
}

document.addEventListener('click', (e) => {
  if (e.target.closest('.avatar')) {
    window.location.href = '/pages/settings.html'
  }
})

init()
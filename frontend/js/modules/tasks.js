import { api } from '../api/api.js'
import { getUser } from '../utils/helpers.js'

const root = document.getElementById('page-root')
const user = getUser()
let allTasks = []
let activeFilter = 'all'

async function init() {
  root.innerHTML = '<div class="flex items-center justify-center py-12 text-on-surface-variant gap-2"><span class="material-symbols-outlined">progress_activity</span><span class="text-sm">Loading tasks...</span></div>'

  try {
    const res = await api.tasks.getAll()
    allTasks = res.data || []
    renderPage()
  } catch (err) {
    root.innerHTML = '<p class="text-error text-sm p-8">' + err.message + '</p>'
  }
}

function renderPage() {
  const done = allTasks.filter(t => t.status === 'done').length
  const pending = allTasks.filter(t => t.status !== 'done').length
  const high = allTasks.filter(t => t.priority === 'high' && t.status !== 'done').length
  const firstName = user.name ? user.name.split(' ')[0] : 'there'

  root.innerHTML = `
    <div class="max-w-5xl mx-auto">

      <!-- Welcome Hero -->
      <div class="vault-gradient rounded-xl p-8 text-on-primary relative overflow-hidden mb-8">
        <div class="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24"></div>
        <div class="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p class="text-on-primary/70 font-bold uppercase tracking-widest text-xs mb-2">Task Manager</p>
            <h2 class="text-3xl font-extrabold font-headline tracking-tight mb-2">
              ${allTasks.length === 0 ? 'Ready to be productive, ' + firstName + '?' : 'Keep pushing, ' + firstName + '!'}
            </h2>
            <p class="text-on-primary/80 text-sm">
              ${allTasks.length === 0
                ? 'You have no tasks yet. Create your first task and start getting things done.'
                : pending + ' task' + (pending !== 1 ? 's' : '') + ' remaining' + (high > 0 ? ' — ' + high + ' high priority' : '') + '. You can do this!'}
            </p>
          </div>
          <button id="open-task-modal"
                  class="bg-white/20 hover:bg-white/30 text-on-primary px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 transition-all shrink-0">
            <span class="material-symbols-outlined text-sm">add_task</span>
            New Task
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-8">
        <div class="bg-surface-container-lowest p-5 rounded-xl text-center ring-1 ring-outline-variant/5">
          <p class="text-2xl font-black font-headline text-on-surface">${allTasks.length}</p>
          <p class="text-xs text-on-surface-variant uppercase font-bold mt-1">Total</p>
        </div>
        <div class="bg-surface-container-lowest p-5 rounded-xl text-center ring-1 ring-outline-variant/5">
          <p class="text-2xl font-black font-headline text-primary">${pending}</p>
          <p class="text-xs text-on-surface-variant uppercase font-bold mt-1">Pending</p>
        </div>
        <div class="bg-surface-container-lowest p-5 rounded-xl text-center ring-1 ring-outline-variant/5">
          <p class="text-2xl font-black font-headline text-tertiary">${done}</p>
          <p class="text-xs text-on-surface-variant uppercase font-bold mt-1">Completed</p>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="flex gap-2 mb-6 bg-surface-container-low p-1 rounded-xl w-fit">
        <button class="filter-btn px-5 py-2 rounded-lg text-sm font-bold transition-all" data-filter="all">All</button>
        <button class="filter-btn px-5 py-2 rounded-lg text-sm font-bold transition-all" data-filter="todo">To Do</button>
        <button class="filter-btn px-5 py-2 rounded-lg text-sm font-bold transition-all" data-filter="doing">Doing</button>
        <button class="filter-btn px-5 py-2 rounded-lg text-sm font-bold transition-all" data-filter="done">Done</button>
      </div>

      <!-- Task List -->
      <div id="task-list"></div>

    </div>

    <!-- Modal -->
    <div id="task-modal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center hidden">
      <div class="bg-surface-container-lowest rounded-xl p-8 w-full max-w-md mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold font-headline">New Task</h3>
          <button id="close-task-modal" class="text-on-surface-variant hover:text-on-surface">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div id="task-form-error" class="hidden mb-4 p-3 bg-error-container/20 text-error rounded-lg text-sm"></div>

        <div class="space-y-4">
          <div>
            <label class="form-label">Task Title</label>
            <input class="form-input" id="task-title" type="text" placeholder="What needs to be done?">
          </div>
          <div>
            <label class="form-label">Description (optional)</label>
            <textarea class="form-input resize-none" id="task-desc" rows="2" placeholder="Add details..."></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Priority</label>
              <select class="form-input" id="task-priority">
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label class="form-label">Deadline (optional)</label>
              <input class="form-input" id="task-deadline" type="datetime-local">
            </div>
          </div>

          <!-- Reminder toggles — only show when deadline is set -->
          <div id="reminder-options" class="hidden bg-surface-container-low p-4 rounded-xl space-y-3">
            <p class="text-xs font-black uppercase tracking-widest text-on-surface-variant">Deadline Reminders</p>
            <p class="text-xs text-on-surface-variant">You will be notified automatically at these intervals before the deadline:</p>
            <div class="space-y-2">
              <label class="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" id="remind-1hr" class="w-4 h-4 accent-primary" checked>
                <span class="text-sm font-medium text-on-surface">1 hour before</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" id="remind-30min" class="w-4 h-4 accent-primary" checked>
                <span class="text-sm font-medium text-on-surface">30 minutes before</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" id="remind-5min" class="w-4 h-4 accent-primary" checked>
                <span class="text-sm font-medium text-on-surface">5 minutes before</span>
              </label>
            </div>
          </div>

          <button id="save-task-btn"
                  class="w-full vault-gradient text-on-primary py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all">
            Create Task
          </button>
        </div>
      </div>
    </div>
  `

  setActiveFilter(activeFilter)
  renderTaskList()
  attachEvents()
}

function renderTaskList() {
  const list = document.getElementById('task-list')
  if (!list) return

  const filtered = activeFilter === 'all'
    ? allTasks
    : allTasks.filter(t => t.status === activeFilter)

  if (filtered.length === 0) {
    list.innerHTML = '<div class="flex flex-col items-center justify-center py-16 gap-4 text-center">'
      + '<div class="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center">'
      + '<span class="material-symbols-outlined text-on-surface-variant text-4xl">task_alt</span></div>'
      + '<h3 class="text-lg font-bold text-on-surface">'
      + (activeFilter === 'all' ? 'No tasks yet' : 'No ' + activeFilter + ' tasks')
      + '</h3>'
      + '<p class="text-sm text-on-surface-variant max-w-xs">'
      + (activeFilter === 'all' ? 'Tasks help you stay focused. Create your first one and start ticking things off.' : 'Nothing here right now.')
      + '</p>'
      + (activeFilter === 'all' ? '<button id="empty-new-task" class="vault-gradient text-on-primary px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-90">Create First Task</button>' : '')
      + '</div>'

    document.getElementById('empty-new-task')?.addEventListener('click', openModal)
    return
  }

  // Group by status
  const groups = { todo: [], doing: [], done: [] }
  filtered.forEach(t => { if (groups[t.status]) groups[t.status].push(t) })

  const groupLabels = { todo: 'To Do', doing: 'In Progress', done: 'Completed' }
  const groupColors = {
    todo:  'bg-amber-100 text-amber-700',
    doing: 'bg-secondary-container text-on-secondary-container',
    done:  'bg-tertiary-container/30 text-tertiary'
  }

  let html = ''

  Object.entries(groups).forEach(([status, tasks]) => {
    if (tasks.length === 0) return

    html += '<div class="mb-8">'
      + '<div class="flex items-center gap-3 mb-4">'
      + '<span class="text-xs font-black uppercase tracking-widest text-on-surface-variant">' + groupLabels[status] + '</span>'
      + '<span class="text-xs font-bold px-2 py-0.5 rounded-full ' + groupColors[status] + '">' + tasks.length + '</span>'
      + '</div><div class="space-y-3">'

    tasks.forEach(task => {
      let pc = 'bg-tertiary-container/30 text-tertiary'
      if (task.priority === 'high') pc = 'bg-error-container/20 text-error'
      if (task.priority === 'medium') pc = 'bg-secondary-container text-on-secondary-container'

      const isDone = task.status === 'done'

      const deadline = task.deadline
        ? buildDeadlineHTML(task.deadline, isDone)
        : ''

      html += '<div class="bg-surface-container-lowest p-5 rounded-xl flex items-start gap-4 group hover:shadow-sm transition-all">'
        + '<button class="toggle-status-btn w-6 h-6 rounded border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all '
        + (isDone ? 'bg-primary border-primary' : 'border-primary-container hover:bg-primary-container/20')
        + '" data-id="' + task._id + '" data-status="' + task.status + '">'
        + (isDone ? '<span class="material-symbols-outlined text-xs text-white">check</span>' : '')
        + '</button>'
        + '<div class="flex-1 min-w-0">'
        + '<p class="font-medium text-on-surface text-sm ' + (isDone ? 'line-through opacity-50' : '') + '">' + task.title + '</p>'
        + (task.description ? '<p class="text-xs text-on-surface-variant mt-1">' + task.description + '</p>' : '')
        + '<div class="flex items-center gap-3 mt-2 flex-wrap">'
        + '<span class="text-[10px] px-2 py-0.5 font-bold rounded uppercase ' + pc + '">' + task.priority + '</span>'
        + deadline
        + '</div>'
        + '</div>'
        + '<button class="delete-task-btn opacity-0 group-hover:opacity-100 text-error transition-opacity shrink-0" data-id="' + task._id + '">'
        + '<span class="material-symbols-outlined text-sm">delete</span>'
        + '</button>'
        + '</div>'
    })

    html += '</div></div>'
  })

  list.innerHTML = html
}

function buildDeadlineHTML(deadline, isDone) {
  const dt = new Date(deadline)
  const now = new Date()
  const diff = dt - now
  const dateStr = dt.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  let urgencyClass = 'text-on-surface-variant'
  let urgencyIcon = 'calendar_today'

  if (!isDone) {
    if (diff < 0) {
      urgencyClass = 'text-error font-bold'
      urgencyIcon = 'warning'
    } else if (diff < 3600000) {
      urgencyClass = 'text-error'
      urgencyIcon = 'alarm'
    } else if (diff < 1800000 * 2) {
      urgencyClass = 'text-amber-600'
      urgencyIcon = 'alarm'
    }
  }

  return '<span class="text-[10px] flex items-center gap-1 ' + urgencyClass + '">'
    + '<span class="material-symbols-outlined text-xs">' + urgencyIcon + '</span>'
    + (diff < 0 && !isDone ? 'Overdue · ' : '') + dateStr
    + '</span>'
}

function setActiveFilter(filter) {
  activeFilter = filter
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const isActive = btn.dataset.filter === filter
    btn.className = 'filter-btn px-5 py-2 rounded-lg text-sm font-bold transition-all '
      + (isActive ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')
  })
}

function openModal() {
  document.getElementById('task-modal')?.classList.remove('hidden')
  document.getElementById('task-title')?.focus()
}

function closeModal() {
  document.getElementById('task-modal')?.classList.add('hidden')
  document.getElementById('task-title').value = ''
  document.getElementById('task-desc').value = ''
  document.getElementById('task-priority').value = 'medium'
  document.getElementById('task-deadline').value = ''
  document.getElementById('reminder-options')?.classList.add('hidden')
  document.getElementById('task-form-error')?.classList.add('hidden')
  document.getElementById('save-task-btn').textContent = 'Create Task'
  document.getElementById('save-task-btn').disabled = false
}

function attachEvents() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveFilter(btn.dataset.filter)
      renderTaskList()
    })
  })

  document.getElementById('open-task-modal')?.addEventListener('click', openModal)
  document.getElementById('close-task-modal')?.addEventListener('click', closeModal)
  document.getElementById('task-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('task-modal')) closeModal()
  })
  document.getElementById('fab')?.addEventListener('click', openModal)
  document.getElementById('save-task-btn')?.addEventListener('click', saveTask)
  document.getElementById('task-title')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveTask()
  })

  // Show reminder options when deadline is set
  document.getElementById('task-deadline')?.addEventListener('change', (e) => {
    const reminderOpts = document.getElementById('reminder-options')
    if (e.target.value) {
      reminderOpts?.classList.remove('hidden')
    } else {
      reminderOpts?.classList.add('hidden')
    }
  })

  document.getElementById('task-list')?.addEventListener('click', async (e) => {
    const toggleBtn = e.target.closest('.toggle-status-btn')
    const deleteBtn = e.target.closest('.delete-task-btn')

    if (toggleBtn) {
      const id = toggleBtn.dataset.id
      const current = toggleBtn.dataset.status
      const next = current === 'done' ? 'todo' : current === 'todo' ? 'doing' : 'done'
      await updateTaskStatus(id, next)
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.id
      if (confirm('Delete this task?')) await deleteTask(id)
    }
  })
}

async function saveTask() {
  const title = document.getElementById('task-title')?.value.trim()
  const description = document.getElementById('task-desc')?.value.trim()
  const priority = document.getElementById('task-priority')?.value
  const deadline = document.getElementById('task-deadline')?.value
  const errorBox = document.getElementById('task-form-error')
  const btn = document.getElementById('save-task-btn')

  if (!title) {
    errorBox.textContent = 'Task title is required'
    errorBox.classList.remove('hidden')
    return
  }

  errorBox.classList.add('hidden')
  btn.textContent = 'Creating...'
  btn.disabled = true

  const body = { title, priority }
  if (description) body.description = description
  if (deadline) body.deadline = deadline

  try {
    const res = await api.tasks.create(body)
    allTasks.unshift(res.data)

    // Auto-create reminders if deadline is set
    if (deadline) {
      await createDeadlineReminders(title, deadline)
    }

    closeModal()
    renderPage()
  } catch (err) {
    errorBox.textContent = err.message
    errorBox.classList.remove('hidden')
    btn.textContent = 'Create Task'
    btn.disabled = false
  }
}

async function createDeadlineReminders(taskTitle, deadline) {
  const dt = new Date(deadline)
  const remind1hr  = document.getElementById('remind-1hr')?.checked
  const remind30min = document.getElementById('remind-30min')?.checked
  const remind5min  = document.getElementById('remind-5min')?.checked

  const reminders = []

  if (remind1hr) {
    const time = new Date(dt.getTime() - 60 * 60 * 1000)
    if (time > new Date()) {
      reminders.push({
        title: '1 hour left — ' + taskTitle,
        datetime: time.toISOString(),
        notes: 'Your task "' + taskTitle + '" is due in 1 hour.',
        recurring: false
      })
    }
  }

  if (remind30min) {
    const time = new Date(dt.getTime() - 30 * 60 * 1000)
    if (time > new Date()) {
      reminders.push({
        title: '30 minutes left — ' + taskTitle,
        datetime: time.toISOString(),
        notes: 'Your task "' + taskTitle + '" is due in 30 minutes.',
        recurring: false
      })
    }
  }

  if (remind5min) {
    const time = new Date(dt.getTime() - 5 * 60 * 1000)
    if (time > new Date()) {
      reminders.push({
        title: '5 minutes left — ' + taskTitle,
        datetime: time.toISOString(),
        notes: 'Your task "' + taskTitle + '" is due in 5 minutes.',
        recurring: false
      })
    }
  }

  // Create all reminders in parallel
  await Promise.allSettled(reminders.map(r => api.reminders.create(r)))
}

async function updateTaskStatus(id, status) {
  try {
    const res = await api.tasks.update(id, { status })
    const idx = allTasks.findIndex(t => t._id === id)
    if (idx !== -1) allTasks[idx] = res.data
    renderTaskList()
  } catch (err) {
    alert('Failed to update: ' + err.message)
  }
}

async function deleteTask(id) {
  try {
    await api.tasks.delete(id)
    allTasks = allTasks.filter(t => t._id !== id)
    renderPage()
  } catch (err) {
    alert('Failed to delete: ' + err.message)
  }
}

init()
import { api } from '../api/api.js'

const root = document.getElementById('page-root')

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
  root.innerHTML = `
    <div class="max-w-5xl mx-auto">

      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <p class="text-primary font-bold uppercase tracking-widest text-xs mb-2">Productivity</p>
          <h2 class="text-4xl font-extrabold font-headline text-on-surface tracking-tight">My Tasks</h2>
        </div>
        <button id="open-task-modal"
                class="vault-gradient text-on-primary px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all w-fit">
          <span class="material-symbols-outlined text-sm">add</span>
          New Task
        </button>
      </div>

      <!-- Filter Tabs -->
      <div class="flex gap-2 mb-8 bg-surface-container-low p-1 rounded-xl w-fit">
        <button class="filter-btn px-5 py-2 rounded-lg text-sm font-bold transition-all" data-filter="all">All</button>
        <button class="filter-btn px-5 py-2 rounded-lg text-sm font-bold transition-all" data-filter="todo">To Do</button>
        <button class="filter-btn px-5 py-2 rounded-lg text-sm font-bold transition-all" data-filter="doing">Doing</button>
        <button class="filter-btn px-5 py-2 rounded-lg text-sm font-bold transition-all" data-filter="done">Done</button>
      </div>

      <!-- Task List -->
      <div id="task-list"></div>

    </div>

    <!-- Create Task Modal -->
    <div id="task-modal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center hidden">
      <div class="bg-surface-container-lowest rounded-xl p-8 w-full max-w-md mx-4 shadow-xl">
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
            <textarea class="form-input resize-none" id="task-desc" rows="3" placeholder="Add details..."></textarea>
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
              <input class="form-input" id="task-deadline" type="date">
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
    list.innerHTML = '<div class="flex flex-col items-center justify-center py-16 gap-3 text-center">'
      + '<div class="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center">'
      + '<span class="material-symbols-outlined text-on-surface-variant text-3xl">check_circle</span></div>'
      + '<p class="text-base font-bold text-on-surface">No tasks here</p>'
      + '<p class="text-sm text-on-surface-variant">Click "New Task" to get started</p>'
      + '</div>'
    return
  }

  // Group by status
  const groups = { todo: [], doing: [], done: [] }
  filtered.forEach(t => {
    if (groups[t.status]) groups[t.status].push(t)
  })

  let html = ''

  const groupLabels = { todo: 'To Do', doing: 'In Progress', done: 'Completed' }
  const groupColors = {
    todo:  'bg-amber-100 text-amber-700',
    doing: 'bg-secondary-container text-on-secondary-container',
    done:  'bg-tertiary-container/30 text-tertiary'
  }

  Object.entries(groups).forEach(([status, tasks]) => {
    if (tasks.length === 0) return

    html += '<div class="mb-8">'
      + '<div class="flex items-center gap-3 mb-4">'
      + '<span class="text-xs font-black uppercase tracking-widest text-on-surface-variant">' + groupLabels[status] + '</span>'
      + '<span class="text-xs font-bold px-2 py-0.5 rounded-full ' + groupColors[status] + '">' + tasks.length + '</span>'
      + '</div>'
      + '<div class="space-y-3">'

    tasks.forEach(task => {
      let pc = 'bg-tertiary-container/30 text-tertiary'
      if (task.priority === 'high') pc = 'bg-error-container/20 text-error'
      if (task.priority === 'medium') pc = 'bg-secondary-container text-on-secondary-container'

      const deadline = task.deadline
        ? '<span class="text-[10px] text-on-surface-variant flex items-center gap-1"><span class="material-symbols-outlined text-xs">calendar_today</span>' + new Date(task.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + '</span>'
        : ''

      const isDone = task.status === 'done'

      html += '<div class="bg-surface-container-lowest p-5 rounded-xl flex items-start gap-4 group hover:shadow-sm transition-all">'
        + '<button class="toggle-status-btn w-6 h-6 rounded border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all '
        + (isDone ? 'bg-primary border-primary' : 'border-primary-container hover:bg-primary-container/20')
        + '" data-id="' + task._id + '" data-status="' + task.status + '">'
        + (isDone ? '<span class="material-symbols-outlined text-xs text-white">check</span>' : '')
        + '</button>'
        + '<div class="flex-1 min-w-0">'
        + '<p class="font-medium text-on-surface text-sm ' + (isDone ? 'line-through opacity-50' : '') + '">' + task.title + '</p>'
        + (task.description ? '<p class="text-xs text-on-surface-variant mt-1">' + task.description + '</p>' : '')
        + '<div class="flex items-center gap-3 mt-2">'
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

function setActiveFilter(filter) {
  activeFilter = filter
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const isActive = btn.dataset.filter === filter
    btn.className = 'filter-btn px-5 py-2 rounded-lg text-sm font-bold transition-all '
      + (isActive ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')
  })
}

function attachEvents() {
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveFilter(btn.dataset.filter)
      renderTaskList()
    })
  })

  // Open modal
  document.getElementById('open-task-modal')?.addEventListener('click', () => {
    document.getElementById('task-modal')?.classList.remove('hidden')
    document.getElementById('task-title')?.focus()
  })

  // Close modal
  document.getElementById('close-task-modal')?.addEventListener('click', closeModal)
  document.getElementById('task-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('task-modal')) closeModal()
  })

  // Save task
  document.getElementById('save-task-btn')?.addEventListener('click', saveTask)

  // Enter key in title
  document.getElementById('task-title')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveTask()
  })

  // FAB opens modal
  document.getElementById('fab')?.addEventListener('click', () => {
    document.getElementById('task-modal')?.classList.remove('hidden')
    document.getElementById('task-title')?.focus()
  })

  // Toggle status + delete (event delegation)
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

  try {
    const body = { title, priority }
    if (description) body.description = description
    if (deadline) body.deadline = deadline

    const res = await api.tasks.create(body)
    allTasks.unshift(res.data)
    closeModal()
    renderTaskList()
  } catch (err) {
    errorBox.textContent = err.message
    errorBox.classList.remove('hidden')
    btn.textContent = 'Create Task'
    btn.disabled = false
  }
}

async function updateTaskStatus(id, status) {
  try {
    const res = await api.tasks.update(id, { status })
    const idx = allTasks.findIndex(t => t._id === id)
    if (idx !== -1) allTasks[idx] = res.data
    renderTaskList()
  } catch (err) {
    alert('Failed to update task: ' + err.message)
  }
}

async function deleteTask(id) {
  try {
    await api.tasks.delete(id)
    allTasks = allTasks.filter(t => t._id !== id)
    renderTaskList()
  } catch (err) {
    alert('Failed to delete task: ' + err.message)
  }
}

function closeModal() {
  document.getElementById('task-modal')?.classList.add('hidden')
  document.getElementById('task-title').value = ''
  document.getElementById('task-desc').value = ''
  document.getElementById('task-priority').value = 'medium'
  document.getElementById('task-deadline').value = ''
  document.getElementById('task-form-error')?.classList.add('hidden')
  document.getElementById('save-task-btn').textContent = 'Create Task'
  document.getElementById('save-task-btn').disabled = false
}

init()

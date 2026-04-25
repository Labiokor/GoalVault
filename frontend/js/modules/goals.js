import { api } from '../api/api.js'

const root = document.getElementById('page-root')
let allGoals = []

async function init() {
  root.innerHTML = '<div class="flex items-center justify-center py-12 text-on-surface-variant gap-2"><span class="material-symbols-outlined">progress_activity</span><span class="text-sm">Loading goals...</span></div>'

  try {
    const res = await api.goals.getAll()
    allGoals = res.data || []
    renderPage()
  } catch (err) {
    root.innerHTML = '<p class="text-error text-sm p-8">' + err.message + '</p>'
  }
}

function renderPage() {
  root.innerHTML = `
    <div class="max-w-6xl mx-auto">

      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <p class="text-primary font-bold uppercase tracking-widest text-xs mb-2">Long-term Vision</p>
          <h2 class="text-4xl font-extrabold font-headline text-on-surface tracking-tight">My Goals</h2>
        </div>
        <button id="open-goal-modal"
                class="vault-gradient text-on-primary px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all w-fit">
          <span class="material-symbols-outlined text-sm">add</span>
          New Goal
        </button>
      </div>

      <div id="goals-grid"></div>

    </div>

    <!-- Modal -->
    <div id="goal-modal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center hidden">
      <div class="bg-surface-container-lowest rounded-xl p-8 w-full max-w-md mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold font-headline" id="goal-modal-title">New Goal</h3>
          <button id="close-goal-modal" class="text-on-surface-variant hover:text-on-surface">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div id="goal-form-error" class="hidden mb-4 p-3 bg-error-container/20 text-error rounded-lg text-sm"></div>

        <div class="space-y-4">
          <div>
            <label class="form-label">Goal Title</label>
            <input class="form-input" id="goal-title" type="text" placeholder="What do you want to achieve?">
          </div>
          <div>
            <label class="form-label">Description (optional)</label>
            <textarea class="form-input resize-none" id="goal-desc" rows="2" placeholder="Describe your goal..."></textarea>
          </div>
          <div>
            <label class="form-label">Target (optional)</label>
            <input class="form-input" id="goal-target" type="text" placeholder="e.g. Save 5000 GHS, Run 100km">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Target Amount (optional)</label>
              <input class="form-input" id="goal-amount" type="number" placeholder="0.00" min="0">
            </div>
            <div>
              <label class="form-label">Deadline (optional)</label>
              <input class="form-input" id="goal-deadline" type="date">
            </div>
          </div>
          <div>
            <label class="form-label">Progress (%)</label>
            <input class="form-input" id="goal-progress" type="number" min="0" max="100" value="0" placeholder="0">
          </div>
          <button id="save-goal-btn"
                  class="w-full vault-gradient text-on-primary py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all">
            Create Goal
          </button>
        </div>
      </div>
    </div>
  `

  renderGoalsGrid()
  attachEvents()
}

function renderGoalsGrid() {
  const grid = document.getElementById('goals-grid')
  if (!grid) return

  if (allGoals.length === 0) {
    grid.innerHTML = '<div class="flex flex-col items-center justify-center py-20 gap-4 text-center">'
      + '<div class="w-24 h-24 rounded-full bg-primary-container/10 flex items-center justify-center">'
      + '<span class="material-symbols-outlined text-primary text-5xl">emoji_events</span></div>'
      + '<h3 class="text-xl font-bold text-on-surface">No goals yet</h3>'
      + '<p class="text-on-surface-variant text-sm max-w-sm">Define what you want to achieve and track your progress toward it.</p>'
      + '<button id="empty-new-goal" class="vault-gradient text-on-primary px-8 py-3 rounded-full font-bold text-sm hover:opacity-90 transition-all">Create First Goal</button>'
      + '</div>'

    document.getElementById('empty-new-goal')?.addEventListener('click', openModal)
    return
  }

  const bgColors = ['bg-blue-50/80', 'bg-emerald-50/80', 'bg-purple-50/80', 'bg-amber-50/80', 'bg-rose-50/50']

  let html = '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">'

  allGoals.forEach((goal, i) => {
    const bg = bgColors[i % bgColors.length]
    const statusColor = goal.status === 'completed'
      ? 'bg-tertiary-container/30 text-tertiary'
      : goal.status === 'paused'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-primary-container/20 text-primary'

    const deadline = goal.deadline
      ? '<div class="flex items-center gap-1 text-xs text-on-surface-variant mt-1"><span class="material-symbols-outlined text-xs">calendar_today</span>' + new Date(goal.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '</div>'
      : ''

    const milestones = goal.milestones && goal.milestones.length > 0
      ? '<div class="mt-4 space-y-2">'
        + '<p class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Milestones</p>'
        + goal.milestones.slice(0, 3).map(m => {
          return '<div class="flex items-center gap-2">'
            + '<span class="material-symbols-outlined text-sm ' + (m.completed ? 'text-tertiary' : 'text-outline') + '" style="font-variation-settings:\'FILL\' ' + (m.completed ? '1' : '0') + '">'
            + (m.completed ? 'check_circle' : 'radio_button_unchecked')
            + '</span>'
            + '<span class="text-xs text-on-surface ' + (m.completed ? 'line-through opacity-50' : '') + '">' + m.text + '</span>'
            + '</div>'
        }).join('')
        + (goal.milestones.length > 3 ? '<p class="text-xs text-on-surface-variant">+' + (goal.milestones.length - 3) + ' more</p>' : '')
        + '</div>'
      : ''

    html += '<div class="' + bg + ' rounded-xl p-8 relative overflow-hidden group">'
      + '<div class="flex items-start justify-between mb-6">'
      + '<div class="flex-1">'
      + '<span class="text-[10px] px-2 py-0.5 font-bold rounded-full uppercase ' + statusColor + '">' + goal.status + '</span>'
      + '<h3 class="text-xl font-bold text-on-surface mt-2">' + goal.title + '</h3>'
      + (goal.description ? '<p class="text-xs text-on-surface-variant mt-1">' + goal.description + '</p>' : '')
      + deadline
      + '</div>'
      + '<div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">'
      + '<button class="edit-goal-btn text-on-surface-variant hover:text-primary p-1" data-id="' + goal._id + '">'
      + '<span class="material-symbols-outlined text-sm">edit</span></button>'
      + '<button class="delete-goal-btn text-on-surface-variant hover:text-error p-1" data-id="' + goal._id + '">'
      + '<span class="material-symbols-outlined text-sm">delete</span></button>'
      + '</div>'
      + '</div>'

      + '<div class="mb-4">'
      + '<div class="flex justify-between items-center mb-2">'
      + '<span class="text-xs font-bold text-on-surface-variant">Progress</span>'
      + '<span class="text-xs font-bold text-tertiary">' + goal.progress + '%</span>'
      + '</div>'
      + '<div class="progress-bar"><div class="progress-bar__fill" style="width:' + goal.progress + '%"></div></div>'
      + '</div>'

      + (goal.targetAmount
        ? '<div class="flex items-center gap-2 mt-2 p-3 bg-white/60 rounded-xl">'
          + '<div><p class="text-xs font-bold text-tertiary uppercase">Saved</p>'
          + '<p class="text-lg font-black text-on-surface">GHS ' + (goal.savedAmount || 0).toFixed(2) + '</p></div>'
          + '<span class="text-on-surface-variant mx-2">/</span>'
          + '<div><p class="text-xs font-bold text-on-surface-variant uppercase">Target</p>'
          + '<p class="text-lg font-black text-on-surface">GHS ' + Number(goal.targetAmount).toFixed(2) + '</p></div>'
          + '</div>'
        : '')

      + milestones

      + '<div class="mt-4 flex items-center gap-2">'
      + '<label class="text-xs font-bold text-on-surface-variant">Update Progress</label>'
      + '<input type="range" min="0" max="100" value="' + goal.progress + '" class="flex-1 accent-primary progress-slider" data-id="' + goal._id + '">'
      + '</div>'
      + '</div>'
  })

  // Add new goal card
  html += '<div class="border-2 border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 cursor-pointer hover:border-primary transition-all group" id="add-goal-card">'
    + '<div class="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center group-hover:bg-primary-container/20 transition-all">'
    + '<span class="material-symbols-outlined text-on-surface-variant text-3xl group-hover:text-primary">add</span></div>'
    + '<h3 class="text-base font-bold text-on-surface">New Goal</h3>'
    + '<p class="text-xs text-on-surface-variant">Define your next milestone</p>'
    + '</div>'

  html += '</div>'
  grid.innerHTML = html

  // Progress slider events
  document.querySelectorAll('.progress-slider').forEach(slider => {
    slider.addEventListener('change', async (e) => {
      const id = e.target.dataset.id
      const progress = parseInt(e.target.value)
      await updateGoalProgress(id, progress)
    })
  })

  document.getElementById('add-goal-card')?.addEventListener('click', openModal)
}

function attachEvents() {
  document.getElementById('open-goal-modal')?.addEventListener('click', openModal)
  document.getElementById('close-goal-modal')?.addEventListener('click', closeModal)

  document.getElementById('goal-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('goal-modal')) closeModal()
  })

  document.getElementById('save-goal-btn')?.addEventListener('click', saveGoal)

  document.getElementById('fab')?.addEventListener('click', openModal)

  document.getElementById('goals-grid')?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.edit-goal-btn')
    const deleteBtn = e.target.closest('.delete-goal-btn')

    if (editBtn) {
      const id = editBtn.dataset.id
      const goal = allGoals.find(g => g._id === id)
      if (goal) openEditModal(goal)
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.id
      if (confirm('Delete this goal?')) await deleteGoal(id)
    }
  })
}

function openModal() {
  document.getElementById('goal-modal-title').textContent = 'New Goal'
  document.getElementById('save-goal-btn').textContent = 'Create Goal'
  document.getElementById('save-goal-btn').dataset.editId = ''
  document.getElementById('goal-modal')?.classList.remove('hidden')
  document.getElementById('goal-title')?.focus()
}

function openEditModal(goal) {
  document.getElementById('goal-modal-title').textContent = 'Edit Goal'
  document.getElementById('goal-title').value = goal.title || ''
  document.getElementById('goal-desc').value = goal.description || ''
  document.getElementById('goal-target').value = goal.targetValue || ''
  document.getElementById('goal-amount').value = goal.targetAmount || ''
  document.getElementById('goal-progress').value = goal.progress || 0
  document.getElementById('goal-deadline').value = goal.deadline ? goal.deadline.split('T')[0] : ''
  document.getElementById('save-goal-btn').textContent = 'Save Changes'
  document.getElementById('save-goal-btn').dataset.editId = goal._id
  document.getElementById('goal-modal')?.classList.remove('hidden')
}

function closeModal() {
  document.getElementById('goal-modal')?.classList.add('hidden')
  document.getElementById('goal-title').value = ''
  document.getElementById('goal-desc').value = ''
  document.getElementById('goal-target').value = ''
  document.getElementById('goal-amount').value = ''
  document.getElementById('goal-progress').value = '0'
  document.getElementById('goal-deadline').value = ''
  document.getElementById('goal-form-error')?.classList.add('hidden')
  document.getElementById('save-goal-btn').textContent = 'Create Goal'
  document.getElementById('save-goal-btn').dataset.editId = ''
  document.getElementById('save-goal-btn').disabled = false
}

async function saveGoal() {
  const title = document.getElementById('goal-title')?.value.trim()
  const description = document.getElementById('goal-desc')?.value.trim()
  const targetValue = document.getElementById('goal-target')?.value.trim()
  const targetAmount = document.getElementById('goal-amount')?.value
  const progress = document.getElementById('goal-progress')?.value
  const deadline = document.getElementById('goal-deadline')?.value
  const errorBox = document.getElementById('goal-form-error')
  const btn = document.getElementById('save-goal-btn')
  const editId = btn.dataset.editId

  if (!title) {
    errorBox.textContent = 'Goal title is required'
    errorBox.classList.remove('hidden')
    return
  }

  errorBox.classList.add('hidden')
  btn.textContent = editId ? 'Saving...' : 'Creating...'
  btn.disabled = true

  const body = { title }
  if (description) body.description = description
  if (targetValue) body.targetValue = targetValue
  if (targetAmount) body.targetAmount = parseFloat(targetAmount)
  if (progress) body.progress = parseInt(progress)
  if (deadline) body.deadline = deadline

  try {
    if (editId) {
      const res = await api.goals.update(editId, body)
      const idx = allGoals.findIndex(g => g._id === editId)
      if (idx !== -1) allGoals[idx] = res.data
    } else {
      const res = await api.goals.create(body)
      allGoals.unshift(res.data)
    }
    closeModal()
    renderGoalsGrid()
  } catch (err) {
    errorBox.textContent = err.message
    errorBox.classList.remove('hidden')
    btn.textContent = editId ? 'Save Changes' : 'Create Goal'
    btn.disabled = false
  }
}

async function updateGoalProgress(id, progress) {
  try {
    const res = await api.goals.updateProgress(id, { progress })
    const idx = allGoals.findIndex(g => g._id === id)
    if (idx !== -1) allGoals[idx] = res.data
    renderGoalsGrid()
  } catch (err) {
    alert('Failed to update progress: ' + err.message)
  }
}

async function deleteGoal(id) {
  try {
    await api.goals.delete(id)
    allGoals = allGoals.filter(g => g._id !== id)
    renderGoalsGrid()
  } catch (err) {
    alert('Failed to delete goal: ' + err.message)
  }
}

init()
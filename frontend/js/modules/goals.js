import { api } from '../api/api.js'
import { getUser } from '../utils/helpers.js'

const root = document.getElementById('page-root')
const user = getUser()
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
  const firstName = user.name ? user.name.split(' ')[0] : 'there'
  const active = allGoals.filter(g => g.status === 'active').length
  const completed = allGoals.filter(g => g.status === 'completed').length
  const avgProgress = allGoals.length > 0
    ? Math.round(allGoals.reduce((sum, g) => sum + g.progress, 0) / allGoals.length)
    : 0

  root.innerHTML = `
    <div class="max-w-6xl mx-auto">

      <!-- Welcome Hero — indigo/purple tones -->
      <div class="rounded-xl p-8 text-white relative overflow-hidden mb-8"
           style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)">
        <div class="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24"></div>
        <div class="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p class="text-white/70 font-bold uppercase tracking-widest text-xs mb-2">Long-term Vision</p>
            <h2 class="text-3xl font-extrabold font-headline tracking-tight mb-2">
              ${allGoals.length === 0
                ? 'What do you want to achieve, ' + firstName + '?'
                : completed > 0
                  ? firstName + ', you have completed ' + completed + ' goal' + (completed !== 1 ? 's' : '') + '!'
                  : 'Keep your eyes on the prize, ' + firstName + '!'}
            </h2>
            <p class="text-white/70 text-sm">
              ${allGoals.length === 0
                ? 'Goals turn your vision into reality. Define what matters and track your progress.'
                : active + ' active goal' + (active !== 1 ? 's' : '') + ' — ' + avgProgress + '% average progress'}
            </p>
          </div>
          <button id="open-goal-modal"
                  class="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 transition-all shrink-0">
            <span class="material-symbols-outlined text-sm">add</span>
            New Goal
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-8">
        <div class="bg-surface-container-lowest p-5 rounded-xl text-center ring-1 ring-outline-variant/5">
          <p class="text-2xl font-black font-headline" style="color:#4f46e5">${active}</p>
          <p class="text-xs text-on-surface-variant uppercase font-bold mt-1">Active</p>
        </div>
        <div class="bg-surface-container-lowest p-5 rounded-xl text-center ring-1 ring-outline-variant/5">
          <p class="text-2xl font-black font-headline text-tertiary">${completed}</p>
          <p class="text-xs text-on-surface-variant uppercase font-bold mt-1">Completed</p>
        </div>
        <div class="bg-surface-container-lowest p-5 rounded-xl text-center ring-1 ring-outline-variant/5">
          <p class="text-2xl font-black font-headline text-on-surface">${avgProgress}%</p>
          <p class="text-xs text-on-surface-variant uppercase font-bold mt-1">Avg Progress</p>
        </div>
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
            <label class="form-label">Target Value (optional)</label>
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
            <label class="form-label">Initial Progress (%)</label>
            <input class="form-input" id="goal-progress" type="number" min="0" max="100" value="0">
          </div>
          <button id="save-goal-btn"
                  class="w-full text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                  style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)">
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
      + '<div class="w-24 h-24 rounded-full flex items-center justify-center" style="background:rgba(79,70,229,0.1)">'
      + '<span class="material-symbols-outlined text-5xl" style="color:#4f46e5">emoji_events</span></div>'
      + '<h3 class="text-xl font-bold text-on-surface">No goals yet</h3>'
      + '<p class="text-on-surface-variant text-sm max-w-sm">A goal without a plan is just a wish. Define yours and make it happen.</p>'
      + '<button id="empty-new-goal" class="text-white px-8 py-3 rounded-full font-bold text-sm hover:opacity-90 transition-all" style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)">Create First Goal</button>'
      + '</div>'
    document.getElementById('empty-new-goal')?.addEventListener('click', openModal)
    return
  }

  // Card background colors — indigo/purple tones that blend with white
  const cardStyles = [
    { bg: 'background:linear-gradient(135deg,rgba(79,70,229,0.08) 0%,rgba(124,58,237,0.05) 100%)', accent: '#4f46e5' },
    { bg: 'background:linear-gradient(135deg,rgba(16,185,129,0.08) 0%,rgba(5,150,105,0.05) 100%)', accent: '#059669' },
    { bg: 'background:linear-gradient(135deg,rgba(245,158,11,0.08) 0%,rgba(217,119,6,0.05) 100%)', accent: '#d97706' },
    { bg: 'background:linear-gradient(135deg,rgba(239,68,68,0.08) 0%,rgba(220,38,38,0.05) 100%)',  accent: '#dc2626' },
    { bg: 'background:linear-gradient(135deg,rgba(14,165,233,0.08) 0%,rgba(2,132,199,0.05) 100%)', accent: '#0284c7' },
    { bg: 'background:linear-gradient(135deg,rgba(168,85,247,0.08) 0%,rgba(147,51,234,0.05) 100%)',accent: '#9333ea' },
  ]

  let html = '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">'

  allGoals.forEach((goal, i) => {
    const style = cardStyles[i % cardStyles.length]
    const isCompleted = goal.status === 'completed'
    const isPaused = goal.status === 'paused'

    const statusBadge = isCompleted
      ? '<span class="text-[10px] px-2 py-0.5 font-bold rounded-full bg-tertiary-container/30 text-tertiary">Completed</span>'
      : isPaused
        ? '<span class="text-[10px] px-2 py-0.5 font-bold rounded-full bg-amber-100 text-amber-700">Paused</span>'
        : '<span class="text-[10px] px-2 py-0.5 font-bold rounded-full text-white" style="background:' + style.accent + '">Active</span>'

    const deadline = goal.deadline
      ? '<div class="flex items-center gap-1 text-xs text-on-surface-variant mt-1">'
        + '<span class="material-symbols-outlined text-xs">calendar_today</span>'
        + new Date(goal.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        + '</div>'
      : ''

    let milestonesHTML = ''
    if (goal.milestones && goal.milestones.length > 0) {
      milestonesHTML = '<div class="mt-4 space-y-2">'
        + '<p class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Milestones</p>'
      goal.milestones.slice(0, 3).forEach(m => {
        milestonesHTML += '<div class="flex items-center gap-2">'
          + '<span class="material-symbols-outlined text-sm" style="font-variation-settings:\'FILL\' ' + (m.completed ? '1' : '0') + ';color:' + (m.completed ? style.accent : '#767c7e') + '">'
          + (m.completed ? 'check_circle' : 'radio_button_unchecked') + '</span>'
          + '<span class="text-xs text-on-surface ' + (m.completed ? 'line-through opacity-50' : '') + '">' + m.text + '</span>'
          + '</div>'
      })
      if (goal.milestones.length > 3) {
        milestonesHTML += '<p class="text-xs text-on-surface-variant">+' + (goal.milestones.length - 3) + ' more</p>'
      }
      milestonesHTML += '</div>'
    }

    let savingsHTML = ''
    if (goal.targetAmount) {
      const pct = Math.min(100, Math.round(((goal.savedAmount || 0) / goal.targetAmount) * 100))
      savingsHTML = '<div class="flex items-center gap-3 mt-3 p-3 rounded-xl" style="background:rgba(255,255,255,0.6)">'
        + '<div><p class="text-[10px] font-bold uppercase" style="color:' + style.accent + '">Saved</p>'
        + '<p class="text-lg font-black text-on-surface">GHS ' + (goal.savedAmount || 0).toFixed(2) + '</p></div>'
        + '<span class="text-on-surface-variant">/</span>'
        + '<div><p class="text-[10px] font-bold text-on-surface-variant uppercase">Target</p>'
        + '<p class="text-lg font-black text-on-surface">GHS ' + Number(goal.targetAmount).toFixed(2) + '</p></div>'
        + '<div class="ml-auto text-right"><p class="text-xl font-black" style="color:' + style.accent + '">' + pct + '%</p></div>'
        + '</div>'
    }

    html += '<div class="rounded-xl p-6 relative overflow-hidden group" style="' + style.bg + ';border:1px solid rgba(0,0,0,0.04)">'
      + '<div class="flex items-start justify-between mb-4">'
      + '<div class="flex-1">'
      + statusBadge
      + '<h3 class="text-lg font-bold text-on-surface mt-2">' + goal.title + '</h3>'
      + (goal.description ? '<p class="text-xs text-on-surface-variant mt-1">' + goal.description + '</p>' : '')
      + deadline
      + '</div>'
      + '<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">'
      + '<button class="edit-goal-btn p-1.5 rounded-lg hover:bg-white/60 text-on-surface-variant hover:text-on-surface transition-all" data-id="' + goal._id + '">'
      + '<span class="material-symbols-outlined text-sm">edit</span></button>'
      + '<button class="delete-goal-btn p-1.5 rounded-lg hover:bg-error-container/20 text-on-surface-variant hover:text-error transition-all" data-id="' + goal._id + '">'
      + '<span class="material-symbols-outlined text-sm">delete</span></button>'
      + '</div>'
      + '</div>'

      + '<div class="mb-3">'
      + '<div class="flex justify-between items-center mb-1.5">'
      + '<span class="text-xs font-bold text-on-surface-variant">Progress</span>'
      + '<span class="text-xs font-black" style="color:' + style.accent + '">' + goal.progress + '%</span>'
      + '</div>'
      + '<div class="w-full h-2 rounded-full" style="background:rgba(0,0,0,0.08)">'
      + '<div class="h-2 rounded-full transition-all" style="width:' + goal.progress + '%;background:' + style.accent + '"></div>'
      + '</div>'
      + '</div>'

      + savingsHTML
      + milestonesHTML

      + '<div class="mt-4 flex items-center gap-2">'
      + '<span class="text-[10px] text-on-surface-variant font-bold">Update</span>'
      + '<input type="range" min="0" max="100" value="' + goal.progress + '" class="flex-1 progress-slider" data-id="' + goal._id + '" style="accent-color:' + style.accent + '">'
      + '</div>'
      + '</div>'
  })

  // Add new goal card
  html += '<div id="add-goal-card" class="rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all group" style="border:2px dashed #adb3b5">'
    + '<div class="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center transition-all group-hover:bg-opacity-80" style="">'
    + '<span class="material-symbols-outlined text-3xl text-on-surface-variant group-hover:text-on-surface">add</span></div>'
    + '<h3 class="text-base font-bold text-on-surface">New Goal</h3>'
    + '<p class="text-xs text-on-surface-variant">Define your next milestone</p>'
    + '</div>'

  html += '</div>'
  grid.innerHTML = html

  document.querySelectorAll('.progress-slider').forEach(slider => {
    slider.addEventListener('change', async (e) => {
      await updateGoalProgress(e.target.dataset.id, parseInt(e.target.value))
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
      const goal = allGoals.find(g => g._id === editBtn.dataset.id)
      if (goal) openEditModal(goal)
    }
    if (deleteBtn && confirm('Delete this goal?')) {
      await deleteGoal(deleteBtn.dataset.id)
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

  if (!title) { errorBox.textContent = 'Goal title is required'; errorBox.classList.remove('hidden'); return }

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
    renderPage()
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
    alert('Failed: ' + err.message)
  }
}

async function deleteGoal(id) {
  try {
    await api.goals.delete(id)
    allGoals = allGoals.filter(g => g._id !== id)
    renderPage()
  } catch (err) {
    alert('Failed: ' + err.message)
  }
}

init()
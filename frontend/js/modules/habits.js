import { api } from '../api/api.js'

const root = document.getElementById('page-root')
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
  root.innerHTML = `
    <div class="max-w-5xl mx-auto">

      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <p class="text-primary font-bold uppercase tracking-widest text-xs mb-2">Consistency</p>
          <h2 class="text-4xl font-extrabold font-headline text-on-surface tracking-tight">Daily Habits</h2>
          <p class="text-on-surface-variant text-sm mt-1">Consistency is the bridge between goals and accomplishment.</p>
        </div>
        <button id="open-habit-modal"
                class="vault-gradient text-on-primary px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all w-fit">
          <span class="material-symbols-outlined text-sm">add</span>
          New Habit
        </button>
      </div>

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
    list.innerHTML = '<div class="flex flex-col items-center justify-center py-20 gap-4 text-center">'
      + '<div class="w-24 h-24 rounded-full bg-secondary-container flex items-center justify-center">'
      + '<span class="material-symbols-outlined text-secondary text-5xl">repeat</span></div>'
      + '<h3 class="text-xl font-bold text-on-surface">No habits yet</h3>'
      + '<p class="text-on-surface-variant text-sm max-w-sm">Build habits that stick. Start with one small consistent action.</p>'
      + '<button id="empty-new-habit" class="vault-gradient text-on-primary px-8 py-3 rounded-full font-bold text-sm">Start First Habit</button>'
      + '</div>'

    document.getElementById('empty-new-habit')?.addEventListener('click', openModal)
    return
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let html = '<div class="space-y-4">'

  allHabits.forEach(habit => {
    const lastCompleted = habit.lastCompletedDates ? new Date(habit.lastCompletedDates) : null
    if (lastCompleted) lastCompleted.setHours(0, 0, 0, 0)
    const completedToday = lastCompleted && lastCompleted.getTime() === today.getTime()

    const streakColor = habit.currentstreak >= 30
      ? 'text-error'
      : habit.currentstreak >= 14
        ? 'text-primary'
        : 'text-tertiary'

    html += '<div class="bg-surface-container-lowest p-6 rounded-xl flex items-center justify-between group hover:bg-surface-container-low transition-all">'
      + '<div class="flex items-center gap-5">'
      + '<div class="w-14 h-14 rounded-full bg-tertiary-container/30 flex items-center justify-center text-2xl shrink-0">'
      + (habit.icon || '✅')
      + '</div>'
      + '<div>'
      + '<h4 class="font-bold text-lg text-on-surface">' + habit.name + '</h4>'
      + '<div class="flex items-center gap-3 mt-1">'
      + '<span class="flex items-center gap-1 font-bold text-sm ' + streakColor + '">'
      + '<span class="material-symbols-outlined text-sm" style="font-variation-settings:\'FILL\' 1">local_fire_department</span>'
      + habit.currentstreak + ' day streak'
      + '</span>'
      + (habit.target ? '<span class="text-on-surface-variant text-xs">• ' + habit.target + '</span>' : '')
      + '<span class="text-on-surface-variant text-xs">• ' + habit.frequency + '</span>'
      + '</div>'
      + '<div class="flex items-center gap-2 mt-1">'
      + '<span class="text-[10px] text-on-surface-variant">Best: ' + habit.higheststreak + ' days</span>'
      + '</div>'
      + '</div>'
      + '</div>'
      + '<div class="flex items-center gap-3">'
      + '<button class="delete-habit-btn opacity-0 group-hover:opacity-100 text-error transition-opacity" data-id="' + habit._id + '">'
      + '<span class="material-symbols-outlined text-sm">delete</span>'
      + '</button>'
      + '<button class="complete-habit-btn px-5 py-2.5 rounded-full font-bold text-sm transition-all '
      + (completedToday
        ? 'bg-surface-container text-on-surface-variant cursor-default'
        : 'vault-gradient text-on-primary hover:opacity-90 active:scale-95')
      + '" data-id="' + habit._id + '" ' + (completedToday ? 'disabled' : '') + '>'
      + (completedToday ? 'Completed' : 'Mark done')
      + '</button>'
      + '</div>'
      + '</div>'
  })

  html += '</div>'
  list.innerHTML = html
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
      const id = completeBtn.dataset.id
      await completeHabit(id)
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.id
      if (confirm('Delete this habit?')) await deleteHabit(id)
    }
  })
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
  document.getElementById('habit-form-error')?.classList.add('hidden')
  document.getElementById('save-habit-btn').textContent = 'Create Habit'
  document.getElementById('save-habit-btn').disabled = false
}

async function saveHabit() {
  const name = document.getElementById('habit-name')?.value.trim()
  const target = document.getElementById('habit-target')?.value.trim()
  const frequency = document.getElementById('habit-frequency')?.value
  const icon = document.getElementById('habit-icon')?.value.trim()
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
    closeModal()
    renderHabitsList()
  } catch (err) {
    errorBox.textContent = err.message
    errorBox.classList.remove('hidden')
    btn.textContent = 'Create Habit'
    btn.disabled = false
  }
}

async function completeHabit(id) {
  try {
    const res = await api.habits.complete(id)
    const idx = allHabits.findIndex(h => h._id === id)
    if (idx !== -1) allHabits[idx] = res.data
    renderHabitsList()
  } catch (err) {
    alert('Failed to complete habit: ' + err.message)
  }
}

async function deleteHabit(id) {
  try {
    await api.habits.delete(id)
    allHabits = allHabits.filter(h => h._id !== id)
    renderHabitsList()
  } catch (err) {
    alert('Failed to delete habit: ' + err.message)
  }
}

init()
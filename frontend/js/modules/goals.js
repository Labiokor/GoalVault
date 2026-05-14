import { api } from '../api/api.js'
import { getUser } from '../utils/helpers.js'

const root = document.getElementById('page-root')
const user = getUser()

// ── State ─────────────────────────────────────────────────────
let allGoals       = []
let currentTab     = 'all'
let shortPriority  = 'low'
let longPriority   = 'low'
let shortFreq      = 'daily'
let longFreq       = 'daily'
let updateTargetId = null

// ── Card accent colours (cycles per goal index) ───────────────
const CARD_STYLES = [
  { bg: 'background:linear-gradient(135deg,rgba(79,70,229,0.08) 0%,rgba(124,58,237,0.05) 100%)',  accent: '#4f46e5' },
  { bg: 'background:linear-gradient(135deg,rgba(16,185,129,0.08) 0%,rgba(5,150,105,0.05) 100%)',  accent: '#059669' },
  { bg: 'background:linear-gradient(135deg,rgba(245,158,11,0.08) 0%,rgba(217,119,6,0.05) 100%)',  accent: '#d97706' },
  { bg: 'background:linear-gradient(135deg,rgba(239,68,68,0.08) 0%,rgba(220,38,38,0.05) 100%)',   accent: '#dc2626' },
  { bg: 'background:linear-gradient(135deg,rgba(14,165,233,0.08) 0%,rgba(2,132,199,0.05) 100%)',  accent: '#0284c7' },
  { bg: 'background:linear-gradient(135deg,rgba(168,85,247,0.08) 0%,rgba(147,51,234,0.05) 100%)', accent: '#9333ea' },
]

// ── Priority config ───────────────────────────────────────────
const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#6b7280' }

// ── Bootstrap ─────────────────────────────────────────────────
async function init() {
  root.innerHTML = `
    <div class="flex items-center justify-center py-12 text-on-surface-variant gap-2">
      <span class="material-symbols-outlined">progress_activity</span>
      <span class="text-sm">Loading goals…</span>
    </div>`
  try {
    const res = await api.goals.getAll()
    allGoals  = res.data || []
    renderPage()
  } catch (err) {
    root.innerHTML = `<p class="text-error text-sm p-8">${err.message}</p>`
  }
}

// ── Derived stats ─────────────────────────────────────────────
function getStats() {
  const active    = allGoals.filter(g => g.status === 'active').length
  const completed = allGoals.filter(g => g.status === 'completed').length
  const avg       = allGoals.length
    ? Math.round(allGoals.reduce((s, g) => s + (g.progress || 0), 0) / allGoals.length)
    : 0
  return { active, completed, avg }
}

// ══════════════════════════════════════════════════════════════
// RENDER PAGE
// ══════════════════════════════════════════════════════════════
function renderPage() {
  const firstName = user.name ? user.name.split(' ')[0] : 'there'
  const { active, completed, avg } = getStats()

  root.innerHTML = `
    <div class="max-w-6xl mx-auto">

      <!-- ── Hero Banner (from goals.js, preserved) ── -->
      <div class="rounded-xl p-8 text-white relative overflow-hidden mb-8"
           style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)">
        <div class="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24"></div>
        <div class="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p class="text-white/70 font-bold uppercase tracking-widest text-xs mb-2">Long-term Vision</p>
            <h2 class="text-3xl font-extrabold tracking-tight mb-2" id="hero-title">
              ${allGoals.length === 0
                ? `What do you want to achieve, ${firstName}?`
                : completed > 0
                  ? `${firstName}, you've completed ${completed} goal${completed !== 1 ? 's' : ''}!`
                  : `Keep your eyes on the prize, ${firstName}!`}
            </h2>
            <p class="text-white/70 text-sm" id="hero-sub">
              ${allGoals.length === 0
                ? 'Goals turn your vision into reality. Define what matters and track your progress.'
                : `${active} active goal${active !== 1 ? 's' : ''} — ${avg}% average progress`}
            </p>
          </div>
          <button id="open-goal-modal"
                  class="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-full font-bold text-sm
                         flex items-center gap-2 transition-all shrink-0">
            <span class="material-symbols-outlined text-sm">add</span>
            New Goal
          </button>
        </div>
      </div>

      <!-- ── Stats row ── -->
      <div class="grid grid-cols-3 gap-4 mb-8">
        <div class="bg-surface-container-lowest p-5 rounded-xl text-center ring-1 ring-outline-variant/5">
          <p class="text-2xl font-black" style="color:#4f46e5">${active}</p>
          <p class="text-xs text-on-surface-variant uppercase font-bold mt-1">Active</p>
        </div>
        <div class="bg-surface-container-lowest p-5 rounded-xl text-center ring-1 ring-outline-variant/5">
          <p class="text-2xl font-black text-tertiary">${completed}</p>
          <p class="text-xs text-on-surface-variant uppercase font-bold mt-1">Completed</p>
        </div>
        <div class="bg-surface-container-lowest p-5 rounded-xl text-center ring-1 ring-outline-variant/5">
          <p class="text-2xl font-black text-on-surface">${avg}%</p>
          <p class="text-xs text-on-surface-variant uppercase font-bold mt-1">Avg Progress</p>
        </div>
      </div>

      <!-- ── Tabs (planner-style) ── -->
      <div class="flex gap-2 mb-6">
        ${['all','short','long','completed'].map(tab => `
          <button class="tab-btn px-4 py-2 rounded-full text-sm font-bold transition-all
            ${currentTab === tab
              ? 'text-white'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
            style="${currentTab === tab ? 'background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)' : ''}"
            data-tab="${tab}">
            ${tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>`).join('')}
      </div>

      <!-- ── Goals grid ── -->
      <div id="goals-grid"></div>

    </div>

    <!-- ══════════════════════════════════════
         GOAL TYPE PICKER MODAL
    ══════════════════════════════════════ -->
    <div id="goal-type-overlay"
         class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center hidden">
      <div class="bg-surface-container-lowest rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold">New Goal</h3>
          <button id="close-type-modal" class="text-on-surface-variant hover:text-on-surface">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <p class="text-sm text-on-surface-variant mb-6">What kind of goal are you setting?</p>
        <div class="grid grid-cols-2 gap-4">
          <button id="pick-short"
                  class="p-6 rounded-xl text-left transition-all hover:ring-2 ring-indigo-400"
                  style="background:rgba(79,70,229,0.07)">
            <div class="text-3xl mb-3">⚡</div>
            <div class="font-bold text-on-surface mb-1">Short-Term</div>
            <div class="text-xs text-on-surface-variant">A weekly goal — assign it to a day with priority.</div>
          </button>
          <button id="pick-long"
                  class="p-6 rounded-xl text-left transition-all hover:ring-2 ring-violet-400"
                  style="background:rgba(124,58,237,0.07)">
            <div class="text-3xl mb-3">🎯</div>
            <div class="font-bold text-on-surface mb-1">Long-Term</div>
            <div class="text-xs text-on-surface-variant">A bigger goal with a target, deadline and progress.</div>
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════
         SHORT-TERM GOAL MODAL
    ══════════════════════════════════════ -->
    <div id="short-term-overlay"
         class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center hidden">
      <div class="bg-surface-container-lowest rounded-2xl w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center gap-3 p-6 border-b border-surface-container-high">
          <button id="back-to-type-short" class="text-on-surface-variant hover:text-on-surface">
            <span class="material-symbols-outlined text-sm">arrow_back</span>
          </button>
          <h3 class="text-lg font-bold flex-1">Short-Term Goal ⚡</h3>
          <button id="close-short-modal" class="text-on-surface-variant hover:text-on-surface">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="p-6 space-y-5">
          <div>
            <label class="form-label">Goal</label>
            <input id="short-goal-text" class="form-input" type="text"
                   placeholder="What do you want to achieve?" autocomplete="off">
            <p class="text-error text-xs mt-1 hidden" id="short-goal-error">Please enter a goal.</p>
          </div>
          <div>
            <label class="form-label">Description (optional)</label>
            <textarea id="short-goal-desc" class="form-input resize-none" rows="2"
                      placeholder="Add more context…"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Day</label>
              <select id="short-goal-day" class="form-input">
                <option value="">Any day</option>
                ${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d =>
                  `<option value="${d.slice(0,3)}">${d}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label">Priority</label>
              ${priorityPickerHTML('short-priority-picker','low')}
            </div>
          </div>
          ${reminderToggleHTML('short')}
          ${reminderOptionsHTML('short')}
        </div>
        <div class="p-6 pt-0">
          <button id="create-short-goal-btn"
                  class="w-full text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)">
            <span class="material-symbols-outlined text-sm">add</span> Add Goal
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════
         LONG-TERM GOAL MODAL
    ══════════════════════════════════════ -->
    <div id="long-term-overlay"
         class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center hidden">
      <div class="bg-surface-container-lowest rounded-2xl w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center gap-3 p-6 border-b border-surface-container-high">
          <button id="back-to-type-long" class="text-on-surface-variant hover:text-on-surface">
            <span class="material-symbols-outlined text-sm">arrow_back</span>
          </button>
          <h3 class="text-lg font-bold flex-1">Long-Term Goal 🎯</h3>
          <button id="close-long-modal" class="text-on-surface-variant hover:text-on-surface">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="p-6 space-y-5">
          <div>
            <label class="form-label">Goal Title</label>
            <input id="long-goal-title" class="form-input" type="text"
                   placeholder="What do you want to achieve?" autocomplete="off">
            <p class="text-error text-xs mt-1 hidden" id="long-goal-error">Please enter a goal title.</p>
          </div>
          <div>
            <label class="form-label">Description (optional)</label>
            <textarea id="long-goal-desc" class="form-input resize-none" rows="2"
                      placeholder="Describe your goal…"></textarea>
          </div>
          <div>
            <label class="form-label">Priority</label>
            ${priorityPickerHTML('long-priority-picker','low')}
          </div>
          <div>
            <label class="form-label">Target Value (optional)</label>
            <input id="long-goal-target" class="form-input" type="text"
                   placeholder="e.g. Save 5000 GHS, Run 100km">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Target Amount (optional)</label>
              <input id="long-goal-amount" class="form-input" type="number" placeholder="0.00" min="0" step="0.01">
            </div>
            <div>
              <label class="form-label">Deadline (optional)</label>
              <input id="long-goal-deadline" class="form-input" type="date">
            </div>
          </div>
          <div>
            <label class="form-label">Initial Progress (%)</label>
            <input id="long-goal-init-progress" class="form-input" type="number" min="0" max="100" value="0"
                   placeholder="0">
          </div>
          ${reminderToggleHTML('long')}
          ${reminderOptionsHTML('long')}
        </div>
        <div class="p-6 pt-0">
          <button id="create-long-goal-btn"
                  class="w-full text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)">
            <span class="material-symbols-outlined text-sm">add</span> Create Goal
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════
         UPDATE PROGRESS MODAL
    ══════════════════════════════════════ -->
    <div id="update-progress-overlay"
         class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center hidden">
      <div class="bg-surface-container-lowest rounded-2xl w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between p-6 border-b border-surface-container-high">
          <h3 class="text-lg font-bold">Update Progress</h3>
          <button id="close-update-modal" class="text-on-surface-variant hover:text-on-surface">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="p-6 space-y-5">
          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Goal</p>
            <p class="font-bold text-on-surface" id="update-goal-name">—</p>
          </div>

          <!-- Current + new progress bar (from goals.js, preserved) -->
          <div>
            <div class="w-full h-2.5 rounded-full bg-surface-container-high overflow-hidden mb-2">
              <div id="update-current-fill"
                   class="h-2.5 rounded-full transition-all"
                   style="width:0%;background:linear-gradient(90deg,#4f46e5,#7c3aed)"></div>
            </div>
            <div class="flex justify-between text-xs text-on-surface-variant">
              <span>Current: <strong id="update-current-pct">0%</strong></span>
              <span>New: <strong id="update-new-pct">0%</strong></span>
            </div>
          </div>

          <!-- Slider (preserved from goals.js) -->
          <div>
            <label class="form-label">
              New Progress (%) — <span id="update-progress-val">0</span>%
              <span id="update-locked-note" class="hidden text-on-surface-variant normal-case font-normal ml-1">
                🔒 min <span id="update-min-note">0</span>%
              </span>
            </label>
            <input id="update-progress-slider" type="range" min="0" max="100" value="0"
                   class="w-full accent-indigo-600">
          </div>

          <!-- Note -->
          <div>
            <label class="form-label">What did you do today? ✍️</label>
            <textarea id="update-progress-note" class="form-input resize-none" rows="3"
                      placeholder="e.g. Finished chapter 3, ran 5km, saved $200…"></textarea>
            <p class="text-error text-xs mt-1 hidden" id="update-note-error">
              Please describe what you did today.
            </p>
          </div>

          <!-- Progress log -->
          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
              <span class="material-symbols-outlined text-sm">history</span> Progress History
            </p>
            <div id="progress-log-list" class="space-y-3 max-h-56 overflow-y-auto"></div>
          </div>
        </div>
        <div class="p-6 pt-0">
          <button id="save-progress-btn"
                  class="w-full text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)">
            <span class="material-symbols-outlined text-sm">save</span> Save Progress
          </button>
        </div>
      </div>
    </div>`

  renderGoalsGrid()
  attachEvents()
}

// ── HTML helpers ──────────────────────────────────────────────
function priorityPickerHTML(id, defaultVal) {
  return `
    <div class="flex gap-2" id="${id}">
      ${['high','medium','low'].map(p => `
        <button class="priority-opt flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-all
          ${p === defaultVal ? 'text-white border-transparent' : 'bg-transparent border-surface-container-high text-on-surface-variant'}"
          style="${p === defaultVal ? `background:${PRIORITY_COLORS[p]}` : ''}"
          data-priority="${p}">
          ${p.charAt(0).toUpperCase() + p.slice(1)}
        </button>`).join('')}
    </div>`
}

function reminderToggleHTML(prefix) {
  return `
    <div class="flex items-center justify-between p-4 rounded-xl bg-surface-container">
      <div class="flex items-center gap-3">
        <span class="text-xl">🔔</span>
        <div>
          <p class="text-sm font-bold text-on-surface">Add to Reminders</p>
          <p class="text-xs text-on-surface-variant">Get notified about this goal</p>
        </div>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" id="${prefix}-reminder-toggle" class="sr-only peer">
        <div class="w-11 h-6 bg-surface-container-high peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer
                    peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-0.5
                    after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                    peer-checked:bg-indigo-600"></div>
      </label>
    </div>`
}

function reminderOptionsHTML(prefix) {
  return `
    <div id="${prefix}-reminder-options" class="hidden space-y-4 p-4 rounded-xl bg-surface-container">
      <div>
        <label class="form-label">Frequency</label>
        <div class="flex gap-2" id="${prefix}-freq-picker">
          ${['daily','weekly','monthly'].map((f, i) => `
            <button class="flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-all
              ${i === 0 ? 'text-white border-transparent' : 'border-surface-container-high text-on-surface-variant'}"
              style="${i === 0 ? 'background:#4f46e5' : ''}"
              data-freq="${f}">
              ${f.charAt(0).toUpperCase() + f.slice(1)}
            </button>`).join('')}
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="form-label">Date</label>
          <input type="date" id="${prefix}-reminder-date" class="form-input">
        </div>
        <div>
          <label class="form-label">Time</label>
          <input type="time" id="${prefix}-reminder-time" class="form-input">
        </div>
      </div>
      <div id="${prefix}-reminder-preview"
           class="hidden p-3 rounded-lg text-xs font-medium flex items-center gap-2"
           style="background:rgba(79,70,229,0.08);color:#4f46e5;border:1px solid rgba(79,70,229,0.2)">
        <span class="material-symbols-outlined text-sm">notifications_active</span>
        <span id="${prefix}-reminder-preview-text"></span>
      </div>
    </div>`
}

// ── Goals grid render ─────────────────────────────────────────
function renderGoalsGrid() {
  const grid = document.getElementById('goals-grid')
  if (!grid) return

  let goals = [...allGoals]

  // filter by tab
  if (currentTab === 'short')     goals = goals.filter(g => g.type === 'short')
  if (currentTab === 'long')      goals = goals.filter(g => g.type === 'long')
  if (currentTab === 'completed') goals = goals.filter(g => g.status === 'completed')
  if (currentTab === 'all')       goals = goals.filter(g => g.status !== 'completed')

  if (goals.length === 0) {
    grid.innerHTML = `
      <div class="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div class="w-24 h-24 rounded-full flex items-center justify-center"
             style="background:rgba(79,70,229,0.08)">
          <span class="material-symbols-outlined text-5xl" style="color:#4f46e5">emoji_events</span>
        </div>
        <h3 class="text-xl font-bold text-on-surface">
          ${currentTab === 'completed' ? 'No completed goals yet' : 'No goals here yet'}
        </h3>
        <p class="text-on-surface-variant text-sm max-w-sm">
          ${currentTab === 'completed'
            ? 'Complete your active goals and they will show up here.'
            : 'A goal without a plan is just a wish. Define yours and make it happen.'}
        </p>
        ${currentTab !== 'completed'
          ? `<button id="empty-new-goal"
                     class="text-white px-8 py-3 rounded-full font-bold text-sm hover:opacity-90 transition-all"
                     style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)">
               Create First Goal
             </button>`
          : ''}
      </div>`
    document.getElementById('empty-new-goal')?.addEventListener('click', openTypeModal)
    return
  }

  // Group short-term by day if viewing short/all
  const DAY_ORDER = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const todayShort = DAY_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]

  let html = '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">'

  goals.forEach((goal, i) => {
    const style       = CARD_STYLES[i % CARD_STYLES.length]
    const isCompleted = goal.status === 'completed'
    const isPaused    = goal.status === 'paused'
    const pct         = Math.min(100, Math.max(0, goal.progress || 0))
    const isLong      = goal.type === 'long'
    const logCount    = (goal.progressLog || []).length

    // deadline badge
    let deadlineHTML = ''
    if (goal.deadline) {
      const dObj = new Date(goal.deadline)
      const now  = new Date(); now.setHours(0,0,0,0)
      const diff = Math.round((dObj - now) / 86400000)
      const fmt  = dObj.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
      const dColor = diff < 0 ? '#ef4444' : diff === 0 ? '#f59e0b' : style.accent
      const dLabel = diff < 0 ? `${fmt} · Overdue` : diff === 0 ? 'Due today!' : fmt
      deadlineHTML = `
        <div class="flex items-center gap-1 text-xs mt-1" style="color:${dColor}">
          <span class="material-symbols-outlined text-xs">calendar_today</span>${dLabel}
        </div>`
    }

    // status badge
    const statusBadge = isCompleted
      ? `<span class="text-[10px] px-2 py-0.5 font-bold rounded-full bg-tertiary-container/30 text-tertiary">Completed</span>`
      : isPaused
        ? `<span class="text-[10px] px-2 py-0.5 font-bold rounded-full bg-amber-100 text-amber-700">Paused</span>`
        : `<span class="text-[10px] px-2 py-0.5 font-bold rounded-full text-white" style="background:${style.accent}">Active</span>`

    // savings block
    let savingsHTML = ''
    if (goal.targetAmount) {
      const sPct = Math.min(100, Math.round(((goal.savedAmount || 0) / goal.targetAmount) * 100))
      savingsHTML = `
        <div class="flex items-center gap-3 mt-3 p-3 rounded-xl" style="background:rgba(255,255,255,0.6)">
          <div>
            <p class="text-[10px] font-bold uppercase" style="color:${style.accent}">Saved</p>
            <p class="text-lg font-black text-on-surface">GHS ${(goal.savedAmount || 0).toFixed(2)}</p>
          </div>
          <span class="text-on-surface-variant">/</span>
          <div>
            <p class="text-[10px] font-bold text-on-surface-variant uppercase">Target</p>
            <p class="text-lg font-black text-on-surface">GHS ${Number(goal.targetAmount).toFixed(2)}</p>
          </div>
          <div class="ml-auto text-right">
            <p class="text-xl font-black" style="color:${style.accent}">${sPct}%</p>
          </div>
        </div>`
    }

    // milestones
    let milestonesHTML = ''
    if (goal.milestones?.length) {
      milestonesHTML = '<div class="mt-4 space-y-2"><p class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Milestones</p>'
      goal.milestones.slice(0, 3).forEach(m => {
        milestonesHTML += `
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-sm"
                  style="font-variation-settings:'FILL' ${m.completed ? 1 : 0};color:${m.completed ? style.accent : '#767c7e'}">
              ${m.completed ? 'check_circle' : 'radio_button_unchecked'}
            </span>
            <span class="text-xs text-on-surface ${m.completed ? 'line-through opacity-50' : ''}">${m.text}</span>
          </div>`
      })
      if (goal.milestones.length > 3) milestonesHTML += `<p class="text-xs text-on-surface-variant">+${goal.milestones.length - 3} more</p>`
      milestonesHTML += '</div>'
    }

    // log count pill
    const logPill = isLong && logCount > 0
      ? `<span class="text-[10px] px-2 py-0.5 rounded-full font-bold" style="background:rgba(79,70,229,0.1);color:#4f46e5">
           ${logCount} update${logCount !== 1 ? 's' : ''}
         </span>`
      : ''

    html += `
      <div class="rounded-xl p-6 relative overflow-hidden group transition-all hover:shadow-md"
           style="${style.bg};border:1px solid rgba(0,0,0,0.04)">

        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            ${statusBadge}
            <h3 class="text-base font-bold text-on-surface mt-2">${goal.title}</h3>
            ${goal.description ? `<p class="text-xs text-on-surface-variant mt-1">${goal.description}</p>` : ''}
            ${deadlineHTML}
            <div class="flex flex-wrap gap-1.5 mt-2">
              ${goal.priority ? `<span class="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style="background:${PRIORITY_COLORS[goal.priority] || '#6b7280'}">${goal.priority.toUpperCase()}</span>` : ''}
              ${isLong ? `<span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-surface-container text-on-surface-variant">Long-Term</span>` : ''}
              ${goal.day ? `<span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-surface-container text-on-surface-variant">${goal.day}</span>` : ''}
              ${logPill}
            </div>
          </div>
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            ${isLong && !isCompleted
              ? `<button class="update-goal-btn p-1.5 rounded-lg hover:bg-white/60 text-on-surface-variant hover:text-indigo-600 transition-all" data-id="${goal._id}" title="Update progress">
                   <span class="material-symbols-outlined text-sm">tune</span>
                 </button>`
              : ''}
            <button class="delete-goal-btn p-1.5 rounded-lg hover:bg-error-container/20 text-on-surface-variant hover:text-error transition-all" data-id="${goal._id}" title="Delete">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </div>

        ${savingsHTML}
        ${milestonesHTML}

        <!-- Progress bar (preserved from goals.js) -->
        <div class="mb-3 mt-4">
          <div class="flex justify-between items-center mb-1.5">
            <span class="text-xs font-bold text-on-surface-variant">Progress</span>
            <span class="text-xs font-black" style="color:${style.accent}">${pct}%</span>
          </div>
          <div class="w-full h-2 rounded-full" style="background:rgba(0,0,0,0.08)">
            <div class="h-2 rounded-full transition-all" style="width:${pct}%;background:${style.accent}"></div>
          </div>
        </div>

        <!-- Progress slider (preserved from goals.js) -->
        ${!isCompleted ? `
        <div class="flex items-center gap-2 mt-2">
          <span class="text-[10px] text-on-surface-variant font-bold">Update</span>
          <input type="range" min="0" max="100" value="${pct}"
                 class="flex-1 progress-slider"
                 data-id="${goal._id}"
                 style="accent-color:${style.accent}">
        </div>` : ''}

      </div>`
  })

  // Add new goal card
  html += `
    <div id="add-goal-card"
         class="rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 cursor-pointer
                transition-all group hover:border-indigo-400 hover:shadow-md"
         style="border:2px dashed #adb3b5">
      <div class="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center
                  group-hover:bg-indigo-50 transition-all">
        <span class="material-symbols-outlined text-3xl text-on-surface-variant group-hover:text-indigo-600">add</span>
      </div>
      <h3 class="text-base font-bold text-on-surface">New Goal</h3>
      <p class="text-xs text-on-surface-variant">Define your next milestone</p>
    </div>`

  html += '</div>'
  grid.innerHTML = html

  // Slider change → API update (quick drag)
  document.querySelectorAll('.progress-slider').forEach(slider => {
    slider.addEventListener('change', async e => {
      await updateGoalProgress(e.target.dataset.id, parseInt(e.target.value))
    })
  })

  document.getElementById('add-goal-card')?.addEventListener('click', openTypeModal)
  document.querySelectorAll('.update-goal-btn').forEach(btn => {
    btn.addEventListener('click', () => openUpdateModal(btn.dataset.id))
  })
  document.querySelectorAll('.delete-goal-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Delete this goal?')) await deleteGoal(btn.dataset.id)
    })
  })
}

// ── Update hero ───────────────────────────────────────────────
function updateHero() {
  const firstName    = user.name ? user.name.split(' ')[0] : 'there'
  const { active, completed, avg } = getStats()
  const heroTitle    = document.getElementById('hero-title')
  const heroSub      = document.getElementById('hero-sub')
  if (heroTitle) {
    heroTitle.textContent = allGoals.length === 0
      ? `What do you want to achieve, ${firstName}?`
      : completed > 0
        ? `${firstName}, you've completed ${completed} goal${completed !== 1 ? 's' : ''}!`
        : `Keep your eyes on the prize, ${firstName}!`
  }
  if (heroSub) {
    heroSub.textContent = allGoals.length === 0
      ? 'Goals turn your vision into reality. Define what matters and track your progress.'
      : `${active} active goal${active !== 1 ? 's' : ''} — ${avg}% average progress`
  }
}

// ── Progress log render ───────────────────────────────────────
function renderProgressLog(log) {
  const el = document.getElementById('progress-log-list')
  if (!el) return
  if (!log?.length) {
    el.innerHTML = `<p class="text-xs text-on-surface-variant text-center py-4">No updates yet — be the first!</p>`
    return
  }
  el.innerHTML = log.map((entry, i) => {
    const gain = entry.pct - (entry.prev || 0)
    const d    = new Date(entry.date)
    const fmt  = d.toLocaleDateString('default', { weekday:'short', month:'short', day:'numeric' })
              + ' · ' + d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
    return `
      <div class="flex gap-3 items-start ${i === 0 ? 'opacity-100' : 'opacity-70'}">
        <div class="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white"
             style="background:linear-gradient(135deg,#4f46e5,#7c3aed)">${entry.pct}%</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-bold text-on-surface">${entry.pct}%</span>
            ${gain > 0 ? `<span class="text-xs font-bold text-tertiary">+${gain}%</span>` : ''}
            <span class="text-[10px] text-on-surface-variant">${fmt}</span>
          </div>
          <p class="text-xs text-on-surface-variant mt-0.5">${entry.note || '<em>No note added</em>'}</p>
        </div>
      </div>`
  }).join('')
}

// ── Open update modal ─────────────────────────────────────────
function openUpdateModal(id) {
  const goal = allGoals.find(g => g._id === id)
  if (!goal) return
  updateTargetId = id
  const cur = goal.progress || 0

  document.getElementById('update-goal-name').textContent    = goal.title
  const slider = document.getElementById('update-progress-slider')
  const valEl  = document.getElementById('update-progress-val')
  const newPct = document.getElementById('update-new-pct')
  const curPct = document.getElementById('update-current-pct')
  const fill   = document.getElementById('update-current-fill')
  const locked = document.getElementById('update-locked-note')
  const minEl  = document.getElementById('update-min-note')
  const noteEl = document.getElementById('update-progress-note')
  const noteErr= document.getElementById('update-note-error')

  if (slider) { slider.min = cur; slider.value = cur }
  if (valEl)  valEl.textContent  = cur
  if (newPct) newPct.textContent = cur + '%'
  if (curPct) curPct.textContent = cur + '%'
  if (fill)   fill.style.width   = cur + '%'
  if (noteEl) noteEl.value = ''
  if (noteErr) noteErr.classList.add('hidden')
  if (locked) { locked.classList.toggle('hidden', cur === 0); if (minEl) minEl.textContent = cur }

  renderProgressLog(goal.progressLog || [])
  openOverlay('update-progress-overlay')
}

// ── Modal helpers ─────────────────────────────────────────────
function openOverlay(id)  { document.getElementById(id)?.classList.remove('hidden'); document.body.style.overflow = 'hidden' }
function closeOverlay(id) { document.getElementById(id)?.classList.add('hidden');    document.body.style.overflow = '' }
function openTypeModal()  { openOverlay('goal-type-overlay') }

function closeAllModals() {
  ['goal-type-overlay','short-term-overlay','long-term-overlay','update-progress-overlay']
    .forEach(closeOverlay)
  document.body.style.overflow = ''
}

// ── Reminder preview ──────────────────────────────────────────
function updateReminderPreview(prefix) {
  const date    = document.getElementById(`${prefix}-reminder-date`)?.value
  const time    = document.getElementById(`${prefix}-reminder-time`)?.value
  const freq    = prefix === 'short' ? shortFreq : longFreq
  const preview = document.getElementById(`${prefix}-reminder-preview`)
  const textEl  = document.getElementById(`${prefix}-reminder-preview-text`)
  if (!preview || !textEl) return
  if (date && time) {
    const dt    = new Date(`${date}T${time}`)
    const fDate = dt.toLocaleDateString('default', { weekday:'short', month:'short', day:'numeric' })
    const fTime = dt.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
    const fFreq = { daily:'Every day', weekly:'Every week', monthly:'Every month' }[freq] || 'Once'
    textEl.textContent = `${fFreq} starting ${fDate} at ${fTime}`
    preview.classList.remove('hidden')
  } else {
    preview.classList.add('hidden')
  }
}

// ── Priority picker init ──────────────────────────────────────
function initPriorityPicker(id, onSelect) {
  document.getElementById(id)?.querySelectorAll('.priority-opt').forEach(btn => {
    btn.addEventListener('click', function () {
      document.getElementById(id)?.querySelectorAll('.priority-opt').forEach(b => {
        b.style.background = ''
        b.style.color      = ''
        b.classList.remove('text-white')
      })
      const p = this.dataset.priority
      this.style.background = PRIORITY_COLORS[p]
      this.style.color      = 'white'
      onSelect(p)
    })
  })
}

// ── Freq picker init ──────────────────────────────────────────
function initFreqPicker(id, onSelect) {
  document.getElementById(id)?.querySelectorAll('[data-freq]').forEach(btn => {
    btn.addEventListener('click', function () {
      document.getElementById(id)?.querySelectorAll('[data-freq]').forEach(b => {
        b.style.background = ''
        b.style.color      = ''
      })
      this.style.background = '#4f46e5'
      this.style.color      = 'white'
      onSelect(this.dataset.freq)
    })
  })
}

// ── Attach all events ─────────────────────────────────────────
function attachEvents() {
  // FAB / hero new-goal button
  document.getElementById('open-goal-modal')?.addEventListener('click', openTypeModal)
  document.getElementById('fab')?.addEventListener('click', openTypeModal)

  // Type modal
  document.getElementById('close-type-modal')?.addEventListener('click', () => closeOverlay('goal-type-overlay'))
  document.getElementById('goal-type-overlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeOverlay('goal-type-overlay') })
  document.getElementById('pick-short')?.addEventListener('click', () => { closeOverlay('goal-type-overlay'); openOverlay('short-term-overlay'); setTimeout(() => document.getElementById('short-goal-text')?.focus(), 100) })
  document.getElementById('pick-long')?.addEventListener('click',  () => { closeOverlay('goal-type-overlay'); openOverlay('long-term-overlay');  setTimeout(() => document.getElementById('long-goal-title')?.focus(), 100) })

  // Short modal
  document.getElementById('back-to-type-short')?.addEventListener('click', () => { closeOverlay('short-term-overlay'); openOverlay('goal-type-overlay') })
  document.getElementById('close-short-modal')?.addEventListener('click',  () => closeOverlay('short-term-overlay'))
  document.getElementById('short-term-overlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeOverlay('short-term-overlay') })

  // Long modal
  document.getElementById('back-to-type-long')?.addEventListener('click',  () => { closeOverlay('long-term-overlay'); openOverlay('goal-type-overlay') })
  document.getElementById('close-long-modal')?.addEventListener('click',   () => closeOverlay('long-term-overlay'))
  document.getElementById('long-term-overlay')?.addEventListener('click',  e => { if (e.target === e.currentTarget) closeOverlay('long-term-overlay') })

  // Update modal
  document.getElementById('close-update-modal')?.addEventListener('click', () => closeOverlay('update-progress-overlay'))
  document.getElementById('update-progress-overlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeOverlay('update-progress-overlay') })

  // Escape key
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllModals() })

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      currentTab = this.dataset.tab
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.style.background = ''
        b.classList.remove('text-white')
        b.classList.add('bg-surface-container','text-on-surface-variant')
      })
      this.style.background = 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)'
      this.classList.add('text-white')
      this.classList.remove('bg-surface-container','text-on-surface-variant')
      renderGoalsGrid()
    })
  })

  // Priority pickers
  initPriorityPicker('short-priority-picker', v => { shortPriority = v })
  initPriorityPicker('long-priority-picker',  v => { longPriority  = v })

  // Freq pickers
  initFreqPicker('short-freq-picker', v => { shortFreq = v; updateReminderPreview('short') })
  initFreqPicker('long-freq-picker',  v => { longFreq  = v; updateReminderPreview('long')  })

  // Reminder toggles
  document.getElementById('short-reminder-toggle')?.addEventListener('change', function () {
    const opts = document.getElementById('short-reminder-options')
    if (opts) opts.classList.toggle('hidden', !this.checked)
    if (this.checked) {
      const d = document.getElementById('short-reminder-date')
      if (d && !d.value) d.value = new Date().toISOString().split('T')[0]
    }
  })
  document.getElementById('long-reminder-toggle')?.addEventListener('change', function () {
    const opts = document.getElementById('long-reminder-options')
    if (opts) opts.classList.toggle('hidden', !this.checked)
    if (this.checked) {
      const d = document.getElementById('long-reminder-date')
      if (d && !d.value) d.value = new Date().toISOString().split('T')[0]
    }
  })

  // Reminder preview live-updates
  ;['short-reminder-date','short-reminder-time'].forEach(id => document.getElementById(id)?.addEventListener('change', () => updateReminderPreview('short')))
  ;['long-reminder-date','long-reminder-time'].forEach(id   => document.getElementById(id)?.addEventListener('change', () => updateReminderPreview('long')))

  // Create short goal
  document.getElementById('create-short-goal-btn')?.addEventListener('click', createShortGoal)
  document.getElementById('short-goal-text')?.addEventListener('keydown', e => { if (e.key === 'Enter') createShortGoal() })

  // Create long goal
  document.getElementById('create-long-goal-btn')?.addEventListener('click', createLongGoal)
  document.getElementById('long-goal-title')?.addEventListener('keydown', e => { if (e.key === 'Enter') createLongGoal() })

  // Slider live preview in update modal
  document.getElementById('update-progress-slider')?.addEventListener('input', function () {
    document.getElementById('update-progress-val').textContent = this.value
    document.getElementById('update-new-pct').textContent      = this.value + '%'
    const fill = document.getElementById('update-current-fill')
    if (fill) fill.style.width = this.value + '%'
  })

  // Save progress
  document.getElementById('save-progress-btn')?.addEventListener('click', saveProgress)
}

// ── Create short-term goal ────────────────────────────────────
async function createShortGoal() {
  const textEl = document.getElementById('short-goal-text')
  const errEl  = document.getElementById('short-goal-error')
  const text   = textEl?.value.trim()
  if (!text) { errEl?.classList.remove('hidden'); textEl?.focus(); return }
  errEl?.classList.add('hidden')

  const desc        = document.getElementById('short-goal-desc')?.value.trim()
  const day         = document.getElementById('short-goal-day')?.value
  const wantRemind  = document.getElementById('short-reminder-toggle')?.checked
  const remDate     = document.getElementById('short-reminder-date')?.value
  const remTime     = document.getElementById('short-reminder-time')?.value

  if (wantRemind && (!remDate || !remTime)) { alert('Please set a date and time for the reminder.'); return }
  if (wantRemind && new Date(`${remDate}T${remTime}`) <= new Date()) { alert('Reminder must be in the future.'); return }

  const body = {
    title: text, description: desc || '', type: 'short',
    priority: shortPriority, day: day || '',
    hasReminder: wantRemind,
    reminderFreq: wantRemind ? shortFreq : null,
    reminderTime: wantRemind ? `${remDate}T${remTime}` : null,
    progress: 0, status: 'active', progressLog: [],
  }

  try {
    const res = await api.goals.create(body)
    allGoals.unshift(res.data)
    closeOverlay('short-term-overlay')
    resetShortForm()
    renderPage()
  } catch (err) {
    alert('Failed: ' + err.message)
  }
}

// ── Create long-term goal ─────────────────────────────────────
async function createLongGoal() {
  const titleEl = document.getElementById('long-goal-title')
  const errEl   = document.getElementById('long-goal-error')
  const title   = titleEl?.value.trim()
  if (!title) { errEl?.classList.remove('hidden'); titleEl?.focus(); return }
  errEl?.classList.add('hidden')

  const desc        = document.getElementById('long-goal-desc')?.value.trim()
  const targetValue = document.getElementById('long-goal-target')?.value.trim()
  const targetAmt   = document.getElementById('long-goal-amount')?.value
  const deadline    = document.getElementById('long-goal-deadline')?.value
  const initProg    = Math.min(100, Math.max(0, parseInt(document.getElementById('long-goal-init-progress')?.value || '0')))
  const wantRemind  = document.getElementById('long-reminder-toggle')?.checked
  const remDate     = document.getElementById('long-reminder-date')?.value
  const remTime     = document.getElementById('long-reminder-time')?.value

  if (wantRemind && (!remDate || !remTime)) { alert('Please set a date and time for the reminder.'); return }
  if (wantRemind && new Date(`${remDate}T${remTime}`) <= new Date()) { alert('Reminder must be in the future.'); return }

  const initialLog = initProg > 0
    ? [{ pct: initProg, prev: 0, note: `🚀 Started at ${initProg}% progress.`, date: new Date().toISOString() }]
    : []

  const body = {
    title, description: desc || '', type: 'long',
    priority: longPriority,
    targetValue: targetValue || '', targetAmount: targetAmt ? parseFloat(targetAmt) : null,
    deadline: deadline || '', progress: initProg,
    status: initProg >= 100 ? 'completed' : 'active',
    hasReminder: wantRemind,
    reminderFreq: wantRemind ? longFreq : null,
    reminderTime: wantRemind ? `${remDate}T${remTime}` : null,
    progressLog: initialLog,
  }

  try {
    const res = await api.goals.create(body)
    allGoals.unshift(res.data)
    closeOverlay('long-term-overlay')
    resetLongForm()
    renderPage()
  } catch (err) {
    alert('Failed: ' + err.message)
  }
}

// ── Save progress update ──────────────────────────────────────
async function saveProgress() {
  if (!updateTargetId) return
  const goal   = allGoals.find(g => g._id === updateTargetId)
  if (!goal) return

  const slider  = document.getElementById('update-progress-slider')
  const noteEl  = document.getElementById('update-progress-note')
  const noteErr = document.getElementById('update-note-error')
  const newPct  = parseInt(slider?.value || 0)
  const note    = noteEl?.value.trim()

  if (!note) { noteErr?.classList.remove('hidden'); noteEl?.focus(); return }
  noteErr?.classList.add('hidden')

  const prevPct = goal.progress || 0
  if (newPct < prevPct) { alert(`Progress can't go below ${prevPct}%`); return }

  const logEntry = { pct: newPct, prev: prevPct, note, date: new Date().toISOString() }
  const progressLog = [logEntry, ...(goal.progressLog || [])]

  try {
    const res = await api.goals.update(updateTargetId, {
      progress: newPct,
      status:   newPct >= 100 ? 'completed' : 'active',
      progressLog,
    })
    const idx = allGoals.findIndex(g => g._id === updateTargetId)
    if (idx !== -1) allGoals[idx] = res.data
    closeOverlay('update-progress-overlay')
    updateTargetId = null
    renderPage()
  } catch (err) {
    alert('Failed: ' + err.message)
  }
}

// ── Quick slider update (no log entry) ───────────────────────
async function updateGoalProgress(id, progress) {
  try {
    const res = await api.goals.updateProgress(id, { progress })
    const idx = allGoals.findIndex(g => g._id === id)
    if (idx !== -1) allGoals[idx] = res.data
    updateHero()
    renderGoalsGrid()
  } catch (err) {
    alert('Failed: ' + err.message)
  }
}

// ── Delete goal ───────────────────────────────────────────────
async function deleteGoal(id) {
  try {
    await api.goals.delete(id)
    allGoals = allGoals.filter(g => g._id !== id)
    renderPage()
  } catch (err) {
    alert('Failed: ' + err.message)
  }
}

// ── Form resets ───────────────────────────────────────────────
function resetShortForm() {
  ;['short-goal-text','short-goal-desc'].forEach(id => { const el = document.getElementById(id); if (el) el.value = '' })
  const day = document.getElementById('short-goal-day'); if (day) day.value = ''
  document.getElementById('short-goal-error')?.classList.add('hidden')
  const tog = document.getElementById('short-reminder-toggle'); if (tog) tog.checked = false
  document.getElementById('short-reminder-options')?.classList.add('hidden')
  shortPriority = 'low'; shortFreq = 'daily'
}

function resetLongForm() {
  ;['long-goal-title','long-goal-desc','long-goal-target','long-goal-amount','long-goal-deadline'].forEach(id => { const el = document.getElementById(id); if (el) el.value = '' })
  const prog = document.getElementById('long-goal-init-progress'); if (prog) prog.value = '0'
  document.getElementById('long-goal-error')?.classList.add('hidden')
  const tog = document.getElementById('long-reminder-toggle'); if (tog) tog.checked = false
  document.getElementById('long-reminder-options')?.classList.add('hidden')
  longPriority = 'low'; longFreq = 'daily'
}

init()
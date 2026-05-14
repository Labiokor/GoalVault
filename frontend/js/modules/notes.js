import { api } from '../api/api.js'
import { timeAgo } from '../utils/helpers.js'

const root = document.getElementById('page-root')
let allNotes = []
let activeNote = null
let activeCategory = 'all'
let searchQuery = ''

// ── Category config (mirrors notebook page) ───────────────────
const CAT_CONFIG = {
  general:  { label: 'General',  icon: '📁', color: '#6b7280' },
  work:     { label: 'Work',     icon: '💼', color: '#0284c7' },
  personal: { label: 'Personal', icon: '🙂', color: '#4f46e5' },
  school:   { label: 'School',   icon: '🎓', color: '#059669' },
}

// ── Bootstrap ─────────────────────────────────────────────────
async function init() {
  root.innerHTML = `
    <div class="flex items-center justify-center py-12 text-on-surface-variant gap-2">
      <span class="material-symbols-outlined">progress_activity</span>
      <span class="text-sm">Loading notes...</span>
    </div>`
  try {
    const res = await api.notes.getAll()
    allNotes = res.data || []
    renderPage()
  } catch (err) {
    root.innerHTML = `<p class="text-error text-sm p-8">${err.message}</p>`
  }
}

// ── Date helpers ──────────────────────────────────────────────
function getDateGroup(dateStr) {
  const now         = new Date()
  const today       = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const noteDate    = new Date(dateStr)
  const noteDateOnly = new Date(noteDate.getFullYear(), noteDate.getMonth(), noteDate.getDate())
  const diffDays    = Math.floor((today - noteDateOnly) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays <= 7)  return 'This Week'
  if (diffDays <= 30) return 'This Month'
  if (noteDate.getFullYear() === now.getFullYear())
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long' })
  return 'Older'
}

// ── Page scaffold ─────────────────────────────────────────────
function renderPage() {
  root.innerHTML = `
    <div class="flex h-[calc(100vh-5rem)] -mx-8 overflow-hidden">

      <!-- ── Left pane / Sidebar ── -->
      <div class="w-80 flex flex-col shrink-0 border-r border-surface-container-high" style="background:#f8faff">

        <!-- Header -->
        <div class="p-5 border-b border-surface-container-high"
             style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)">
          <h2 class="text-xl font-black text-white tracking-tight mb-1">📓 Notes</h2>
          <p class="text-white/70 text-xs">${allNotes.length} note${allNotes.length !== 1 ? 's' : ''}</p>

          <!-- Search -->
          <div class="mt-3 relative">
            <span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-white/60 text-sm">search</span>
            <input id="notes-search-input" type="text" placeholder="Search notes…"
                   class="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/20 text-white placeholder:text-white/60 outline-none text-xs focus:bg-white/30 transition-all">
          </div>

          <!-- Category tabs -->
          <div class="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
            ${['all','general','work','personal','school'].map(cat => `
              <button class="cat-btn px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all
                ${activeCategory === cat ? 'bg-white/25 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20'}"
                data-cat="${cat}">${cat === 'all' ? 'All' : CAT_CONFIG[cat].label}</button>
            `).join('')}
          </div>
        </div>

        <!-- Note list -->
        <div class="flex-1 overflow-y-auto p-3 space-y-1 no-scrollbar" id="notes-list"></div>

        <!-- New note button -->
        <div class="p-4 border-t border-surface-container-high bg-white">
          <button id="new-note-btn"
                  class="w-full text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
                  style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)">
            <span class="material-symbols-outlined text-sm">add</span>
            New Note
          </button>
        </div>
      </div>

      <!-- ── Right pane / Editor ── -->
      <div class="flex-1 flex flex-col overflow-hidden bg-white" id="editor-pane">
        ${allNotes.length === 0
          ? emptyEditorHTML('create')
          : emptyEditorHTML('select')}
      </div>

    </div>`

  renderNotesList()
  attachEvents()

  document.getElementById('empty-new-note')?.addEventListener('click', createNote)
}

function emptyEditorHTML(mode) {
  if (mode === 'create') {
    return `
      <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <div class="w-24 h-24 rounded-full flex items-center justify-center"
             style="background:rgba(79,70,229,0.08)">
          <span class="material-symbols-outlined text-5xl" style="color:#4f46e5">edit_note</span>
        </div>
        <h3 class="text-xl font-bold text-on-surface">Your notes sanctuary</h3>
        <p class="text-sm text-on-surface-variant max-w-sm">
          Capture your thoughts, ideas and knowledge. Create your first note to get started.
        </p>
        <button id="empty-new-note"
                class="text-white px-8 py-3 rounded-full font-bold text-sm hover:opacity-90 transition-all"
                style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)">
          Create First Note
        </button>
      </div>`
  }
  return `
    <div class="flex flex-col items-center justify-center h-full gap-3 text-center">
      <div class="w-16 h-16 rounded-full flex items-center justify-center"
           style="background:rgba(79,70,229,0.08)">
        <span class="material-symbols-outlined text-3xl" style="color:#4f46e5">touch_app</span>
      </div>
      <h3 class="text-lg font-bold text-on-surface">Select a note</h3>
      <p class="text-sm text-on-surface-variant">Pick a note from the left to start reading or editing</p>
    </div>`
}

// ── Notes list ────────────────────────────────────────────────
function renderNotesList() {
  const list = document.getElementById('notes-list')
  if (!list) return

  let filtered = activeCategory === 'all'
    ? allNotes
    : allNotes.filter(n => n.category === activeCategory)

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q)
    )
  }

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <span class="material-symbols-outlined text-3xl opacity-30" style="color:#4f46e5">description</span>
        <p class="text-xs text-on-surface-variant">
          ${searchQuery ? 'No notes match your search' : 'No notes in this category'}
        </p>
      </div>`
    return
  }

  const sorted  = [...filtered].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  const grouped = {}
  sorted.forEach(note => {
    const g = getDateGroup(note.updatedAt)
    if (!grouped[g]) grouped[g] = []
    grouped[g].push(note)
  })

  const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older']
  let html = ''

  groupOrder.forEach(groupName => {
    const month_names = ['January','February','March','April','May','June','July','August','September','October','November','December']
    const allKeys = [...Object.keys(grouped)]
    // also handle month-name groups that aren't in the fixed order
    const extraGroups = allKeys.filter(k => !groupOrder.includes(k))
    ;[...groupOrder, ...extraGroups].forEach(gName => {
      if (gName !== groupName) return
      if (!grouped[gName]) return
    })
    if (!grouped[groupName]) return

    html += `
      <div class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-2 py-2 mt-2 mb-1 opacity-60">
        ${groupName}
      </div>`

    grouped[groupName].forEach(note => {
      const isActive = activeNote && activeNote._id === note._id
      const cat      = CAT_CONFIG[note.category] || CAT_CONFIG.general
      const color    = cat.color

      html += `
        <div class="note-card-item p-3.5 rounded-xl cursor-pointer transition-all
          ${isActive ? 'shadow-md' : 'hover:bg-indigo-50/60'}"
          style="${isActive
            ? 'background:white;border:2px solid rgba(79,70,229,0.25)'
            : 'background:transparent'}"
          data-id="${note._id}">
          <div class="flex justify-between items-start mb-1">
            <span class="text-[10px] font-bold uppercase tracking-widest" style="color:${color}">
              ${cat.icon} ${cat.label}
            </span>
            <span class="text-[10px] text-on-surface-variant">${timeAgo(note.updatedAt)}</span>
          </div>
          <h3 class="font-bold text-on-surface text-sm truncate">${note.title || 'Untitled'}</h3>
          <p class="text-xs text-on-surface-variant mt-1"
             style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">
            ${note.content || ''}
          </p>
        </div>`
    })
  })

  // Handle extra (month-name) groups
  const standardGroups = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older']
  Object.keys(grouped).filter(k => !standardGroups.includes(k)).forEach(gName => {
    html += `
      <div class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-2 py-2 mt-2 mb-1 opacity-60">
        ${gName}
      </div>`
    grouped[gName].forEach(note => {
      const isActive = activeNote && activeNote._id === note._id
      const cat      = CAT_CONFIG[note.category] || CAT_CONFIG.general
      html += `
        <div class="note-card-item p-3.5 rounded-xl cursor-pointer transition-all
          ${isActive ? 'shadow-md' : 'hover:bg-indigo-50/60'}"
          style="${isActive ? 'background:white;border:2px solid rgba(79,70,229,0.25)' : ''}"
          data-id="${note._id}">
          <div class="flex justify-between items-start mb-1">
            <span class="text-[10px] font-bold uppercase tracking-widest" style="color:${cat.color}">
              ${cat.icon} ${cat.label}
            </span>
            <span class="text-[10px] text-on-surface-variant">${timeAgo(note.updatedAt)}</span>
          </div>
          <h3 class="font-bold text-on-surface text-sm truncate">${note.title || 'Untitled'}</h3>
          <p class="text-xs text-on-surface-variant mt-1"
             style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">
            ${note.content || ''}
          </p>
        </div>`
    })
  })

  list.innerHTML = html
}

// ── Editor ────────────────────────────────────────────────────
function renderEditor(note) {
  const pane = document.getElementById('editor-pane')
  if (!pane) return

  const cat   = CAT_CONFIG[note.category] || CAT_CONFIG.general
  const color = cat.color

  pane.innerHTML = `
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-8 py-4 border-b border-surface-container-high bg-white shrink-0">
      <div class="flex items-center gap-3">
        <span class="text-xs font-bold uppercase tracking-widest" style="color:${color}">
          ${cat.icon} ${cat.label}
        </span>
        <span class="w-1 h-1 rounded-full bg-outline-variant"></span>
        <span class="text-xs text-on-surface-variant">${timeAgo(note.updatedAt)}</span>
      </div>
      <div class="flex items-center gap-2">
        <!-- Category selector -->
        <select id="note-category-select"
                class="text-xs border rounded-lg px-3 py-1.5 font-bold outline-none transition-colors"
                style="border-color:rgba(79,70,229,0.3);color:${color}">
          ${Object.entries(CAT_CONFIG).map(([val, cfg]) =>
            `<option value="${val}" ${note.category === val ? 'selected' : ''}>${cfg.icon} ${cfg.label}</option>`
          ).join('')}
        </select>
        <!-- Delete -->
        <button id="delete-note-btn"
                class="p-2 text-on-surface-variant hover:text-error transition-colors rounded-lg hover:bg-error-container/20">
          <span class="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>
    </div>

    <!-- Writing area -->
    <div class="flex-1 overflow-y-auto p-8 lg:p-12">
      <input id="note-title-input"
             class="w-full bg-transparent border-none outline-none text-4xl font-black text-on-surface mb-6 placeholder:text-on-surface-variant/30"
             type="text" value="${note.title || ''}" placeholder="Untitled">
      <textarea id="note-content-input"
                class="w-full bg-transparent border-none outline-none text-sm leading-relaxed text-on-surface placeholder:text-on-surface-variant/50 resize-none min-h-[500px]"
                placeholder="Start writing your thoughts...">${note.content || ''}</textarea>
    </div>

    <!-- Save indicator -->
    <div id="save-indicator"
         class="px-8 py-2 text-xs text-on-surface-variant bg-white border-t border-surface-container-high hidden">
      <span class="flex items-center gap-1">
        <span class="material-symbols-outlined text-xs">check_circle</span>
        Saved
      </span>
    </div>`

  // ── Auto-save ─────────────────────────────────────────────
  let saveTimeout = null

  const autoSave = () => {
    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(async () => {
      const title    = document.getElementById('note-title-input')?.value
      const content  = document.getElementById('note-content-input')?.value
      const category = document.getElementById('note-category-select')?.value
      try {
        const res = await api.notes.update(note._id, { title, content, category })
        const idx = allNotes.findIndex(n => n._id === note._id)
        if (idx !== -1) allNotes[idx] = res.data
        activeNote = res.data
        renderNotesList()
        const ind = document.getElementById('save-indicator')
        if (ind) { ind.classList.remove('hidden'); setTimeout(() => ind.classList.add('hidden'), 2000) }
      } catch (err) {
        console.error('Auto-save failed:', err.message)
      }
    }, 800)
  }

  document.getElementById('note-title-input')?.addEventListener('input', autoSave)
  document.getElementById('note-content-input')?.addEventListener('input', autoSave)
  document.getElementById('note-category-select')?.addEventListener('change', autoSave)

  // ── Delete ────────────────────────────────────────────────
  document.getElementById('delete-note-btn')?.addEventListener('click', async () => {
    if (!confirm('Delete this note?')) return
    try {
      await api.notes.delete(note._id)
      allNotes    = allNotes.filter(n => n._id !== note._id)
      activeNote  = null
      renderNotesList()
      const pane2 = document.getElementById('editor-pane')
      if (pane2) pane2.innerHTML = emptyEditorHTML(allNotes.length === 0 ? 'create' : 'select')
      document.getElementById('empty-new-note')?.addEventListener('click', createNote)
    } catch (err) {
      alert('Failed: ' + err.message)
    }
  })
}

// ── Category filter ───────────────────────────────────────────
function setCategoryFilter(cat) {
  activeCategory = cat
  document.querySelectorAll('.cat-btn').forEach(btn => {
    const active = btn.dataset.cat === cat
    btn.className = `cat-btn px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all
      ${active ? 'bg-white/25 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20'}`
  })
}

// ── Events ────────────────────────────────────────────────────
function attachEvents() {
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setCategoryFilter(btn.dataset.cat)
      renderNotesList()
    })
  })

  document.getElementById('new-note-btn')?.addEventListener('click', createNote)
  document.getElementById('fab')?.addEventListener('click', createNote)

  document.getElementById('notes-search-input')?.addEventListener('input', e => {
    searchQuery = e.target.value
    renderNotesList()
  })

  document.getElementById('notes-list')?.addEventListener('click', e => {
    const card = e.target.closest('.note-card-item')
    if (!card) return
    const found = allNotes.find(n => n._id === card.dataset.id)
    if (found) {
      activeNote = found
      renderNotesList()
      renderEditor(activeNote)
    }
  })
}

// ── Create note ───────────────────────────────────────────────
async function createNote() {
  try {
    const res = await api.notes.create({
      title:    '',
      content:  '',
      category: activeCategory === 'all' ? 'general' : activeCategory,
    })
    allNotes.unshift(res.data)
    activeNote = res.data
    renderNotesList()
    renderEditor(activeNote)
    setTimeout(() => document.getElementById('note-title-input')?.focus(), 100)
  } catch (err) {
    alert('Failed to create note: ' + err.message)
  }
}

init()
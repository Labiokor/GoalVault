import { api } from '../api/api.js'
import { timeAgo } from '../utils/helpers.js'

const root = document.getElementById('page-root')
let allNotes = []
let activeNote = null
let activeCategory = 'all'

async function init() {
  root.innerHTML = '<div class="flex items-center justify-center py-12 text-on-surface-variant gap-2"><span class="material-symbols-outlined">progress_activity</span><span class="text-sm">Loading notes...</span></div>'
  try {
    const res = await api.notes.getAll()
    allNotes = res.data || []
    renderPage()
  } catch (err) {
    root.innerHTML = '<p class="text-error text-sm p-8">' + err.message + '</p>'
  }
}

function renderPage() {
  root.innerHTML = `
    <div class="flex h-[calc(100vh-5rem)] -mx-8 overflow-hidden">

      <!-- Left pane -->
      <div class="w-80 flex flex-col shrink-0 border-r border-surface-container-high" style="background:#fffbf0">

        <!-- Header -->
        <div class="p-5 border-b border-surface-container-high" style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%)">
          <h2 class="text-xl font-black text-white tracking-tight mb-1">My Notes</h2>
          <p class="text-white/70 text-xs">${allNotes.length} note${allNotes.length !== 1 ? 's' : ''}</p>
          <div class="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
            <button class="cat-btn px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-white/20 text-white" data-cat="all">All</button>
            <button class="cat-btn px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-white/10 text-white/80 hover:bg-white/20" data-cat="personal">Personal</button>
            <button class="cat-btn px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-white/10 text-white/80 hover:bg-white/20" data-cat="work">Work</button>
            <button class="cat-btn px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-white/10 text-white/80 hover:bg-white/20" data-cat="study">Study</button>
            <button class="cat-btn px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-white/10 text-white/80 hover:bg-white/20" data-cat="ideas">Ideas</button>
          </div>
        </div>

        <!-- Notes list -->
        <div class="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar" id="notes-list"></div>

        <!-- New note button -->
        <div class="p-4 border-t border-surface-container-high bg-white">
          <button id="new-note-btn"
                  class="w-full text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%)">
            <span class="material-symbols-outlined text-sm">add</span>
            New Note
          </button>
        </div>
      </div>

      <!-- Right pane: editor -->
      <div class="flex-1 flex flex-col overflow-hidden bg-white" id="editor-pane">
        ${allNotes.length === 0
          ? '<div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">'
            + '<div class="w-24 h-24 rounded-full flex items-center justify-center" style="background:rgba(245,158,11,0.1)">'
            + '<span class="material-symbols-outlined text-5xl" style="color:#f59e0b">edit_note</span></div>'
            + '<h3 class="text-xl font-bold text-on-surface">Your notes sanctuary</h3>'
            + '<p class="text-sm text-on-surface-variant max-w-sm">Capture your thoughts, ideas and knowledge. Create your first note to get started.</p>'
            + '<button id="empty-new-note" class="text-white px-8 py-3 rounded-full font-bold text-sm" style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%)">Create First Note</button>'
            + '</div>'
          : '<div class="flex flex-col items-center justify-center h-full gap-3 text-center">'
            + '<div class="w-16 h-16 rounded-full flex items-center justify-center" style="background:rgba(245,158,11,0.1)">'
            + '<span class="material-symbols-outlined text-3xl" style="color:#f59e0b">touch_app</span></div>'
            + '<h3 class="text-lg font-bold text-on-surface">Select a note</h3>'
            + '<p class="text-sm text-on-surface-variant">Pick a note from the left to start reading or editing</p>'
            + '</div>'}
      </div>

    </div>
  `

  renderNotesList()
  attachEvents()

  document.getElementById('empty-new-note')?.addEventListener('click', createNote)
}

function renderNotesList() {
  const list = document.getElementById('notes-list')
  if (!list) return

  const filtered = activeCategory === 'all'
    ? allNotes
    : allNotes.filter(n => n.category === activeCategory)

  if (filtered.length === 0) {
    list.innerHTML = '<div class="flex flex-col items-center justify-center py-8 gap-2 text-center">'
      + '<span class="material-symbols-outlined text-3xl opacity-30" style="color:#f59e0b">description</span>'
      + '<p class="text-xs text-on-surface-variant">No notes in this category</p>'
      + '</div>'
    return
  }

  const catColors = {
    personal: '#4f46e5',
    work:     '#0284c7',
    study:    '#059669',
    ideas:    '#d97706'
  }

  let html = ''
  filtered.forEach(note => {
    const isActive = activeNote && activeNote._id === note._id
    const color = catColors[note.category] || '#f59e0b'

    html += '<div class="note-card-item p-4 rounded-xl cursor-pointer transition-all '
      + (isActive ? 'shadow-md' : 'hover:bg-amber-50')
      + '" style="'
      + (isActive ? 'background:white;border:2px solid rgba(245,158,11,0.3)' : 'background:transparent')
      + '" data-id="' + note._id + '">'
      + '<div class="flex justify-between items-start mb-1">'
      + '<span class="text-[10px] font-bold uppercase tracking-widest" style="color:' + color + '">' + note.category + '</span>'
      + '<div class="flex items-center gap-1">'
      + (note.pinned ? '<span class="material-symbols-outlined text-xs" style="color:#f59e0b;font-variation-settings:\'FILL\' 1">push_pin</span>' : '')
      + '<span class="text-[10px] text-on-surface-variant">' + timeAgo(note.updatedAt) + '</span>'
      + '</div>'
      + '</div>'
      + '<h3 class="font-bold text-on-surface text-sm truncate">' + (note.title || 'Untitled') + '</h3>'
      + '<p class="text-xs text-on-surface-variant mt-1" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">'
      + (note.content || '') + '</p>'
      + '</div>'
  })

  list.innerHTML = html
}

function renderEditor(note) {
  const pane = document.getElementById('editor-pane')
  if (!pane) return

  const catColors = { personal: '#4f46e5', work: '#0284c7', study: '#059669', ideas: '#d97706' }
  const color = catColors[note.category] || '#f59e0b'

  pane.innerHTML = `
    <div class="flex items-center justify-between px-8 py-4 border-b border-surface-container-high bg-white shrink-0">
      <div class="flex items-center gap-3">
        <span class="text-xs font-bold uppercase tracking-widest" style="color:${color}">${note.category}</span>
        <span class="w-1 h-1 rounded-full bg-outline-variant"></span>
        <span class="text-xs text-on-surface-variant">${timeAgo(note.updatedAt)}</span>
        ${note.pinned ? '<span class="material-symbols-outlined text-xs" style="color:#f59e0b;font-variation-settings:\'FILL\' 1">push_pin</span>' : ''}
      </div>
      <div class="flex items-center gap-2">
        <button id="pin-note-btn" class="p-2 text-on-surface-variant hover:text-amber-500 transition-colors rounded-lg hover:bg-amber-50" title="Pin note">
          <span class="material-symbols-outlined text-sm" style="font-variation-settings:'FILL' ${note.pinned ? '1' : '0'}">push_pin</span>
        </button>
        <select id="note-category-select" class="text-xs border rounded-lg px-3 py-1.5 font-bold outline-none" style="border-color:rgba(245,158,11,0.3);color:${color}">
          <option value="personal" ${note.category === 'personal' ? 'selected' : ''}>Personal</option>
          <option value="work" ${note.category === 'work' ? 'selected' : ''}>Work</option>
          <option value="study" ${note.category === 'study' ? 'selected' : ''}>Study</option>
          <option value="ideas" ${note.category === 'ideas' ? 'selected' : ''}>Ideas</option>
        </select>
        <button id="delete-note-btn" class="p-2 text-on-surface-variant hover:text-error transition-colors rounded-lg hover:bg-error-container/20">
          <span class="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-8 lg:p-12">
      <input id="note-title-input"
             class="w-full bg-transparent border-none outline-none text-4xl font-black font-headline text-on-surface mb-6 placeholder:text-on-surface-variant/30"
             type="text" value="${note.title || ''}" placeholder="Untitled">
      <textarea id="note-content-input"
                class="w-full bg-transparent border-none outline-none text-sm leading-relaxed text-on-surface placeholder:text-on-surface-variant/50 resize-none min-h-[500px]"
                placeholder="Start writing your thoughts...">${note.content || ''}</textarea>
    </div>

    <div id="save-indicator" class="px-8 py-2 text-xs text-on-surface-variant bg-white border-t border-surface-container-high hidden">
      <span class="flex items-center gap-1">
        <span class="material-symbols-outlined text-xs">check_circle</span>
        Saved
      </span>
    </div>
  `

  let saveTimeout = null

  const autoSave = () => {
    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(async () => {
      const title = document.getElementById('note-title-input')?.value
      const content = document.getElementById('note-content-input')?.value
      const category = document.getElementById('note-category-select')?.value

      try {
        const res = await api.notes.update(note._id, { title, content, category })
        const idx = allNotes.findIndex(n => n._id === note._id)
        if (idx !== -1) allNotes[idx] = res.data
        activeNote = res.data
        renderNotesList()

        const indicator = document.getElementById('save-indicator')
        if (indicator) {
          indicator.classList.remove('hidden')
          setTimeout(() => indicator.classList.add('hidden'), 2000)
        }
      } catch (err) {
        console.error('Auto-save failed:', err.message)
      }
    }, 800)
  }

  document.getElementById('note-title-input')?.addEventListener('input', autoSave)
  document.getElementById('note-content-input')?.addEventListener('input', autoSave)
  document.getElementById('note-category-select')?.addEventListener('change', autoSave)

  document.getElementById('pin-note-btn')?.addEventListener('click', async () => {
    try {
      const res = await api.notes.update(note._id, { pinned: !note.pinned })
      const idx = allNotes.findIndex(n => n._id === note._id)
      if (idx !== -1) allNotes[idx] = res.data
      activeNote = res.data
      renderNotesList()
      renderEditor(res.data)
    } catch (err) {
      alert('Failed: ' + err.message)
    }
  })

  document.getElementById('delete-note-btn')?.addEventListener('click', async () => {
    if (confirm('Delete this note?')) {
      try {
        await api.notes.delete(note._id)
        allNotes = allNotes.filter(n => n._id !== note._id)
        activeNote = null
        renderNotesList()
        const pane = document.getElementById('editor-pane')
        if (pane) {
          pane.innerHTML = '<div class="flex flex-col items-center justify-center h-full gap-3 text-center">'
            + '<div class="w-16 h-16 rounded-full flex items-center justify-center" style="background:rgba(245,158,11,0.1)">'
            + '<span class="material-symbols-outlined text-3xl" style="color:#f59e0b">edit_note</span></div>'
            + '<h3 class="text-lg font-bold text-on-surface">Select a note</h3>'
            + '</div>'
        }
      } catch (err) {
        alert('Failed: ' + err.message)
      }
    }
  })
}

function setCategoryFilter(cat) {
  activeCategory = cat
  document.querySelectorAll('.cat-btn').forEach(btn => {
    const isActive = btn.dataset.cat === cat
    btn.className = 'cat-btn px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap '
      + (isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20')
  })
}

function attachEvents() {
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setCategoryFilter(btn.dataset.cat)
      renderNotesList()
    })
  })

  document.getElementById('new-note-btn')?.addEventListener('click', createNote)
  document.getElementById('fab')?.addEventListener('click', createNote)

  document.getElementById('notes-list')?.addEventListener('click', (e) => {
    const card = e.target.closest('.note-card-item')
    if (card) {
      const id = card.dataset.id
      activeNote = allNotes.find(n => n._id === id)
      if (activeNote) {
        renderNotesList()
        renderEditor(activeNote)
      }
    }
  })
}

async function createNote() {
  try {
    const res = await api.notes.create({ title: '', content: '', category: activeCategory === 'all' ? 'personal' : activeCategory })
    allNotes.unshift(res.data)
    activeNote = res.data
    renderNotesList()
    renderEditor(res.data)
    setTimeout(() => document.getElementById('note-title-input')?.focus(), 100)
  } catch (err) {
    alert('Failed to create note: ' + err.message)
  }
}

init()
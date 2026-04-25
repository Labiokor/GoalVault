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
    <div class="flex h-[calc(100vh-6rem)] -mx-8 -mt-0">

      <!-- Left pane: notes list -->
      <div class="w-80 bg-surface border-r border-surface-container-high flex flex-col shrink-0">
        <div class="p-5 border-b border-surface-container-high">
          <h2 class="text-xl font-black text-on-surface tracking-tight mb-4">My Notes</h2>
          <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button class="cat-btn px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap" data-cat="all">All</button>
            <button class="cat-btn px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap" data-cat="personal">Personal</button>
            <button class="cat-btn px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap" data-cat="work">Work</button>
            <button class="cat-btn px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap" data-cat="study">Study</button>
            <button class="cat-btn px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap" data-cat="ideas">Ideas</button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-3 space-y-2" id="notes-list"></div>
        <div class="p-4 border-t border-surface-container-high">
          <button id="new-note-btn"
                  class="w-full vault-gradient text-on-primary py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-sm">add</span>
            New Note
          </button>
        </div>
      </div>

      <!-- Right pane: editor -->
      <div class="flex-1 flex flex-col bg-surface-container-low overflow-hidden" id="editor-pane">
        <div class="flex flex-col items-center justify-center h-full text-center gap-4">
          <div class="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center">
            <span class="material-symbols-outlined text-on-surface-variant text-4xl">edit_note</span>
          </div>
          <h3 class="text-lg font-bold text-on-surface">Select a note to view</h3>
          <p class="text-sm text-on-surface-variant">Or create a new one to get started</p>
        </div>
      </div>

    </div>
  `

  setCategoryFilter('all')
  renderNotesList()
  attachEvents()
}

function renderNotesList() {
  const list = document.getElementById('notes-list')
  if (!list) return

  const filtered = activeCategory === 'all'
    ? allNotes
    : allNotes.filter(n => n.category === activeCategory)

  if (filtered.length === 0) {
    list.innerHTML = '<div class="flex flex-col items-center justify-center py-8 gap-2 text-center">'
      + '<span class="material-symbols-outlined text-on-surface-variant opacity-40 text-3xl">description</span>'
      + '<p class="text-xs text-on-surface-variant">No notes here yet</p>'
      + '</div>'
    return
  }

  const catColors = {
    personal: 'text-primary',
    work:     'text-secondary',
    study:    'text-tertiary',
    ideas:    'text-error'
  }

  let html = ''
  filtered.forEach(note => {
    const isActive = activeNote && activeNote._id === note._id
    const color = catColors[note.category] || 'text-primary'

    html += '<div class="note-card-item p-4 rounded-xl cursor-pointer transition-all '
      + (isActive ? 'bg-surface-container-lowest border-2 border-primary-container/30 shadow-sm' : 'hover:bg-surface-container-low')
      + '" data-id="' + note._id + '">'
      + '<div class="flex justify-between items-start mb-1">'
      + '<span class="text-[10px] font-bold uppercase tracking-widest ' + color + '">' + note.category + '</span>'
      + '<span class="text-[10px] text-on-surface-variant">' + timeAgo(note.updatedAt) + '</span>'
      + '</div>'
      + '<h3 class="font-bold text-on-surface text-sm truncate">' + (note.title || 'Untitled') + '</h3>'
      + '<p class="text-xs text-on-surface-variant mt-1 line-clamp-2">' + (note.content || '') + '</p>'
      + (note.pinned ? '<span class="material-symbols-outlined text-xs text-primary mt-1" style="font-variation-settings:\'FILL\' 1">push_pin</span>' : '')
      + '</div>'
  })

  list.innerHTML = html
}

function renderEditor(note) {
  const pane = document.getElementById('editor-pane')
  if (!pane) return

  const catColors = { personal: 'text-primary', work: 'text-secondary', study: 'text-tertiary', ideas: 'text-error' }
  const color = catColors[note.category] || 'text-primary'

  pane.innerHTML = `
    <div class="flex items-center justify-between px-8 py-4 border-b border-surface-container-high bg-surface-container-lowest shrink-0">
      <div class="flex items-center gap-3">
        <span class="text-xs font-bold uppercase tracking-widest ${color}">${note.category}</span>
        <span class="w-1 h-1 rounded-full bg-outline-variant"></span>
        <span class="text-xs text-on-surface-variant">${timeAgo(note.updatedAt)}</span>
        ${note.pinned ? '<span class="material-symbols-outlined text-xs text-primary" style="font-variation-settings:\'FILL\' 1">push_pin</span>' : ''}
      </div>
      <div class="flex items-center gap-2">
        <button id="pin-note-btn" class="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-lg hover:bg-surface-container" title="Pin note">
          <span class="material-symbols-outlined text-sm" style="font-variation-settings:'FILL' ${note.pinned ? '1' : '0'}">push_pin</span>
        </button>
        <select id="note-category-select" class="text-xs bg-surface-container-low border-none rounded-lg px-3 py-1.5 font-bold outline-none">
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
                class="w-full bg-transparent border-none outline-none text-sm leading-relaxed text-on-surface placeholder:text-on-surface-variant/50 resize-none min-h-[400px]"
                placeholder="Start writing...">${note.content || ''}</textarea>
    </div>
  `

  let saveTimeout = null

  const autoSave = async () => {
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
      alert('Failed to pin note: ' + err.message)
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
          pane.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-center gap-4">'
            + '<div class="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center">'
            + '<span class="material-symbols-outlined text-on-surface-variant text-4xl">edit_note</span></div>'
            + '<h3 class="text-lg font-bold text-on-surface">Select a note to view</h3>'
            + '</div>'
        }
      } catch (err) {
        alert('Failed to delete note: ' + err.message)
      }
    }
  })
}

function setCategoryFilter(cat) {
  activeCategory = cat
  document.querySelectorAll('.cat-btn').forEach(btn => {
    const isActive = btn.dataset.cat === cat
    btn.className = 'cat-btn px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap '
      + (isActive ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container')
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
    const res = await api.notes.create({ title: '', content: '', category: 'personal' })
    allNotes.unshift(res.data)
    activeNote = res.data
    renderNotesList()
    renderEditor(res.data)
    document.getElementById('note-title-input')?.focus()
  } catch (err) {
    alert('Failed to create note: ' + err.message)
  }
}

init()
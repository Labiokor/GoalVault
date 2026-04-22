import { timeAgo, priorityBadge, statusBadge, truncate } from '../utils/helpers.js'

export function taskCard(task) {
  return `
    <div class="flex items-start gap-4 group py-3" data-id="${task._id}">
      <div class="task-checkbox" data-id="${task._id}">
        ${task.status === 'done' ? '<span class="material-symbols-outlined text-sm text-primary">check</span>' : ''}
      </div>
      <div class="flex-1">
        <p class="font-medium text-on-surface text-sm ${task.status === 'done' ? 'line-through opacity-50' : ''}">${task.title}</p>
        <span class="badge ${priorityBadge(task.priority)} mt-1">${task.priority}</span>
      </div>
      <button class="opacity-0 group-hover:opacity-100 text-error transition-opacity delete-task-btn" data-id="${task._id}">
        <span class="material-symbols-outlined text-sm">delete</span>
      </button>
    </div>
  `
}

export function habitCard(habit) {
  return `
    <div class="habit-card" data-id="${habit._id}">
      <div class="flex items-center gap-5">
        <div class="habit-icon bg-tertiary-container/30 text-tertiary">
          <span class="material-symbols-outlined">repeat</span>
        </div>
        <div>
          <h4 class="font-bold text-lg text-on-surface">${habit.name}</h4>
          <div class="flex items-center gap-3 mt-1">
            <span class="streak-badge">
              <span class="material-symbols-outlined text-sm" style="font-variation-settings:'FILL' 1">local_fire_department</span>
              ${habit.currentstreak} day streak
            </span>
            ${habit.target ? `<span class="text-on-surface-variant text-xs">• ${habit.target}</span>` : ''}
          </div>
        </div>
      </div>
      <button class="btn btn-primary complete-habit-btn text-sm px-4 py-2" data-id="${habit._id}">
        Mark as done
      </button>
    </div>
  `
}

export function noteCard(note, isActive = false) {
  return `
    <div class="note-card ${isActive ? 'note-card--active' : ''}" data-id="${note._id}">
      <div class="flex justify-between items-start mb-2">
        <span class="text-[10px] font-bold text-primary uppercase tracking-widest">${note.category}</span>
        <span class="text-[10px] text-on-surface-variant">${timeAgo(note.updatedAt)}</span>
      </div>
      <h3 class="font-bold text-slate-800 mb-1 truncate">${note.title}</h3>
      <p class="text-sm text-on-surface-variant leading-relaxed" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">
        ${note.content}
      </p>
    </div>
  `
}

export function goalCard(goal) {
  return `
    <div class="goal-card bg-blue-50/50" data-id="${goal._id}">
      <div class="flex items-start justify-between mb-8">
        <div>
          <div class="inline-flex items-center gap-2 bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-xs font-bold mb-3">
            <span class="material-symbols-outlined text-xs">emoji_events</span>
            ${goal.status}
          </div>
          <h3 class="text-xl font-bold text-on-surface">${goal.title}</h3>
        </div>
        <button class="text-on-surface-variant hover:text-error transition-colors delete-goal-btn" data-id="${goal._id}">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
      <div class="mb-6">
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs font-bold text-on-surface-variant">Progress</span>
          <span class="text-xs font-bold text-tertiary">${goal.progress}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar__fill" style="width:${goal.progress}%"></div>
        </div>
      </div>
      ${goal.description ? `<p class="text-xs text-on-surface-variant italic">${truncate(goal.description, 100)}</p>` : ''}
    </div>
  `
}

export function reminderCard(reminder) {
  return `
    <div class="reminder-card" data-id="${reminder._id}">
      <div class="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
        <span class="material-symbols-outlined">notifications_active</span>
      </div>
      <div class="flex-1">
        <div class="flex justify-between items-start">
          <h4 class="font-bold text-lg text-on-surface">${reminder.title}</h4>
          ${reminder.recurring
            ? `<span class="badge badge--medium">${reminder.recurrenceType}</span>`
            : `<span class="badge badge--pending">Once</span>`}
        </div>
        ${reminder.notes ? `<p class="text-on-surface-variant text-sm mt-1">${reminder.notes}</p>` : ''}
        <div class="mt-4 flex items-center gap-4">
          <button class="text-xs font-bold text-primary flex items-center gap-1 mark-done-btn" data-id="${reminder._id}">
            <span class="material-symbols-outlined text-sm">check_circle</span> Mark Done
          </button>
          <button class="text-xs font-medium text-error flex items-center gap-1 delete-reminder-btn" data-id="${reminder._id}">
            <span class="material-symbols-outlined text-sm">delete</span> Delete
          </button>
        </div>
      </div>
    </div>
  `
}
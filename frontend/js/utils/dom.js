// DOM UTILITIES 
export const $ = (selector, parent = document) => parent.querySelector(selector)
export const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)]

export function showLoading(container, message = 'Loading...') {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12 text-on-surface-variant gap-2">
      <span class="material-symbols-outlined">progress_activity</span>
      <span class="text-sm">${message}</span>
    </div>
  `
}

export function showError(container, message = 'Something went wrong') {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12 text-error gap-2">
      <span class="material-symbols-outlined">error</span>
      <p class="text-sm font-medium">${message}</p>
    </div>
  `
}

export function showEmpty(container, message = 'Nothing here yet') {
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center py-12 text-on-surface-variant gap-3">
      <span class="material-symbols-outlined text-4xl opacity-40">inbox</span>
      <p class="text-sm font-medium">${message}</p>
    </div>
  `
}
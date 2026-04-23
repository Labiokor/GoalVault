import { getUser, clearAuth } from '../utils/helpers.js'

const root = document.getElementById('page-root')
const user = getUser()

function render() {
  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'

  root.innerHTML = `
    <div class="max-w-3xl mx-auto">

      <!-- Header -->
      <div class="mb-10">
        <p class="text-primary font-bold uppercase tracking-widest text-xs mb-2">Account</p>
        <h2 class="text-4xl font-extrabold font-headline text-on-surface tracking-tight">Settings</h2>
      </div>

      <!-- Profile Card -->
      <div class="bg-surface-container-lowest rounded-xl p-8 ring-1 ring-outline-variant/5 mb-6">
        <h3 class="text-lg font-bold font-headline mb-6">Profile</h3>

        <div class="flex items-center gap-6 mb-8">
          <div class="w-20 h-20 rounded-full vault-gradient flex items-center justify-center text-on-primary font-black text-3xl font-headline">
            ${initials}
          </div>
          <div>
            <p class="text-xl font-bold text-on-surface">${user.name || 'User'}</p>
            <p class="text-sm text-on-surface-variant">${user.email || ''}</p>
            <span class="badge badge--medium mt-2">Member</span>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="form-label">Full Name</label>
            <input class="form-input" id="profile-name" type="text" value="${user.name || ''}" placeholder="Your name">
          </div>
          <div>
            <label class="form-label">Email Address</label>
            <input class="form-input" id="profile-email" type="email" value="${user.email || ''}" placeholder="your@email.com" disabled
                   style="opacity:0.6;cursor:not-allowed">
            <p class="text-xs text-on-surface-variant mt-1">Email cannot be changed</p>
          </div>
          <div id="profile-msg" class="hidden text-sm font-medium"></div>
          <button class="btn btn-primary" id="save-profile-btn">Save Changes</button>
        </div>
      </div>

      <!-- Change Password -->
      <div class="bg-surface-container-lowest rounded-xl p-8 ring-1 ring-outline-variant/5 mb-6">
        <h3 class="text-lg font-bold font-headline mb-6">Change Password</h3>
        <div class="space-y-4">
          <div>
            <label class="form-label">Current Password</label>
            <input class="form-input" id="current-password" type="password" placeholder="••••••••">
          </div>
          <div>
            <label class="form-label">New Password</label>
            <input class="form-input" id="new-password" type="password" placeholder="••••••••">
          </div>
          <div>
            <label class="form-label">Confirm New Password</label>
            <input class="form-input" id="confirm-new-password" type="password" placeholder="••••••••">
          </div>
          <div id="password-msg" class="hidden text-sm font-medium"></div>
          <button class="btn btn-primary" id="change-password-btn">Update Password</button>
        </div>
      </div>

      <!-- App Preferences -->
      <div class="bg-surface-container-lowest rounded-xl p-8 ring-1 ring-outline-variant/5 mb-6">
        <h3 class="text-lg font-bold font-headline mb-6">Preferences</h3>
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
            <div>
              <p class="text-sm font-bold text-on-surface">Currency</p>
              <p class="text-xs text-on-surface-variant">Used across Finance module</p>
            </div>
            <select class="form-input w-32 text-sm" id="currency-select">
              <option value="GHS" selected>GHS (₵)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="NGN">NGN (₦)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="bg-error-container/10 rounded-xl p-8 border border-error/20">
        <h3 class="text-lg font-bold font-headline mb-2 text-error">Danger Zone</h3>
        <p class="text-sm text-on-surface-variant mb-6">These actions are irreversible. Please be certain.</p>
        <div class="flex flex-col sm:flex-row gap-4">
          <button class="btn bg-surface-container-lowest text-error border border-error/30 hover:bg-error/10"
                  id="logout-btn">
            <span class="material-symbols-outlined text-sm">logout</span>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  `

  // Save profile — local only for now (no update endpoint on backend)
  document.getElementById('save-profile-btn')?.addEventListener('click', () => {
    const name = document.getElementById('profile-name').value.trim()
    const msg = document.getElementById('profile-msg')

    if (!name) {
      showMsg(msg, 'Name cannot be empty', true)
      return
    }

    const updated = { ...user, name }
    localStorage.setItem('gv_user', JSON.stringify(updated))
    showMsg(msg, 'Profile updated successfully', false)

    // Update avatar in sidebar
    const avatar = document.querySelector('.avatar')
    if (avatar) avatar.textContent = name.charAt(0).toUpperCase()
  })

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to sign out?')) {
      clearAuth()
      window.location.href = '/login.html'
    }
  })

  // Password change — placeholder for when backend supports it
  document.getElementById('change-password-btn')?.addEventListener('click', () => {
    const current = document.getElementById('current-password').value
    const newPass = document.getElementById('new-password').value
    const confirm = document.getElementById('confirm-new-password').value
    const msg = document.getElementById('password-msg')

    if (!current || !newPass || !confirm) {
      showMsg(msg, 'All fields are required', true)
      return
    }

    if (newPass !== confirm) {
      showMsg(msg, 'New passwords do not match', true)
      return
    }

    if (newPass.length < 6) {
      showMsg(msg, 'Password must be at least 6 characters', true)
      return
    }

    showMsg(msg, 'Password change coming soon', false)
  })
}

function showMsg(el, message, isError) {
  el.textContent = message
  el.className = `text-sm font-medium ${isError ? 'text-error' : 'text-tertiary'}`
  el.classList.remove('hidden')
  setTimeout(() => el.classList.add('hidden'), 3000)
}

render()
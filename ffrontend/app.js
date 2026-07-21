// ============================================================
// GOAL VAULT — app.js  (unified — all pages)
// ============================================================

const API_BASE = 'http://localhost:5000';

async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('gv_token');
    const headers = { ...options.headers };
    
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body && !(options.body instanceof FormData) && typeof options.body !== 'string') {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }
    
    try {
        const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
        const data = await res.json().catch(() => ({}));
        
        if (res.status === 401) {
            localStorage.removeItem('gv_token');
            localStorage.removeItem('gv_user_name');
            window.location.href = 'login.html';
            return Promise.reject(data);
        }
        
        if (!res.ok) return Promise.reject(data);
        return data;
    } catch (err) {
        console.error('Network or server error:', err);
        return Promise.reject({ message: 'Network error or server unreachable.' });
    }
}

// ── Auth guard ───────────────────────────────────────────────
const gv_token = localStorage.getItem('gv_token');
if (!gv_token && !window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html';
} else if (gv_token && !window.location.pathname.includes('login.html')) {
    apiFetch('/api/auth/me')
        .then(res => {
            const userName = res.data?.name || res.user?.name;
            if (userName) {
                localStorage.setItem('gv_user_name', userName);
                const display = document.getElementById('usernameDisplay');
                if (display) display.textContent = userName;
            }
            updateNotifBadge();
        })
        .catch(() => {}); // 401 handles redirect automatically
}

let unreadCount = 0;
let notificationsData = [];

// ============================================================
// NOTIFICATION ENGINE
// ============================================================
const NOTIF_TYPES = {
    task:     { icon: '✅', label: 'Task'     },
    habit:    { icon: '🌱', label: 'Habit'    },
    reminder: { icon: '⏰', label: 'Reminder' },
    note:     { icon: '📝', label: 'Note'     },
    streak:   { icon: '🔥', label: 'Streak'   },
    system:   { icon: '⚙️', label: 'System'   },
    delete:   { icon: '🗑️', label: 'Deleted'  },
    goal:     { icon: '🎯', label: 'Goal'     },
};

function getRelativeTime(dateString) {
    const now = new Date();
    const then = new Date(dateString);
    if (isNaN(then)) return '';
    const diff = Math.round((now - then) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (then.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return then.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
}

function pushNotification(type, title, body) {
    // Frontend-only visual feedback via toast
    const icon = NOTIF_TYPES[type]?.icon || '🔔';
    showToast(`${icon} ${title}: ${body}`, 'info');
}

async function updateNotifBadge() {
    try {
        const res = await apiFetch('/api/notification/unread');
        const unreadNotifs = res.data || [];
        unreadCount = unreadNotifs.length;
        
        const badge = document.getElementById('notifNavBadge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.classList.add('visible');
            } else {
                badge.classList.remove('visible');
            }
        }
    } catch (err) {
        console.error('Failed to update notif badge:', err);
    }
}
function notifGroupLabel(dateStr) {
    const now     = new Date();
    const then    = new Date(dateStr);
    const today   = new Date(now.getFullYear(),  now.getMonth(),  now.getDate());
    const noteDay = new Date(then.getFullYear(), then.getMonth(), then.getDate());
    const diff    = Math.round((today - noteDay) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff <= 6)  return 'This Week';
    if (diff <= 30) return 'This Month';
    return 'Older';
}

function getLocalYYYYMMDD(dateObj = new Date()) {
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
}

/**
 * Derives the current daily streak from live habit API data.
 * A day "counts" if at least one habit was completed on it.
 * Walks backwards from today until it finds a gap.
 */
function computeStreakFromHabits(habitsArray) {
    if (!habitsArray || habitsArray.length === 0) return 0;

    // Build a Set of all dates that had at least 1 completion
    const activeDays = new Set();
    habitsArray.forEach(h => {
        (h.completedDates || []).forEach(d => {
            activeDays.add(getLocalYYYYMMDD(new Date(d)));
        });
    });

    let count = 0;
    const today = new Date();
    for (let i = 0; i <= 365; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = getLocalYYYYMMDD(d);
        if (activeDays.has(dateStr)) {
            count++;
        } else {
            // Allow today to be incomplete without breaking streak
            if (i === 0) continue;
            break;
        }
    }
    return count;
}

/**
 * Fetches habits from the API on every page load (silently)
 * and updates the global streak + nav icon so all pages stay in sync.
 */
async function syncStreakGlobally() {
    try {
        const token = localStorage.getItem('gv_token');
        if (!token) return; // not logged in yet
        const res = await apiFetch('/api/habits');
        if (res && res.data) {
            const computed = computeStreakFromHabits(res.data);
            streak = computed;
            localStorage.setItem('streak', computed);
            updateStreakDisplay();
        }
    } catch (e) {
        // Silently fail — streak stays at last cached value
    }
}

let reminderInterval;
let badgeInterval;

function initGlobals() {
    updateNotifBadge();
    autoSetNavActive();
    syncStreakGlobally(); // keep streak in sync on every page

    // Initial check & interval polling
    pollDueReminders();
    if (!reminderInterval) reminderInterval = setInterval(pollDueReminders, 30000);
    if (!badgeInterval) badgeInterval = setInterval(updateNotifBadge, 30000);
}
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initGlobals);
} else {
    initGlobals();
}

// ── Auto nav active state ─────────────────────────────────────
function autoSetNavActive() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-item a').forEach(link => {
        const href = link.getAttribute('href');
        const navItem = link.closest('.nav-item');
        if (!navItem) return;
        const isActive =
            href === currentPage ||
            (currentPage === '' && href === 'index.html') ||
            (currentPage === 'index.html' && href === 'index.html');
        navItem.classList.toggle('active', isActive);
    });
}

// ============================================================
// GLOBAL REMINDER CHECKER
// ============================================================
const shownReminders = new Set();

async function pollDueReminders() {
    try {
        const token = localStorage.getItem('gv_token');
        if (!token) return; // Wait until authenticated
        
        const res = await apiFetch('/api/reminders?completed=false');
        if (!res || !res.data) return;
        
        const now = new Date();
        res.data.forEach(reminder => {
            const reminderTime = new Date(reminder.datetime);
            const rId = reminder._id || reminder.id;
            
            if (reminderTime <= now && !shownReminders.has(rId)) {
                shownReminders.add(rId);
                
                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    try {
                        new Notification('⏰ Goal Vault Reminder', {
                            body: reminder.title,
                            icon: 'https://img.icons8.com/fluency/96/alarm.png',
                        });
                    } catch (e) { /* silent */ }
                }
                
                pushNotification('reminder', 'Reminder fired! ⏰', `Your reminder "${reminder.title}" is due now.`);
                showToast(`⏰ Reminder: ${reminder.title}`, 'warning');
            }
        });
    } catch (err) {
        // Silently fail for background polling to prevent noise
    }
}

function requestNotificationPermissionOnce() {
    if (typeof Notification === 'undefined') return; // Not supported in this context
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem('notifPermissionAsked')) return;
    Notification.requestPermission().then(permission => {
        localStorage.setItem('notifPermissionAsked', 'true');
        localStorage.setItem('notifPermission', permission);
    });
}
try { requestNotificationPermissionOnce(); } catch (e) { /* Notification API unavailable */ }

// ============================================================
// SHARED TOAST
// ============================================================
function showToast(message, type = 'success') {
    const existing = document.getElementById('appToast');
    if (existing) existing.remove();
    const colors = {
        success: { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
        error:   { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
        warning: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
        info:    { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
    };
    const c = colors[type] || colors.success;
    const toast = document.createElement('div');
    toast.id = 'appToast';
    toast.textContent = message;
    Object.assign(toast.style, {
        position: 'fixed', bottom: '90px', left: '50%',
        transform: 'translateX(-50%) translateY(20px)',
        background: c.bg, color: c.color, border: `1px solid ${c.border}`,
        padding: '12px 24px', borderRadius: '99px', fontSize: '0.88rem',
        fontWeight: '600', fontFamily: "'Inter', sans-serif",
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: '99999',
        opacity: '0', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        whiteSpace: 'nowrap', maxWidth: 'calc(100vw - 40px)', textAlign: 'center',
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================================
// CONFIRM DELETE MODAL
// ============================================================
function confirmDelete(message, onConfirm, options = {}) {
    const modal      = document.getElementById('confirmModal');
    const confirmMsg = document.getElementById('confirmMsg');
    const confirmBtn = document.getElementById('confirmDelete');
    const cancelBtn  = document.getElementById('confirmCancel');
    const iconEl     = document.querySelector('.confirm-icon');
    const titleEl    = document.querySelector('.confirm-title');

    if (!modal) { if (window.confirm(message)) onConfirm(); return; }

    confirmMsg.textContent      = message;
    confirmBtn.textContent      = options.confirmLabel || 'Delete';
    confirmBtn.style.background = options.btnColor     || '#ef4444';
    if (iconEl)  iconEl.textContent  = options.icon  || '🗑️';
    if (titleEl) titleEl.textContent = options.title || 'Are you sure?';

    modal.style.display          = 'flex';
    document.body.style.overflow = 'hidden';

    function closeModal() {
        modal.style.display          = 'none';
        document.body.style.overflow = '';
        confirmBtn.textContent       = 'Delete';
        confirmBtn.style.background  = '';
        if (iconEl)  iconEl.textContent  = '🗑️';
        if (titleEl) titleEl.textContent = 'Are you sure?';
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click',  handleCancel);
        document.removeEventListener('keydown', handleKey);
        modal.querySelector('.confirm-backdrop')?.removeEventListener('click', handleCancel);
    }

    function handleConfirm() { closeModal(); onConfirm(); }
    function handleCancel()  { closeModal(); }
    function handleKey(e) {
        if (e.key === 'Escape') handleCancel();
        if (e.key === 'Enter')  handleConfirm();
    }

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click',  handleCancel);
    document.addEventListener('keydown', handleKey);
    modal.querySelector('.confirm-backdrop')?.addEventListener('click', handleCancel);
}

// ── Logout ────────────────────────────────────────────────────
function logoutUser() {
    confirmDelete(
        'Are you sure you want to log out?',
        () => {
            localStorage.removeItem('gv_token');
            localStorage.removeItem('gv_user_name');
            localStorage.removeItem('hubUser');
            localStorage.removeItem('hubEmail');
            sessionStorage.removeItem('hubUser');
            sessionStorage.removeItem('hubEmail');
            window.location.href = 'login.html';
        },
        { icon: '👋', title: 'Log Out?', confirmLabel: 'Log Out', btnColor: '#0e1420' }
    );
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);

// ── Dark mode ─────────────────────────────────────────────────
const darkModeBtn = document.getElementById('darkModeBtn');
if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark');
if (darkModeBtn) {
    darkModeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        localStorage.setItem('darkMode', document.body.classList.contains('dark'));
    });
}

// ── Streak state ──────────────────────────────────────────────
let streak        = parseInt(localStorage.getItem('streak')) || 0;
let lastStreakDate = localStorage.getItem('lastStreakDate')   || null;

const streakCount   = document.querySelector('#streakMenu .streak-count');
const streakIcon    = document.querySelector('#streakMenu .streak-icon');
const streakTooltip = document.querySelector('#streakMenu .streak-tooltip');

function getTodayString() { return new Date().toISOString().split('T')[0]; }
function getYesterdayString() {
    const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0];
}

function updateStreakDisplay() {
    if (streakCount)   streakCount.textContent = streak;
    if (streakTooltip) streakTooltip.textContent = `Current streak: ${streak} day${streak === 1 ? '' : 's'}`;
    localStorage.setItem('streak', streak);
    updateStreakPanel();
}

function updateStreakPanel() {
    const streakTitle = document.getElementById('streakTitle');
    const streakBadge = document.getElementById('streakBadge');
    const streakDots  = document.getElementById('streakDots');
    const streakNote  = document.getElementById('streakNote');
    if (!streakTitle) return;
    streakTitle.innerHTML = `${streak}-Day Winning<br>Streak`;
    let badge = '🔥 KEEP GOING';
    if (streak >= 7)  badge = '🔥 CONSISTENT';
    if (streak >= 14) badge = '🔥 MASTER CONSISTENCY';
    if (streak >= 21) badge = '🔥 UNSTOPPABLE';
    if (streak >= 30) badge = '🏆 LEGEND';
    streakBadge.textContent = badge;
    const total = 18;
    streakDots.innerHTML = '';
    for (let i = 0; i < total; i++) {
        const dot = document.createElement('div');
        dot.classList.add('dot', i < streak ? 'filled' : 'empty');
        streakDots.appendChild(dot);
    }
    const milestones = [7, 14, 21, 30, 60, 100];
    const next = milestones.find(m => m > streak);
    streakNote.textContent = next
        ? `${next - streak} day${next - streak === 1 ? '' : 's'} until your next major badge!`
        : '🏆 You are a legend! Keep the streak alive!';
}

function pulseStreakIcon() {
    if (!streakIcon) return;
    streakIcon.classList.add('pulse');
    setTimeout(() => streakIcon.classList.remove('pulse'), 500);
}

function increaseStreak() {
    const today     = getTodayString();
    const yesterday = getYesterdayString();
    if (lastStreakDate === today) return;
    if (lastStreakDate && lastStreakDate !== yesterday) {
        streak = 1;
        pushNotification('streak', 'Streak reset 😔', 'You missed a day. Your streak has been reset to 1. Get back on track!');
    } else {
        streak++;
        const milestones = [3, 7, 14, 21, 30, 60, 100];
        if (milestones.includes(streak)) {
            const msgs = {
                3: "3 days in! You're building momentum. Keep going! 💪",
                7: "One full week! You're officially consistent. 🌟",
                14: "Two weeks strong! Halfway to a habit. 🔥",
                21: "21 days — science says this is now a habit! 🧠",
                30: "30-day streak! You're on fire! 🏆",
                60: "60 days! You are absolutely unstoppable! ⚡",
                100: "100 DAYS! You are a Goal Vault legend! 🏅",
            };
            pushNotification('streak', `${streak}-day streak! 🔥`, msgs[streak] || `Amazing! ${streak} days in a row!`);
        }
    }
    lastStreakDate = today;
    localStorage.setItem('lastStreakDate', lastStreakDate);
    updateStreakDisplay();
    pulseStreakIcon();
}

function checkStreakIntegrity() {
    const today     = getTodayString();
    const yesterday = getYesterdayString();
    if (lastStreakDate && lastStreakDate !== today && lastStreakDate !== yesterday) {
        streak = 0;
        localStorage.setItem('streak', 0);
        updateStreakDisplay();
    }
}

// checkStreakIntegrity(); // Disabled, we now compute streak via live API
updateStreakDisplay();

// ── Page detection ────────────────────────────────────────────
const page = (() => {
    const p = window.location.pathname.split('/').pop() || 'index.html';
    if (p === '' || p === 'index.html')   return 'dashboard';
    if (p === 'planner.html')             return 'planner';
    if (p === 'tasks.html')               return 'tasks';
    if (p === 'habits.html')              return 'habits';
    if (p === 'notebook.html')            return 'notebook';
    if (p === 'account.html')             return 'account';
    if (p === 'notifications.html')       return 'notifications';
    if (p === 'alerts.html')              return 'alerts';
    if (p === 'reminders.html')           return 'reminders';
    return 'dashboard';
})();

// ── Shared data helpers ───────────────────────────────────────
function getTasks()     { return JSON.parse(localStorage.getItem('tasks'))     || []; }
function getHabits()    { return JSON.parse(localStorage.getItem('habits'))    || []; }

let tasks  = getTasks();
let habits = getHabits();

function checkDailyCompletion() {
    const freshTasks  = getTasks();
    const freshHabits = getHabits();
    const tasksOk     = freshTasks.length  === 0 || freshTasks.every(t  => t.status === 'completed');
    const habitsOk    = freshHabits.length === 0 || freshHabits.every(h => h.done);
    const hasData     = freshTasks.length  > 0   || freshHabits.length > 0;
    if (hasData && tasksOk && habitsOk) {
        const todayStr = getTodayString();
        localStorage.setItem(`completed_${todayStr}`, 'true');
        increaseStreak();
    }
}

// ============================================================
// REMINDERS PAGE
// ============================================================
if (page === 'reminders') {
    (function () {
        let remindersData = [];
        let editingReminderId = null;
        let snoozeTargetId = null;
        let currentCat = 'personal';
        let currentFreq = 'once';
        let currentColor = '#7c3aed';

        const CAT_CONFIG = {
            personal: { icon: '🙂', label: 'Personal', color: '#7c3aed' },
            work:     { icon: '💼', label: 'Work',     color: '#3b82f6' },
            health:   { icon: '💪', label: 'Health',   color: '#10b981' },
            finance:  { icon: '💰', label: 'Finance',  color: '#f59e0b' },
            goal:     { icon: '🎯', label: 'Goal',     color: '#ef4444' },
            default:  { icon: '🔔', label: 'General',  color: '#7c3aed' },
        };

        const FREQ_LABELS = {
            once: 'Once', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
        };

        async function fetchReminders() {
            const list = document.getElementById('remList');
            if (list) list.innerHTML = `<div class="loading-state" style="text-align:center;padding:40px;color:#888;">Loading reminders...</div>`;
            try {
                const res = await apiFetch('/api/reminders');
                if (res.data) {
                    remindersData = res.data.map(r => ({ ...r, id: r._id }));
                    renderReminders();
                }
            } catch (err) {
                console.error('Failed to fetch reminders:', err);
                showToast('Failed to load reminders', 'error');
            }
        }

        function formatReminderDate(dateStr) {
            const d = new Date(dateStr);
            const options = { weekday: 'long', month: 'long', day: 'numeric' };
            const datePart = d.toLocaleDateString('en-US', options);
            const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            return `${datePart} at ${timePart}`;
        }

        function countdownText(timeStr) {
            const now = new Date();
            const then = new Date(timeStr);
            const diff = then - now;
            if (diff <= 0) {
                const ago = Math.abs(diff);
                if (ago < 60000) return 'due now';
                if (ago < 3600000) return `${Math.floor(ago / 60000)}m overdue`;
                if (ago < 86400000) return `${Math.floor(ago / 3600000)}h overdue`;
                return `${Math.floor(ago / 86400000)}d overdue`;
            }
            if (diff < 3600000) return `in ${Math.floor(diff / 60000)}m`;
            if (diff < 86400000) return `in ${Math.floor(diff / 3600000)}h`;
            if (diff < 604800000) return `in ${Math.floor(diff / 86400000)}d`;
            return `in ${Math.floor(diff / 604800000)}w`;
        }

        function buildReminderItem(r) {
            const cat = CAT_CONFIG[r.category] || CAT_CONFIG.default;
            const formattedDate = formatReminderDate(r.datetime);
            const freqLabel = FREQ_LABELS[r.recurrenceType] || 'Once';
            
            const now = new Date();
            const rDate = new Date(r.datetime);
            
            let color = r.color || cat.color;
            let stateClass = '';
            let overdue = false;
            let dueSoon = false;
            
            if (r.completed) {
                stateClass = 'rem-completed';
                color = '#22c55e'; // Green
            } else if (rDate < now) {
                stateClass = 'rem-overdue';
                overdue = true;
                color = '#ef4444'; // Red
            } else if (rDate - now <= 2 * 60 * 60 * 1000) {
                stateClass = 'rem-due-soon';
                dueSoon = true;
                color = '#f59e0b'; // Amber
            }

            const item = document.createElement('div');
            item.className = `rem-card ${stateClass}`;
            item.style.setProperty('--rem-color', color);

            item.innerHTML = `
                <div class="rem-card-accent" style="background:${color};"></div>
                <div class="rem-card-icon" style="background:${color}22;color:${color};">
                    ${cat.icon}
                </div>
                <div class="rem-card-body">
                    <div class="rem-card-top">
                        <div class="rem-card-title" style="${r.completed ? 'text-decoration:line-through;opacity:0.6;' : ''}">${r.title}</div>
                        <div class="rem-card-badges">
                            <span class="rem-badge cat-badge" style="background:${color}18;color:${color};border-color:${color}33;">
                                ${cat.label}
                            </span>
                            ${r.recurring ? `<span class="rem-badge freq-badge">
                                <i class="fa-solid fa-rotate"></i> Repeats ${r.recurrenceType}
                            </span>` : ''}
                            ${overdue ? `<span class="rem-badge overdue-badge">
                                <i class="fa-solid fa-triangle-exclamation"></i> Overdue
                            </span>` : ''}
                            ${dueSoon ? `<span class="rem-badge due-soon-badge">
                                <i class="fa-solid fa-clock"></i> Due Soon
                            </span>` : ''}
                        </div>
                    </div>
                    ${r.notes ? `<div class="rem-card-note">${r.notes}</div>` : ''}
                    <div class="rem-card-meta">
                        <span class="rem-card-date">
                            <i class="fa-solid fa-calendar-day"></i> ${formattedDate}
                        </span>
                        ${!r.completed ? `
                        <span class="rem-card-countdown ${overdue ? 'overdue' : ''}">
                            <i class="fa-solid fa-${overdue ? 'circle-exclamation' : 'clock'}"></i>
                            ${countdownText(r.datetime)}
                        </span>` : ''}
                    </div>
                </div>
                <div class="rem-card-actions">
                    ${!r.completed ? `
                    <button class="rem-action-btn done-btn" data-id="${r.id}" title="Mark complete">
                        <i class="fa-solid fa-check"></i>
                    </button>
                    <button class="rem-action-btn snooze-btn" data-id="${r.id}" title="Snooze">
                        <i class="fa-solid fa-clock"></i>
                    </button>` : ''}
                    <button class="rem-action-btn edit-btn" data-id="${r.id}" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="rem-action-btn delete-btn" data-id="${r.id}" title="Delete">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `;

            item.querySelector('.done-btn')?.addEventListener('click', () => markComplete(r.id));
            item.querySelector('.snooze-btn')?.addEventListener('click', () => {
                snoozeTargetId = r.id;
                document.getElementById('snoozeReminderName').textContent = `"${r.title}"`;
                openOverlay('snoozeModalOverlay');
            });
            item.querySelector('.edit-btn').addEventListener('click', () => openEditModal(r));
            item.querySelector('.delete-btn').addEventListener('click', () => {
                confirmDelete(`Delete "${r.title}"?`, () => deleteReminder(r.id));
            });

            return item;
        }

        function renderReminders() {
            const list = document.getElementById('remList');
            if (!list) return;

            // Sort: incomplete ASC, completed DESC
            const sorted = [...remindersData].sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                const timeA = new Date(a.datetime).getTime();
                const timeB = new Date(b.datetime).getTime();
                return a.completed ? timeB - timeA : timeA - timeB;
            });

            const upcoming = sorted.filter(r => !r.completed);
            const completed = sorted.filter(r => r.completed);

            list.innerHTML = '';

            // Stats Update
            const overdueCount = upcoming.filter(r => new Date(r.datetime) < new Date()).length;
            document.getElementById('statUpcoming').textContent = upcoming.length;
            document.getElementById('statOverdue').textContent = overdueCount;
            document.getElementById('statCompleted').textContent = completed.length;
            document.getElementById('tabBadgeUpcoming').textContent = upcoming.length;
            document.getElementById('tabBadgeOverdue').textContent = overdueCount;
            document.getElementById('tabBadgeCompleted').textContent = completed.length;

            const nextEl = document.getElementById('statNext');
            if (upcoming.length > 0) {
                const soonest = upcoming[0];
                nextEl.textContent = countdownText(soonest.datetime);
            } else {
                nextEl.textContent = '—';
            }

            // Upcoming Section
            const upSec = document.createElement('div');
            upSec.className = 'rem-section-wrap';
            upSec.innerHTML = '<h3 class="rem-section-title"><i class="fa-solid fa-clock"></i> Upcoming</h3>';
            const upList = document.createElement('div');
            upList.className = 'rem-sub-list';
            if (upcoming.length === 0) {
                upList.innerHTML = '<div class="rem-empty-sub">No upcoming reminders</div>';
            } else {
                upcoming.forEach(r => upList.appendChild(buildReminderItem(r)));
            }
            upSec.appendChild(upList);
            list.appendChild(upSec);

            // Completed Section
            const compSec = document.createElement('div');
            compSec.className = 'rem-section-wrap';
            compSec.innerHTML = '<h3 class="rem-section-title"><i class="fa-solid fa-circle-check"></i> Completed</h3>';
            const compList = document.createElement('div');
            compList.className = 'rem-sub-list';
            if (completed.length === 0) {
                compList.innerHTML = '<div class="rem-empty-sub">No completed reminders yet</div>';
            } else {
                completed.forEach(r => compList.appendChild(buildReminderItem(r)));
            }
            compSec.appendChild(compList);
            list.appendChild(compSec);
        }

        async function saveReminder() {
            const title = document.getElementById('remLabelInput').value.trim();
            const date = document.getElementById('remDateInput').value;
            const time = document.getElementById('remTimeInput').value;
            const notes = document.getElementById('remNoteInput').value.trim();
            const recurring = currentFreq !== 'once';
            const recurrenceType = recurring ? currentFreq : null;

            if (!title) {
                document.getElementById('remLabelError').classList.add('visible');
                return;
            }
            if (!date || !time) {
                document.getElementById('remDateTimeError').classList.add('visible');
                return;
            }

            const datetime = `${date}T${time}`;
            if (!editingReminderId && new Date(datetime) < new Date()) {
                document.getElementById('remDateTimeError').textContent = 'Please select a future date and time.';
                document.getElementById('remDateTimeError').classList.add('visible');
                return;
            }

            const body = { title, datetime, notes, recurring, recurrenceType, category: currentCat, color: currentColor };

            try {
                let res;
                if (editingReminderId) {
                    res = await apiFetch(`/api/reminders/${editingReminderId}`, {
                        method: 'PATCH',
                        body
                    });
                } else {
                    res = await apiFetch('/api/reminders', {
                        method: 'POST',
                        body
                    });
                }

                if (res.success) {
                    const saved = { ...res.data, id: res.data._id };
                    if (editingReminderId) {
                        const idx = remindersData.findIndex(r => r.id === editingReminderId);
                        if (idx !== -1) remindersData[idx] = saved;
                        showToast('Reminder updated', 'success');
                    } else {
                        remindersData.push(saved);
                        showToast('Reminder set! 🔔', 'success');
                        pushNotification('reminder', 'Reminder set 🔔', `"${title}" scheduled.`);
                    }
                    closeOverlay('reminderModalOverlay');
                    resetModal();
                    renderReminders();
                }
            } catch (err) {
                console.error('Save failed:', err);
                showToast(err.message || 'Failed to save reminder', 'error');
            }
        }

        async function markComplete(id) {
            try {
                const res = await apiFetch(`/api/reminders/${id}`, {
                    method: 'PATCH',
                    body: { completed: true }
                });
                if (res.success) {
                    const idx = remindersData.findIndex(r => r.id === id);
                    if (idx !== -1) remindersData[idx].completed = true;
                    renderReminders();
                    showToast('Reminder completed ✓', 'success');
                }
            } catch (err) {
                console.error('Update failed:', err);
                showToast('Failed to mark complete', 'error');
            }
        }

        async function snoozeReminder(minutes) {
            if (!snoozeTargetId) return;
            const r = remindersData.find(x => x.id === snoozeTargetId);
            if (!r) return;
            const newTime = new Date();
            newTime.setMinutes(newTime.getMinutes() + minutes);
            try {
                const res = await apiFetch(`/api/reminders/${snoozeTargetId}`, {
                    method: 'PATCH',
                    body: { datetime: newTime.toISOString(), completed: false }
                });
                if (res.success) {
                    const saved = { ...res.data, id: res.data._id };
                    const idx = remindersData.findIndex(x => x.id === snoozeTargetId);
                    if (idx !== -1) remindersData[idx] = saved;
                    renderReminders();
                    showToast('Snoozed', 'info');
                    closeOverlay('snoozeModalOverlay');
                    snoozeTargetId = null;
                }
            } catch (err) {
                showToast('Failed to snooze', 'error');
            }
        }

        async function deleteReminder(id) {
            try {
                const res = await apiFetch(`/api/reminders/${id}`, { method: 'DELETE' });
                if (res.success) {
                    remindersData = remindersData.filter(r => r.id !== id);
                    renderReminders();
                    showToast('Reminder deleted', 'error');
                }
            } catch (err) {
                console.error('Delete failed:', err);
                showToast('Failed to delete', 'error');
            }
        }

        function openEditModal(r) {
            editingReminderId = r.id;
            document.getElementById('reminderModalTitle').innerHTML = '<i class="fa-solid fa-pen"></i> Edit Reminder';
            document.getElementById('remLabelInput').value = r.title;
            document.getElementById('remNoteInput').value = r.notes || '';
            
            const dt = new Date(r.datetime);
            // Account for local timezone when populating datetime inputs
            const year = dt.getFullYear();
            const month = String(dt.getMonth() + 1).padStart(2, '0');
            const day = String(dt.getDate()).padStart(2, '0');
            const hours = String(dt.getHours()).padStart(2, '0');
            const mins = String(dt.getMinutes()).padStart(2, '0');
            
            document.getElementById('remDateInput').value = `${year}-${month}-${day}`;
            document.getElementById('remTimeInput').value = `${hours}:${mins}`;

            currentCat = r.category || 'personal';
            currentColor = r.color || '#7c3aed';
            currentFreq = r.recurrenceType || 'once';

            updatePickers();
            openOverlay('reminderModalOverlay');
        }

        function resetModal() {
            editingReminderId = null;
            document.getElementById('reminderModalTitle').innerHTML = '<i class="fa-solid fa-bell"></i> New Reminder';
            document.getElementById('remLabelInput').value = '';
            document.getElementById('remNoteInput').value = '';
            document.getElementById('remDateInput').value = new Date().toISOString().split('T')[0];
            document.getElementById('remTimeInput').value = '';
            document.getElementById('remLabelError').classList.remove('visible');
            document.getElementById('remDateTimeError').classList.remove('visible');
            currentCat = 'personal';
            currentFreq = 'once';
            currentColor = '#7c3aed';
            updatePickers();
        }

        function updatePickers() {
            document.querySelectorAll('.rem-cat-btn').forEach(b => b.classList.toggle('active-cat', b.dataset.cat === currentCat));
            document.querySelectorAll('.rem-color-btn').forEach(b => b.classList.toggle('active-color', b.dataset.color === currentColor));
            document.querySelectorAll('#remFreqPicker .goal-freq-btn').forEach(b => b.classList.toggle('active-freq', b.dataset.freq === currentFreq));
        }

        function openOverlay(id) {
            document.getElementById(id)?.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        function closeOverlay(id) {
            document.getElementById(id)?.classList.remove('active');
            document.body.style.overflow = '';
        }

        // Listeners
        document.getElementById('saveReminderBtn')?.addEventListener('click', saveReminder);
        document.getElementById('openReminderModal')?.addEventListener('click', () => { resetModal(); openOverlay('reminderModalOverlay'); });
        document.getElementById('closeReminderModal')?.addEventListener('click', () => { closeOverlay('reminderModalOverlay'); resetModal(); });
        document.getElementById('closeSnoozeModal')?.addEventListener('click', () => { closeOverlay('snoozeModalOverlay'); snoozeTargetId = null; });

        document.querySelectorAll('.rem-cat-btn').forEach(btn => btn.addEventListener('click', function() { currentCat = this.dataset.cat; updatePickers(); }));
        document.querySelectorAll('.rem-color-btn').forEach(btn => btn.addEventListener('click', function() { currentColor = this.dataset.color; updatePickers(); }));
        document.querySelectorAll('#remFreqPicker .goal-freq-btn').forEach(btn => btn.addEventListener('click', function() { currentFreq = this.dataset.freq; updatePickers(); }));
        document.querySelectorAll('.rem-snooze-btn').forEach(btn => btn.addEventListener('click', function() { snoozeReminder(parseInt(this.dataset.snooze)); }));

        ['reminderModalOverlay', 'snoozeModalOverlay'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', function (e) {
                if (e.target === this) {
                    closeOverlay(id);
                    if (id === 'reminderModalOverlay') resetModal();
                    if (id === 'snoozeModalOverlay') snoozeTargetId = null;
                }
            });
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeOverlay('reminderModalOverlay');
                closeOverlay('snoozeModalOverlay');
                resetModal();
            }
        });

        fetchReminders();
    })();
}

// ============================================================
// DASHBOARD PAGE
// ============================================================
if (page === 'dashboard') {

    function badgeText(s) {
        if (s >= 100) return '🏆 LEGEND';
        if (s >= 60)  return '⚡ UNSTOPPABLE';
        if (s >= 30)  return '🌟 ON FIRE';
        if (s >= 21)  return '🚀 MASTER';
        if (s >= 14)  return '💪 CONSISTENT';
        if (s >= 7)   return '✨ BUILDING MOMENTUM';
        return '🎯 KEEP GOING';
    }

    function buildDots(streakVal) {
        const grid = document.getElementById('streakDotsGrid');
        if (!grid) return;
        grid.innerHTML = '';
        for (let i = 0; i < 21; i++) {
            const d = document.createElement('div');
            d.className = 's-dot' + (i < streakVal ? ' lit' : '');
            grid.appendChild(d);
        }
    }
    function updateRing(streakVal) {
        const milestones = [7, 14, 21, 30, 60, 100];
        const prev       = milestones.filter(m => m <= streakVal).pop() || 0;
        const next       = milestones.find(m  => m  > streakVal)        || 100;
        const pct        = Math.round(((streakVal - prev) / (next - prev)) * 100);
        const circ       = 188.5;
        const ringFill   = document.getElementById('ringFill');
        const ringPct    = document.getElementById('ringPct');
        if (ringFill) ringFill.style.strokeDashoffset = circ - (pct / 100) * circ;
        if (ringPct)  ringPct.textContent = pct + '%';
    }

    function renderDateLine() {
        const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const now    = new Date();
        const el     = document.getElementById('dashDate');
        if (el) el.textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
    }

    async function refreshDash() {
        const results = await Promise.allSettled([
            apiFetch('/api/goals'),
            apiFetch('/api/habits'),
            apiFetch('/api/tasks'),
            apiFetch('/api/reminders?completed=false'),
            apiFetch('/api/notes')
        ]);

        const [goalsRes, habitsRes, tasksRes, remindersRes, notesRes] = results;

        let totalDone = 0;
        let totalItems = 0;

        // Process Goals
        if (goalsRes.status === 'fulfilled') {
            const goals = goalsRes.value.data || [];
            const activeGoals = goals.filter(g => g.status === 'active');
            const readyToComplete = activeGoals.filter(g => g.progress === 100);
            const nudge = document.getElementById('goalNudge');
            if (nudge) {
                if (readyToComplete.length > 0) {
                    nudge.textContent = `You have ${readyToComplete.length} goal${readyToComplete.length > 1 ? 's' : ''} ready to mark complete! 🎯`;
                    nudge.style.display = 'block';
                } else if (activeGoals.length === 0) {
                    nudge.textContent = `No active goals? Time to set a new vision! 🗺️`;
                    nudge.style.display = 'block';
                } else {
                    nudge.style.display = 'none';
                }
            }
            const dashGoalsNum = document.getElementById('dashGoalsNum');
            if (dashGoalsNum) dashGoalsNum.textContent = activeGoals.length;
        }

        // Process Habits
        if (habitsRes.status === 'fulfilled') {
            const habits = habitsRes.value.data || [];
            const today = getLocalYYYYMMDD();
            const doneToday = habits.filter(h =>
                (h.completedDates || []).some(d => getLocalYYYYMMDD(new Date(d)) === today)
            ).length;
            const habitPct = habits.length === 0 ? 0 : Math.round((doneToday / habits.length) * 100);
            
            totalDone += doneToday;
            totalItems += habits.length;

            const dashHabitsNum = document.getElementById('dashHabitsNum');
            const habitTrend = document.getElementById('habitTrend');
            if (dashHabitsNum) dashHabitsNum.textContent = `${doneToday}/${habits.length}`;
            if (habitTrend) {
                habitTrend.textContent = habitPct === 100 ? '✓ All done' : habitPct > 0 ? `${habitPct}% done` : 'Not started';
                habitTrend.className = 'stat-trend ' + (habitPct === 100 ? 'up' : habitPct > 0 ? 'warn' : 'neu');
            }
        }

        // Process Tasks
        if (tasksRes.status === 'fulfilled') {
            const tasks = tasksRes.value.data || [];
            const remaining = tasks.filter(t => t.status !== 'done').length;
            const done = tasks.length - remaining;
            
            totalDone += done;
            totalItems += tasks.length;

            const dashTasksNum = document.getElementById('dashTasksNum');
            const taskTrend = document.getElementById('taskTrend');
            if (dashTasksNum) dashTasksNum.textContent = remaining;
            if (taskTrend) {
                taskTrend.textContent = remaining === 0 ? '✓ All clear' : `${remaining} left`;
                taskTrend.className = 'stat-trend ' + (remaining === 0 ? 'up' : 'warn');
            }
        }

        // Process Reminders
        if (remindersRes.status === 'fulfilled') {
            const activeReminders = remindersRes.value.data || [];
            const dashRemindersNum = document.getElementById('dashRemindersNum');
            const dashRemindersSub = document.getElementById('dashRemindersSub');
            const reminderTrend = document.getElementById('reminderTrend');
            const reminderCount = activeReminders.length;

            if (dashRemindersNum) dashRemindersNum.textContent = reminderCount;
            if (dashRemindersSub) dashRemindersSub.textContent = reminderCount === 0 ? 'no active reminders' : 'upcoming';
            
            const sorted = [...activeReminders].sort((a, b) => new Date(a.time) - new Date(b.time));

            if (reminderTrend) {
                if (reminderCount === 0) {
                    reminderTrend.textContent = 'None set';
                    reminderTrend.className = 'stat-trend neu';
                } else {
                    const nextReminder = sorted[0];
                    const hoursLeft = Math.round((new Date(nextReminder.time) - new Date()) / (1000 * 60 * 60));
                    if (hoursLeft < 1) {
                        reminderTrend.textContent = 'Soon!';
                        reminderTrend.className = 'stat-trend warn';
                    } else if (hoursLeft < 24) {
                        reminderTrend.textContent = `${hoursLeft}h left`;
                        reminderTrend.className = 'stat-trend warn';
                    } else {
                        reminderTrend.textContent = `${Math.round(hoursLeft / 24)}d left`;
                        reminderTrend.className = 'stat-trend up';
                    }
                }
            }

            const reminderList = document.getElementById('dashReminderList');
            if (reminderList) {
                const limit = sorted.slice(0, 5);
                reminderList.innerHTML = limit.length === 0 
                    ? '<p class="empty-state">No upcoming reminders</p>' 
                    : limit.map(r => `
                        <div class="dash-item">
                            <span class="dash-item-icon">⏰</span>
                            <div class="dash-item-info">
                                <div class="dash-item-title">${r.title}</div>
                                <div class="dash-item-time">${new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        </div>
                    `).join('');
            }
        }

        // Process Notes
        if (notesRes.status === 'fulfilled') {
            const notes = notesRes.value.data || [];
            const dashNotesNum = document.getElementById('dashNotesNum');
            const notesTrend = document.getElementById('notesTrend');
            if (dashNotesNum) dashNotesNum.textContent = notes.length;
            if (notesTrend) {
                notesTrend.textContent = 'Updated';
                notesTrend.className = 'stat-trend up';
            }
        }

        // Global Progress
        const globalProgressText = document.getElementById('globalProgressText');
        const globalProgressFill = document.getElementById('globalProgressFill');
        if (globalProgressText) globalProgressText.textContent = `${totalDone} / ${totalItems} done`;
        if (globalProgressFill) {
            const pct = totalItems === 0 ? 0 : Math.round((totalDone / totalItems) * 100);
            globalProgressFill.style.width = pct + '%';
        }

        // Global UI updates (Streaks)
        const habitsForStreak = (habitsRes.status === 'fulfilled' && habitsRes.value.data) ? habitsRes.value.data : [];
        const streakVal = computeStreakFromHabits(habitsForStreak);
        streak = streakVal; // Update global state
        localStorage.setItem('streak', streakVal);
        updateStreakDisplay();
        
        const userName = localStorage.getItem('gv_user_name') || 'User';

        const usernameDisplay = document.getElementById('usernameDisplay');
        if (usernameDisplay) usernameDisplay.textContent = userName;

        const heroStreakNum = document.getElementById('heroStreakNum');
        const heroStreakBadge = document.getElementById('heroStreakBadge');
        if (heroStreakNum) heroStreakNum.textContent = streakVal;
        if (heroStreakBadge) heroStreakBadge.textContent = badgeText(streakVal);

        buildDots(Math.min(streakVal, 21));
        updateRing(streakVal);
    }

    function initDash() {
        renderDateLine();
        refreshDash();
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initDash);
    } else {
        initDash();
    }
}

// ============================================================
// TASKS PAGE
// ============================================================
if (page === 'tasks') {
    // ── Data helpers ──────────────────────────────────────────
    let tasksData = [];
    let editingTaskId = null;
    let activeFilter = 'all';

    const priorityLabels = {
        high:   { label: 'High',   class: 'priority-high' },
        medium: { label: 'Medium', class: 'priority-medium' },
        low:    { label: 'Low',    class: 'priority-low' }
    };

    async function fetchTasks() {
        const lists = ['todo-list', 'doing-list', 'done-list'];
        lists.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<div class="task-empty-msg">Loading...</div>`;
        });
        try {
            const res = await apiFetch('/api/tasks');
            if (res.data) {
                tasksData = res.data.map(t => ({ ...t, id: t._id }));
                renderTasks();
            }
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
            const board = document.querySelector('.kanban-board');
            if (board) board.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 40px;">Failed to load tasks. Please try again.</div>`;
        }
    }

    function getCountdownText(deadline) {
        if (!deadline) return '';
        const now  = new Date(); now.setHours(0, 0, 0, 0);
        const due  = new Date(deadline);
        const diff = Math.round((due - now) / (1000 * 60 * 60 * 24));
        if (diff < 0)   return `Overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'}`;
        if (diff === 0) return 'Due today!';
        return `${diff} day${diff === 1 ? '' : 's'} left`;
    }

    function updateTaskProgress() {
        const totalT = tasksData.length;
        const doneT  = tasksData.filter(t => t.status === 'done').length;
        const taskPct = totalT === 0 ? 0 : Math.round((doneT / totalT) * 100);
        const taskBar = document.getElementById('taskProgressBar');
        const taskCount = document.getElementById('taskProgressCount');
        if (taskBar) {
            taskBar.style.width = taskPct + '%';
            taskBar.textContent = taskPct + '%';
        }
        if (taskCount) taskCount.textContent = `${doneT} of ${totalT} completed`;
    }

    function renderTasks() {
        const todoList = document.getElementById('todo-list');
        const doingList = document.getElementById('doing-list');
        const doneList = document.getElementById('done-list');

        if (!todoList || !doingList || !doneList) return;

        todoList.innerHTML = '';
        doingList.innerHTML = '';
        doneList.innerHTML = '';

        const filteredTasks = activeFilter === 'all' 
            ? tasksData 
            : tasksData.filter(t => t.category === activeFilter);

        const groups = {
            todo: filteredTasks.filter(t => t.status === 'todo'),
            doing: filteredTasks.filter(t => t.status === 'doing'),
            done: filteredTasks.filter(t => t.status === 'done')
        };

        Object.keys(groups).forEach(status => {
            const list = document.getElementById(`${status}-list`);
            const countEl = document.querySelector(`#col-${status} .column-count`);
            if (countEl) countEl.textContent = groups[status].length;

            if (groups[status].length === 0) {
                list.innerHTML = `<div class="task-empty-msg">No tasks here</div>`;
            } else {
                groups[status].forEach(task => {
                    list.appendChild(buildTaskItem(task));
                });
            }
        });

        updateTaskProgress();
    }

    function buildTaskItem(task) {
        const card = document.createElement('div');
        card.className = `task-card ${task.priority} ${task.status === 'done' ? 'done' : ''}`;
        card.dataset.id = task.id;

        const priorityInfo = priorityLabels[task.priority] || priorityLabels.medium;
        const countdown = getCountdownText(task.deadline);
        const overdueClass = countdown.startsWith('Overdue') ? 'overdue' : '';
        
        const desc = task.description || '';
        const truncatedDesc = desc.length > 100 ? desc.substring(0, 100) + '...' : desc;

        let moveBtns = '';
        if (task.status === 'todo') {
            moveBtns = `<button class="task-btn move-doing" data-id="${task.id}">Start</button>`;
        } else if (task.status === 'doing') {
            moveBtns = `
                <button class="task-btn move-todo" data-id="${task.id}">Back</button>
                <button class="task-btn move-done" data-id="${task.id}">Finish</button>
            `;
        } else if (task.status === 'done') {
            moveBtns = `<button class="task-btn move-doing" data-id="${task.id}">Reopen</button>`;
        }

        card.innerHTML = `
            <div class="task-card-header">
                <div class="task-card-title">${task.title}</div>
                <div class="task-badge ${priorityInfo.class}">${priorityInfo.label}</div>
            </div>
            ${truncatedDesc ? `<div class="task-card-desc">${truncatedDesc}</div>` : ''}
            <div class="task-card-meta">
                ${task.deadline ? `<div class="task-card-deadline ${overdueClass}"><i class='bx bx-calendar'></i> ${new Date(task.deadline).toLocaleDateString()}</div>` : ''}
                <div class="task-category-badge ${task.category || 'general'}">${task.category || 'general'}</div>
            </div>
            <div class="task-card-actions">
                <div class="task-move-btns">${moveBtns}</div>
                <div class="task-card-ctrls">
                    <button class="task-btn edit-task" data-id="${task.id}">Edit</button>
                    <button class="task-btn delete delete-task" data-id="${task.id}">✕</button>
                </div>
            </div>
        `;

        // Attach listeners
        card.querySelector('.delete-task').addEventListener('click', (e) => {
            e.stopPropagation();
            confirmDelete(`Delete "${task.title}"?`, () => deleteTask(task.id));
        });
        
        card.querySelector('.edit-task').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditTask(task);
        });
        
        if (task.status === 'todo') {
            card.querySelector('.move-doing').addEventListener('click', () => updateTaskStatus(task.id, 'doing'));
        } else if (task.status === 'doing') {
            card.querySelector('.move-todo').addEventListener('click', () => updateTaskStatus(task.id, 'todo'));
            card.querySelector('.move-done').addEventListener('click', () => updateTaskStatus(task.id, 'done'));
        } else if (task.status === 'done') {
            card.querySelector('.move-doing').addEventListener('click', () => updateTaskStatus(task.id, 'doing'));
        }

        return card;
    }

    async function updateTaskStatus(id, newStatus) {
        try {
            const task = tasksData.find(t => t.id === id);
            if (!task) return;

            const res = await apiFetch(`/api/tasks/${id}`, {
                method: 'PUT',
                body: { ...task, status: newStatus }
            });

            if (res.success) {
                const updatedTask = { ...res.data, id: res.data._id };
                const idx = tasksData.findIndex(t => t.id === id);
                if (idx !== -1) tasksData[idx] = updatedTask;
                
                if (newStatus === 'done') {
                    pushNotification('task', 'Task completed! ✅', `"${updatedTask.title}" has been moved to Done.`);
                }
                
                renderTasks();
            }
        } catch (err) {
            console.error('Failed to update task status:', err);
            showToast('Failed to update status', 'error');
        }
    }

    async function deleteTask(id) {
        try {
            const res = await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
            if (res.success) {
                tasksData = tasksData.filter(t => t.id !== id);
                renderTasks();
                pushNotification('delete', 'Task deleted', 'Task has been removed.');
            }
        } catch (err) {
            console.error('Failed to delete task:', err);
            showToast('Failed to delete task', 'error');
        }
    }

    function openEditTask(task) {
        editingTaskId = task.id;
        document.getElementById('taskinput').value = task.title;
        document.getElementById('prioritySelect').value = task.priority;
        document.getElementById('categorySelect').value = task.category || 'general';
        document.getElementById('taskDeadline').value = task.deadline ? task.deadline.split('T')[0] : '';
        
        const addBtn = document.getElementById('addTaskBtn');
        if (addBtn) addBtn.textContent = 'Update Task';
        
        document.getElementById('taskinput').focus();
        document.getElementById('taskinput').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskinput = document.getElementById('taskinput');

    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', async () => {
            const title = taskinput.value.trim();
            const priority = document.getElementById('prioritySelect').value;
            const category = document.getElementById('categorySelect').value;
            const deadline = document.getElementById('taskDeadline').value;
            const errEl = document.getElementById('taskInputError');

            if (!title) {
                if (errEl) errEl.style.display = 'block';
                return;
            }
            if (errEl) errEl.style.display = 'none';

            try {
                if (editingTaskId) {
                    const task = tasksData.find(t => t.id === editingTaskId);
                    const res = await apiFetch(`/api/tasks/${editingTaskId}`, {
                        method: 'PUT',
                        body: { ...task, title, priority, category, deadline }
                    });
                    if (res.success) {
                        const updated = { ...res.data, id: res.data._id };
                        const idx = tasksData.findIndex(t => t.id === editingTaskId);
                        if (idx !== -1) tasksData[idx] = updated;
                        editingTaskId = null;
                        addTaskBtn.textContent = 'Add Task';
                        pushNotification('task', 'Task updated', `"${title}" has been updated.`);
                    }
                } else {
                    const res = await apiFetch('/api/tasks', {
                        method: 'POST',
                        body: { title, priority, category, deadline, status: 'todo' }
                    });
                    if (res.success) {
                        const newTask = { ...res.data, id: res.data._id };
                        tasksData.unshift(newTask);
                        pushNotification('task', 'New task added', `"${title}" was added to your list.`);
                    }
                }
                
                taskinput.value = '';
                document.getElementById('taskDeadline').value = '';
                renderTasks();
            } catch (err) {
                console.error('Failed to save task:', err);
                showToast('Failed to save task', 'error');
            }
        });
    }

    if (taskinput) {
        taskinput.addEventListener('keypress', e => { if (e.key === 'Enter') addTaskBtn.click(); });
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            activeFilter = this.getAttribute('data-filter');
            renderTasks();
        });
    });

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', fetchTasks);
    } else {
        fetchTasks();
    }
}

// ============================================================
// HABITS PAGE
// ============================================================
if (page === 'habits') {
    const habitInput     = document.getElementById('habitInput');
    const addHabitBtn    = document.getElementById('addHabitBtn');
    const habitContainer = document.getElementById('habitContainer');
    let currentDisplayDate = new Date();

    function renderCalendar() {
        const calGrid  = document.getElementById('calGrid');
        const calTitle = document.getElementById('calTitle');
        if (!calGrid) return;
        calGrid.innerHTML = `
<div class="cal-dh">Su</div><div class="cal-dh">Mo</div>
<div class="cal-dh">Tu</div><div class="cal-dh">We</div>
<div class="cal-dh">Th</div><div class="cal-dh">Fr</div>
<div class="cal-dh">Sa</div>`;
        const year        = currentDisplayDate.getFullYear();
        const month       = currentDisplayDate.getMonth();
        const todayStr    = getTodayString();
        calTitle.innerText = currentDisplayDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        const firstDay    = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 0; i < firstDay; i++) calGrid.appendChild(document.createElement('div'));
        const activeDays = new Set();
        habitsData.forEach(h => {
            (h.completedDates || []).forEach(d => {
                activeDays.add(getLocalYYYYMMDD(new Date(d)));
            });
        });

        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv  = document.createElement('div');
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            dayDiv.innerText = day;
            dayDiv.classList.add('cal-d', activeDays.has(dateStr) ? 'done' : 'plain');
            if (dateStr === todayStr) dayDiv.classList.add('today');
            calGrid.appendChild(dayDiv);
        }
        
        const completedDays = activeDays.size;
        const currentStreak = computeStreakFromHabits(habitsData);
        streak = currentStreak;
        localStorage.setItem('streak', streak);
        
        updateStreakDisplay(); // update the top nav icon and right panel
        
        const habitStreakTxt = document.getElementById('habitSreakText');
        if (habitStreakTxt) habitStreakTxt.textContent = `You are on a ${streak}-day winning streak today`;

        const greenVal = document.querySelector('.cs-val.green');
        const blueVal  = document.querySelector('.cs-val.blue');
        if (greenVal) greenVal.textContent = completedDays;
        if (blueVal)  blueVal.textContent  = currentStreak;
    }

    let habitsData = [];
    let editingHabitId = null;


    async function fetchHabits() {
        if (habitContainer) habitContainer.innerHTML = `<div class="loading-state">Loading habits...</div>`;
        try {
            const res = await apiFetch('/api/habits');
            if (res.data) habitsData = res.data.map(h => ({ ...h, id: h._id }));
            loadHabits();
            renderCalendar(); // render calendar with real API data
        } catch (err) {
            console.error(err);
            habitContainer.innerHTML = `<div style="color:#ef4444;text-align:center;padding:20px;">Failed to load habits.</div>`;
        }
    }

    function isHabitCompletedToday(habit) {
        const todayStr = getLocalYYYYMMDD();
        return (habit.completedDates || []).some(d => {
            return getLocalYYYYMMDD(new Date(d)) === todayStr;
        });
    }

    function calculatePeriodRate(habits, startDate, endDate) {
        if (!habits || habits.length === 0) return 0;
        let possible = 0;
        let completed = 0;
        let cur = new Date(startDate);
        cur.setHours(0,0,0,0);
        let last = new Date(endDate);
        last.setHours(0,0,0,0);
        
        let days = [];
        while (cur <= last) {
            days.push(new Date(cur));
            cur.setDate(cur.getDate() + 1);
        }

        habits.forEach(h => {
            const created = h.createdAt ? new Date(h.createdAt) : new Date(0);
            created.setHours(0,0,0,0);
            const compSet = new Set((h.completedDates || []).map(d => getLocalYYYYMMDD(new Date(d))));

            days.forEach(d => {
                if (d < created) return; 
                const dayOfWeek = d.getDay();
                let shouldDo = false;
                if (h.frequency === 'daily') shouldDo = true;
                else if (h.frequency === 'weekdays' && dayOfWeek >= 1 && dayOfWeek <= 5) shouldDo = true;
                else if (h.frequency === 'weekends' && (dayOfWeek === 0 || dayOfWeek === 6)) shouldDo = true;

                if (shouldDo) {
                    possible++;
                    if (compSet.has(getLocalYYYYMMDD(d))) {
                        completed++;
                    }
                }
            });
        });

        return possible === 0 ? 0 : (completed / possible);
    }

    function updateWeeklyChart() {
        const barCols = document.querySelectorAll('#habitSection .bar-col');
        if (!barCols.length) return;
        const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const today = new Date();
        barCols.forEach((col, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() - (6 - i));
            const dateStr = getLocalYYYYMMDD(d);
            const pct   = parseInt(localStorage.getItem(`habitHistory_${dateStr}`)) || 0;
            const bar   = col.querySelector('.bar');
            const label = col.querySelector('.bar-day');
            if (bar) { bar.style.height = pct + '%'; bar.className = 'bar ' + (pct === 100 ? 'peak' : pct > 0 ? 'normal' : 'dim'); }
            if (label) label.textContent = days[d.getDay()];
        });

        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(thisWeekStart.getDate() - 6);
        
        const lastWeekEnd = new Date(thisWeekStart);
        lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekStart.getDate() - 6);

        const thisWeekRate = calculatePeriodRate(habitsData, thisWeekStart, today);
        const lastWeekRate = calculatePeriodRate(habitsData, lastWeekStart, lastWeekEnd);

        const perfPct = document.querySelector('#habitSection .perf-pct');
        if (perfPct) {
            perfPct.textContent = Math.round(thisWeekRate * 100) + '%';
        }

        const perfChangeVal = document.querySelector('#habitSection .perf-change .val');
        if (perfChangeVal) {
            if (habitsData.length === 0) {
                 perfChangeVal.textContent = '—';
                 perfChangeVal.style.color = 'var(--text-muted)';
                 perfChangeVal.style.fontFamily = "'Inter', sans-serif";
            } else if (lastWeekRate === 0 && thisWeekRate > 0) {
                 perfChangeVal.textContent = 'New';
                 perfChangeVal.style.color = '#22c55e';
                 perfChangeVal.style.fontFamily = "'Inter', sans-serif";
            } else if (lastWeekRate === 0 && thisWeekRate === 0) {
                 perfChangeVal.textContent = '—';
                 perfChangeVal.style.color = 'var(--text-muted)';
                 perfChangeVal.style.fontFamily = "'Inter', sans-serif";
            } else {
                 const change = ((thisWeekRate - lastWeekRate) / lastWeekRate) * 100;
                 const rounded = Math.round(change);
                 const sign = rounded > 0 ? '+' : '';
                 perfChangeVal.textContent = sign + rounded + '%';
                 perfChangeVal.style.color = rounded >= 0 ? '#22c55e' : '#ef4444';
                 perfChangeVal.style.fontFamily = "'JetBrains Mono', monospace";
                 perfChangeVal.style.fontWeight = "700";
            }
        }
    }

    function buildHabitItem(habit) {
        const freqLabels = { daily: 'Daily', weekdays: 'Weekdays', weekends: 'Weekends' };
        const completedToday = isHabitCompletedToday(habit);

        const card = document.createElement('div');
        card.className = `habit-card ${completedToday ? 'habit-completed' : ''}`;
        card.dataset.id = habit.id;

        let streakClass = 'streak-cold';
        const streak = habit.currentstreak || 0;
        if (streak >= 3)  streakClass = 'streak-warm';
        if (streak >= 7)  streakClass = 'streak-hot';
        if (streak >= 14) streakClass = 'streak-fire';

        const r         = 15;
        const circ      = 2 * Math.PI * r;
        const pct       = completedToday ? 100 : 0;
        const offset    = circ - (pct / 100) * circ;
        const ringColor = completedToday ? '#5cb85c' : '#378ADD';
        
        const freqLabel = freqLabels[habit.frequency] || 'Daily';
        const reminderTxt = habit.reminderTime ? ` · ⏰ ${habit.reminderTime}` : '';

        card.innerHTML = `
<div class="habit-icon ${streakClass}">${habit.icon || '🌟'}</div>
<div class="habit-info">
  <div class="habit-name">${habit.name}</div>
  <div class="habit-streak">🔥 ${streak} Day Streak <span style="color:#aaa;font-size:11px;">(Best: ${habit.higheststreak || 0})</span><br><span class="freq" style="font-size:11px;">• ${freqLabel}${reminderTxt}</span></div>
</div>
<div class="habit-ring-wrap">
  <svg width="36" height="36" viewBox="0 0 36 36">
    <circle class="habit-ring-bg" cx="18" cy="18" r="${r}"/>
    <circle class="habit-ring-fill" cx="18" cy="18" r="${r}"
      stroke="${ringColor}" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
  </svg>
  <span class="habit-ring-label">${pct}%</span>
</div>
<button class="${completedToday ? 'btn-done' : 'btn-mark'} complete-btn" data-id="${habit.id}" ${completedToday ? 'disabled' : ''}>
  ${completedToday ? '✓ Done' : 'Mark done'}
</button>
<div class="habit-actions" style="display:flex; flex-direction:column; gap:4px; margin-left:8px;">
    <span class="habit-edit" style="cursor:pointer;color:#3b82f6;font-size:13px;" title="Edit">✏️</span>
    <span class="habit-delete" style="cursor:pointer;color:#ef4444;font-size:13px;" title="Delete">✕</span>
</div>`;

        card.querySelector('.complete-btn').addEventListener('click', async function() {
            if (completedToday) return;
            try {
                const res = await apiFetch(`/api/habits/${habit.id}/complete`, { method: 'PATCH' });
                const updatedHabit = { ...res.data, id: res.data._id };
                const idx = habitsData.findIndex(h => h.id === habit.id);
                if (idx !== -1) {
                    habitsData[idx] = updatedHabit;
                    loadHabits();
                    renderCalendar();
                    
                    if (updatedHabit.currentstreak > streak) {
                        pushNotification('streak', `${updatedHabit.currentstreak}-day habit streak! 🔥`, `You've kept "${updatedHabit.name}" going for ${updatedHabit.currentstreak} days straight!`);
                    }
                }
            } catch(err) {
                showToast('Failed to complete habit', 'error');
            }
        });

        card.querySelector('.habit-edit').addEventListener('click', () => {
            editingHabitId = habit.id;
            document.getElementById('habitInput').value = habit.name;
            const freqInput = document.getElementById('habitFreqInput');
            if (freqInput) freqInput.value = habit.frequency || 'daily';
            document.getElementById('addHabitBtn').innerHTML = '💾';
            const errEl = document.getElementById('habitInputError');
            if (errEl) errEl.style.display = 'none';
        });

        card.querySelector('.habit-delete').addEventListener('click', () => {
            confirmDelete(`Delete "${habit.name}"? Your streak will be lost.`, async () => {
                try {
                    await apiFetch(`/api/habits/${habit.id}`, { method: 'DELETE' });
                    habitsData = habitsData.filter(h => h.id !== habit.id);
                    pushNotification('delete', 'Habit deleted', `"${habit.name}" has been removed.`);
                    loadHabits();
                } catch(err) {
                    showToast('Failed to delete habit', 'error');
                }
            });
        });

        return card;
    }

    function loadHabits() {
        habitContainer.innerHTML = '';
        
        const pending = habitsData.filter(h => !isHabitCompletedToday(h)).length;
        const pendingBadge = document.getElementById('pendingBadge');
        if (pendingBadge) pendingBadge.textContent = `${pending} PENDING TODAY`;

        const totalHabits = habitsData.length;
        const doneToday   = totalHabits - pending;
        const todayPct    = totalHabits === 0 ? 0 : Math.round((doneToday / totalHabits) * 100);
        localStorage.setItem(`habitHistory_${getLocalYYYYMMDD()}`, todayPct);

        if (habitsData.length === 0) {
            habitContainer.innerHTML = `
<div style="text-align:center;padding:40px 20px;color:var(--text-muted);font-family:'Inter',sans-serif;">
  <div style="font-size:2.5rem;margin-bottom:12px;">🌱</div>
  <div style="font-size:0.95rem;font-weight:600;color:var(--text-sub);margin-bottom:6px;font-family:'Poppins',sans-serif;">No habits yet!</div>
  <div style="font-size:0.82rem;">Add a habit above to start building your streak.</div>
</div>`;
            updateWeeklyChart();
            return;
        }

        habitsData.forEach(habit => {
            habitContainer.appendChild(buildHabitItem(habit));
        });

        updateWeeklyChart();

        let habitHistory = document.getElementById('completedHabitHistory');
        if (!habitHistory) {
            habitHistory    = document.createElement('div');
            habitHistory.id = 'completedHabitHistory';
            habitContainer.parentElement.appendChild(habitHistory);
        }
        const completedHabits = habitsData.filter(h => isHabitCompletedToday(h));
        habitHistory.innerHTML = `
<h4 style="margin:24px 0 10px;font-size:0.78rem;text-transform:uppercase;letter-spacing:1px;
  color:#888;font-family:'JetBrains Mono',monospace;">Completed Today</h4>`;
        if (completedHabits.length === 0) {
            habitHistory.innerHTML += `<p style="font-size:0.82rem;color:#bbb;padding:8px 0;font-family:'Inter',sans-serif;">No habits completed yet today.</p>`;
        } else {
            completedHabits.forEach(habit => {
                habitHistory.innerHTML += `
<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;margin-bottom:6px;
  background:#f0faf4;border-radius:12px;border-left:4px solid #5cb85c;">
  <span style="font-size:16px;">${habit.icon || '🌟'}</span>
  <div style="flex:1;">
    <div style="font-size:0.88rem;color:#555;font-weight:600;text-decoration:line-through;
      font-family:'Poppins',sans-serif;">${habit.name}</div>
    <div style="font-size:0.75rem;color:#5cb85c;margin-top:2px;font-family:'Inter',sans-serif;">
      🔥 ${habit.currentstreak || 0} day streak
    </div>
  </div>
  <span style="color:#5cb85c;font-size:16px;font-weight:700;">✓</span>
</div>`;
            });
        }

        const pastDays = [];
        for (let i = 1; i <= 6; i++) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr = getLocalYYYYMMDD(d);
            const p = parseInt(localStorage.getItem(`habitHistory_${dateStr}`)) || 0;
            if (p > 0) pastDays.push({ dateStr, pct: p, d });
        }
        if (pastDays.length > 0) {
            habitHistory.innerHTML += `
<h4 style="margin:20px 0 10px;font-size:0.78rem;text-transform:uppercase;letter-spacing:1px;
  color:#888;font-family:'JetBrains Mono',monospace;">Past Days</h4>`;
            pastDays.forEach(({ pct: p, d }) => {
                const label = d.toLocaleDateString('default', { weekday:'short', month:'short', day:'numeric' });
                const color = p === 100 ? '#5cb85c' : p >= 50 ? '#e67e22' : '#e74c3c';
                habitHistory.innerHTML += `
<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;margin-bottom:6px;
  background:#f7f9fc;border-radius:12px;border-left:4px solid ${color};">
  <div style="flex:1;">
    <div style="font-size:0.85rem;font-weight:600;color:#555;font-family:'Poppins',sans-serif;">${label}</div>
    <div style="font-size:0.75rem;color:#888;margin-top:2px;font-family:'Inter',sans-serif;">${p}% of habits completed</div>
  </div>
  <div style="font-size:0.82rem;font-weight:700;color:${color};font-family:'JetBrains Mono',monospace;">${p}%</div>
</div>`;
            });
        }
    }

    const emojiMap = [
        { keywords: ['run','running','jog','sprint'],                                          emoji: '🏃' },
        { keywords: ['walk','walking','steps','hike','hiking'],                                emoji: '🚶' },
        { keywords: ['gym','lift','lifting','weights','workout','exercise','train','training'], emoji: '🏋️' },
        { keywords: ['swim','swimming','pool'],                                                emoji: '🏊' },
        { keywords: ['bike','cycling','cycle','bicycle'],                                      emoji: '🚴' },
        { keywords: ['yoga','stretch','stretching','flexibility'],                             emoji: '🧘' },
        { keywords: ['meditat','mindful','mindfulness'],                                       emoji: '🧘' },
        { keywords: ['journal','journaling','diary'],                                          emoji: '✏️' },
        { keywords: ['gratitude','grateful','thankful'],                                       emoji: '🙏' },
        { keywords: ['sleep','nap','rest','bed'],                                              emoji: '😴' },
        { keywords: ['wake','morning','early'],                                                emoji: '⏰' },
        { keywords: ['water','hydrat','drink'],                                                emoji: '💧' },
        { keywords: ['eat','eating','diet','nutrition','calorie'],                             emoji: '🥗' },
        { keywords: ['read','reading','book','books'],                                         emoji: '📖' },
        { keywords: ['study','studying','homework','revision'],                                emoji: '📚' },
        { keywords: ['code','coding','program','programming','develop'],                       emoji: '💻' },
        { keywords: ['write','writing','essay','blog'],                                        emoji: '📝' },
        { keywords: ['focus','deep work','pomodoro','productive'],                             emoji: '🎯' },
        { keywords: ['save','saving','savings','budget'],                                      emoji: '💰' },
        { keywords: ['invest','investing','stocks','crypto','finance'],                        emoji: '📈' },
        { keywords: ['clean','cleaning','tidy','declutter'],                                   emoji: '🧹' },
        { keywords: ['floss','teeth','brush','dental'],                                        emoji: '🦷' },
        { keywords: ['pray','prayer','god','church','mosque','temple'],                        emoji: '🕌' },
        { keywords: ['goal','goals','vision','plan','planning'],                               emoji: '🗺️' },
    ];

    function getHabitEmoji(text) {
        const lower = text.toLowerCase();
        for (const entry of emojiMap) {
            if (entry.keywords.some(k => lower.includes(k))) return entry.emoji;
        }
        return '🌟';
    }

    addHabitBtn.addEventListener('click', async () => {
        const name = habitInput.value.trim();
        const freqInput = document.getElementById('habitFreqInput');
        const frequency = freqInput ? freqInput.value : 'daily';
        const errEl = document.getElementById('habitInputError');
        
        if (!name || !frequency) {
            if (errEl) errEl.style.display = 'block';
            return;
        }
        if (errEl) errEl.style.display = 'none';

        try {
            if (editingHabitId) {
                const res = await apiFetch(`/api/habits/${editingHabitId}`, {
                    method: 'PUT',
                    body: { name, frequency, icon: getHabitEmoji(name) }
                });
                const updatedHabit = { ...res.data, id: res.data._id };
                const idx = habitsData.findIndex(h => h.id === editingHabitId);
                if (idx !== -1) {
                    habitsData[idx] = updatedHabit;
                    const card = document.querySelector(`.habit-card[data-id="${editingHabitId}"]`);
                    if (card) {
                        card.replaceWith(buildHabitItem(updatedHabit));
                    }
                }
                editingHabitId = null;
                document.getElementById('addHabitBtn').innerHTML = '+';
                pushNotification('habit', 'Habit updated', `"${name}" has been updated.`);
            } else {
                const res = await apiFetch('/api/habits', {
                    method: 'POST',
                    body: { name, frequency, icon: getHabitEmoji(name) }
                });
                const newHabit = { ...res.data, id: res.data._id };
                habitsData.unshift(newHabit);
                loadHabits();
                pushNotification('habit', 'New habit created 🌱', `"${name}" has been added to your habits.`);
            }
            habitInput.value = '';
            if (freqInput) freqInput.value = 'daily';
        } catch (err) {
            showToast('Failed to save habit', 'error');
        }
    });

    habitInput.addEventListener('keypress', e => { if (e.key === 'Enter') addHabitBtn.click(); });


    document.getElementById('prevMonth')?.addEventListener('click', () => {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('nextMonth')?.addEventListener('click', () => {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
        renderCalendar();
    });

    function initHabits() {
        fetchHabits();
        renderCalendar();
        updateStreakPanel();
    }
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initHabits);
    } else {
        initHabits();
    }
}

// ============================================================
// PLANNER PAGE
// ============================================================
if (page === 'planner') {

    // ── Data helpers ──────────────────────────────────────────
    let plannerGoals = [];
    async function fetchGoals() {
        const list = document.getElementById('plannerList');
        if (list) list.innerHTML = `<div class="planner-empty">Loading goals...</div>`;
        try {
            const res = await apiFetch('/api/goals');
            if (res.data) plannerGoals = res.data.map(g => ({...g, id: g._id}));
            renderGoals(currentTab);
        } catch(e) {
            console.error(e);
            const list = document.getElementById('plannerList');
            if (list) list.innerHTML = `<div class="planner-empty" style="color:#ef4444;">Failed to load goals. Please try again.</div>`;
        }
    }
    function getPlannerGoals() { return plannerGoals; }
    function savePlannerGoals(goals) { plannerGoals = goals; }

    // ── State ─────────────────────────────────────────────────
    let shortPriority  = 'low';
    let longPriority   = 'low';
    let shortFreq      = 'daily';
    let longFreq       = 'daily';
    let updateTargetId = null;
    let editingGoalId  = null;
    let currentTab     = 'all';

    const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const FULL_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    function getTodayShort() { return DAY_NAMES[new Date().getDay()]; }
    function getTodayFull()  { return FULL_DAYS[new Date().getDay()]; }

    // ── Reminder helpers ──────────────────────────────────────
    function buildReminderFromGoal(goalId, goalName, freq, dateStr, timeStr) {
        if (!dateStr || !timeStr) return null;
        const dateTimeStr  = `${dateStr}T${timeStr}`;
        const reminderTime = new Date(dateTimeStr);
        if (isNaN(reminderTime.getTime())) return null;
        if (reminderTime <= new Date()) return null;
        return {
            id: Date.now() + Math.random(),
            goalId, label: goalName, time: dateTimeStr,
            freq, triggered: false, fromGoal: true,
        };
    }

    async function addReminderForGoal(goalId, goalName, freq, dateStr, timeStr) {
        if (!dateStr || !timeStr) return;
        const body = {
            title: `Goal: ${goalName}`,
            datetime: `${dateStr}T${timeStr}`,
            recurring: freq !== 'once',
            recurrenceType: freq !== 'once' ? freq : null,
            notes: `Reminder for goal ${goalId}`,
            category: 'goal'
        };
        try {
            await apiFetch('/api/reminders', { method: 'POST', body });
        } catch (e) {
            console.error('Failed to add goal reminder:', e);
        }
    }

    function removeGoalReminders(goalId) {
        // Since the backend doesn't track goalId, we'd need to fetch and filter by notes.
        // For now, we'll skip this to avoid accidental deletion of other reminders.
        console.log(`Requested removal of reminders for goal ${goalId}`);
    }


    function buildReminderPreview(freq, dateStr, timeStr) {
        if (!dateStr || !timeStr) return null;
        const dt = new Date(`${dateStr}T${timeStr}`);
        if (isNaN(dt.getTime())) return null;
        const formattedDate = dt.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
        const formattedTime = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const freqLabels    = { daily: 'Every day', weekly: 'Every week', monthly: 'Every month' };
        return `${freqLabels[freq] || 'Once'} starting ${formattedDate} at ${formattedTime}`;
    }

    function updateReminderPreview(prefix) {
        const dateStr  = document.getElementById(`${prefix}ReminderDate`)?.value;
        const timeStr  = document.getElementById(`${prefix}ReminderTime`)?.value;
        const freq     = prefix === 'short' ? shortFreq : longFreq;
        const preview  = document.getElementById(`${prefix}ReminderPreview`);
        const previewT = document.getElementById(`${prefix}ReminderPreviewText`);
        if (!preview || !previewT) return;
        const text = buildReminderPreview(freq, dateStr, timeStr);
        if (text) { previewT.textContent = text; preview.style.display = 'flex'; }
        else       { preview.style.display = 'none'; }
    }

    function formatDeadline(dateStr) {
        if (!dateStr) return null;
        const d    = new Date(dateStr);
        const now  = new Date(); now.setHours(0,0,0,0);
        const diff = Math.round((d - now) / (1000 * 60 * 60 * 24));
        const fmt  = d.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' });
        if (diff < 0)   return { text: `${fmt} · Overdue`,       color: '#ef4444' };
        if (diff === 0) return { text: 'Due today!',              color: '#f59e0b' };
        if (diff <= 7)  return { text: `${fmt} · ${diff}d left`,  color: '#f59e0b' };
        return { text: fmt, color: 'var(--text-muted)' };
    }

    // ── Format a log date nicely ──────────────────────────────
    function formatLogDate(isoStr) {
        const d = new Date(isoStr);
        return d.toLocaleDateString('default', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
        }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // ── Update hero ───────────────────────────────────────────
    function updateHero() {
        const goals   = getPlannerGoals();
        const active  = goals.filter(g => g.status === 'active').length;
        const avgProg = goals.length === 0 ? 0
            : Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length);

        const eyebrow = document.getElementById('goalHeroEyebrow');
        if (eyebrow) eyebrow.textContent = getTodayFull().toUpperCase();

        const heroUser = document.getElementById('goalHeroUser');
        if (heroUser) heroUser.textContent = localStorage.getItem('hubUser') || sessionStorage.getItem('hubUser') || 'there';

        const heroSub = document.getElementById('goalHeroSub');
        if (heroSub) heroSub.textContent = goals.length === 0
            ? 'No goals yet — add one to get started.'
            : `${active} active goal${active === 1 ? '' : 's'} — ${avgProg}% average progress`;
    }

    function updateStats() {
        const goals     = getPlannerGoals();
        const active    = goals.filter(g => g.status === 'active').length;
        const completed = goals.filter(g => g.status === 'completed').length;
        const avgProg   = goals.length === 0 ? 0
            : Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length);
        const statActive    = document.getElementById('statActive');
        const statCompleted = document.getElementById('statCompleted');
        const statAvg       = document.getElementById('statAvgProgress');
        if (statActive)    statActive.textContent    = active;
        if (statCompleted) statCompleted.textContent = completed;
        if (statAvg)       statAvg.textContent       = avgProg + '%';
    }

    // ── Build goal list item ──────────────────────────────────
    function buildGoalItem(goal) {
        const isComplete = goal.status  === 'completed';
        const isLong     = goal.type    === 'long';
        const pct        = Math.min(100, Math.max(0, goal.progress || 0));
        const deadline   = isLong ? formatDeadline(goal.deadline) : null;
        const hasReminder = !!goal.hasReminder;

        // Count log entries
        const logCount = (goal.progressLog || []).length;

        const item = document.createElement('div');
        item.className = `planner-goal-item priority-${goal.priority || 'low'}${isComplete ? ' goal-done' : ''}`;

        item.innerHTML = `
<div class="planner-goal-body">
  <div class="planner-goal-name">
    ${goal.title || goal.text}
    ${hasReminder ? `<span style="font-size:11px;margin-left:6px;color:#7c3aed;" title="Has reminder">🔔</span>` : ''}
  </div>
  <div class="planner-goal-meta">
    ${goal.description ? `<span class="planner-goal-desc">${goal.description}</span>` : ''}
    ${isLong && goal.targetValue ? `<span class="planner-goal-detail"><i class="fa-solid fa-bullseye"></i>${goal.targetValue}</span>` : ''}
    ${isLong && goal.targetAmount ? `<span class="planner-goal-detail" style="color:var(--accent-2);font-weight:700;"><i class="fa-solid fa-ghs"></i>₵${parseFloat(goal.targetAmount).toLocaleString()}</span>` : ''}
    ${deadline ? `<span class="planner-goal-detail" style="color:${deadline.color};"><i class="fa-solid fa-calendar"></i>${deadline.text}</span>` : ''}
    ${hasReminder ? `<span class="planner-goal-detail" style="color:#7c3aed;"><i class="fa-solid fa-bell"></i>${goal.reminderFreq ? goal.reminderFreq.charAt(0).toUpperCase() + goal.reminderFreq.slice(1) : 'Reminder set'}</span>` : ''}
    ${isLong && logCount > 0 ? `<span class="planner-goal-detail" style="color:var(--accent-2);"><i class="fa-solid fa-clock-rotate-left"></i>${logCount} update${logCount === 1 ? '' : 's'}</span>` : ''}
  </div>
  ${isLong && !isComplete ? `
  <div class="planner-goal-progress">
    <div class="planner-goal-progress-track">
      <div class="planner-goal-progress-fill" style="width:${pct}%;"></div>
    </div>
    <span class="planner-goal-progress-pct">${pct}%</span>
  </div>` : ''}
</div>
<div class="planner-goal-right">
  ${goal.day && goal.type === 'short' ? `<span class="planner-goal-day">${goal.day}</span>` : ''}
  ${isLong ? `<span class="planner-type-tag">Long-Term</span>` : ''}
  <span class="planner-priority-badge ${goal.priority || 'low'}">
    <span class="badge-dot"></span>
    ${(goal.priority || 'low').toUpperCase()}
  </span>
  <div class="planner-goal-actions">
    ${isLong && !isComplete ? `
    <button class="planner-action-btn update-btn" data-action="update" data-id="${goal.id}" title="Update progress">
      <i class="fa-solid fa-sliders"></i>
    </button>` : ''}
    ${!isComplete ? `
    <button class="planner-action-btn complete-btn" data-action="complete" data-id="${goal.id}" title="Mark complete">
      <i class="fa-solid fa-check"></i>
    </button>` : ''}
    <button class="planner-action-btn edit-btn" data-action="edit" data-id="${goal.id}" title="Edit" style="color:#3b82f6;">
      <i class="fa-solid fa-pen"></i>
    </button>
    <button class="planner-action-btn danger" data-action="delete" data-id="${goal.id}" title="Delete">
      <i class="fa-solid fa-xmark"></i>
    </button>
  </div>
</div>`;

        item.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const action = this.dataset.action;
                const id     = this.dataset.id;

                if (action === 'delete') {
                    const g = getPlannerGoals().find(x => x.id === id);
                    confirmDelete(`Delete "${g?.title || g?.text}"? This cannot be undone.`, async () => {
                        try {
                            await apiFetch(`/api/goals/${id}`, { method: 'DELETE' });
                            removeGoalReminders(id);
                            plannerGoals = plannerGoals.filter(x => x.id !== id);
                            pushNotification('delete', 'Goal deleted', `"${g?.title || g?.text}" was removed.`);
                            renderGoals(currentTab);
                        } catch (err) {
                            showToast('Failed to delete goal', 'error');
                        }
                    });
                }

                if (action === 'complete') {
                    const g = getPlannerGoals().find(x => x.id === id);
                    if (g) {
                        apiFetch(`/api/goals/${id}`, {
                            method: 'PUT',
                            body: { ...g, status: 'completed', progress: 100 }
                        }).then(() => {
                            g.status   = 'completed';
                            g.progress = 100;
                            if (!g.progressLog) g.progressLog = [];
                            g.progressLog.unshift({
                                pct:  100,
                                prev: g.progress || 0,
                                note: '🏆 Goal marked as complete!',
                                date: new Date().toISOString(),
                            });
                            pushNotification('goal', 'Goal completed! 🎉', `"${g.title || g.text}" marked as complete. Well done!`);
                            showToast(`Goal completed! 🎉`, 'success');
                            renderGoals(currentTab);
                        }).catch(() => showToast('Failed to complete goal', 'error'));
                    }
                }

                if (action === 'update') {
                    openUpdateModal(id);
                }

                if (action === 'edit') {
                    const g = getPlannerGoals().find(x => x.id === id);
                    if (!g) return;
                    editingGoalId = id;
                    if (g.type === 'short') {
                        document.getElementById('shortGoalText').value = g.title || g.text || '';
                        document.getElementById('shortGoalDesc').value = g.description || '';
                        document.getElementById('shortGoalDay').value = g.day || '';
                        document.getElementById('createShortGoalBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
                        document.querySelector('#shortTermOverlay .goal-modal-title').textContent = 'Edit Short-Term Goal ⚡';
                        openOverlay('shortTermOverlay');
                    } else {
                        document.getElementById('longGoalTitle').value = g.title || g.text || '';
                        document.getElementById('longGoalDesc').value = g.description || '';
                        document.getElementById('longGoalTargetValue').value = g.targetValue || '';
                        document.getElementById('longGoalTargetAmount').value = g.targetAmount || '';
                        document.getElementById('longGoalDeadline').value = g.deadline ? g.deadline.split('T')[0] : '';
                        document.getElementById('longGoalInitProgress').value = g.progress || 0;
                        document.getElementById('createLongGoalBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
                        document.querySelector('#longTermOverlay .goal-modal-title').textContent = 'Edit Long-Term Goal 🎯';
                        openOverlay('longTermOverlay');
                    }
                }
            });
        });

        return item;
    }

    // ── Render goals ──────────────────────────────────────────
    function renderGoals(filterTab = 'all') {
        const list = document.getElementById('plannerList');
        if (!list) return;

        let goals = getPlannerGoals();
        if (filterTab === 'short')     goals = goals.filter(g => g.type === 'short');
        if (filterTab === 'long')      goals = goals.filter(g => g.type === 'long');
        if (filterTab === 'completed') goals = goals.filter(g => g.status === 'completed');
        if (filterTab === 'all')       goals = goals.filter(g => g.status !== 'completed');

        list.innerHTML = '';

        if (goals.length === 0) {
            list.innerHTML = `
<div class="planner-empty">
  <div class="planner-empty-icon">🎯</div>
  <div class="planner-empty-title">${filterTab === 'completed' ? 'No completed goals yet' : 'No goals here yet'}</div>
  <div class="planner-empty-sub">
    ${filterTab === 'completed'
        ? 'Complete your active goals and they will show up here.'
        : 'Click "New Goal" in the banner above to get started.'}
  </div>
</div>`;
            updateStats();
            updateHero();
            return;
        }

        if (filterTab === 'short' || filterTab === 'all') {
            const shortGoals = goals.filter(g => g.type === 'short');
            if (shortGoals.length > 0) {
                const todayShort = getTodayShort();
                const grouped    = {};
                shortGoals.forEach(g => {
                    const key = g.day || 'No Day';
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(g);
                });
                const todayIdx    = DAY_SHORT.indexOf(todayShort);
                const orderedDays = [
                    ...DAY_SHORT.slice(todayIdx),
                    ...DAY_SHORT.slice(0, todayIdx),
                    'No Day',
                ].filter(d => grouped[d]);

                orderedDays.forEach(day => {
                    const isToday = day === todayShort;
                    const header  = document.createElement('div');
                    header.className = `planner-day-header${isToday ? ' today-header' : ''}`;
                    header.innerHTML = `
<i class="fa-solid fa-calendar${isToday ? '-day' : ''}"></i>
<span>${isToday ? `${day} — Today` : day === 'No Day' ? 'No Day Assigned' : day}</span>`;
                    list.appendChild(header);
                    grouped[day].forEach(g => list.appendChild(buildGoalItem(g)));
                });
            }

            if (filterTab === 'all') {
                const longGoals = goals.filter(g => g.type === 'long');
                if (longGoals.length > 0) {
                    const ltHeader = document.createElement('div');
                    ltHeader.className = 'planner-day-header';
                    ltHeader.innerHTML = `<i class="fa-solid fa-flag"></i><span>Long-Term Goals</span>`;
                    list.appendChild(ltHeader);
                    longGoals.forEach(g => list.appendChild(buildGoalItem(g)));
                }
            }
        } else {
            goals.forEach(g => list.appendChild(buildGoalItem(g)));
        }

        updateStats();
        updateHero();
    }

    // ── Tab switching ─────────────────────────────────────────
    document.querySelectorAll('.planner-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.planner-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentTab = this.dataset.tab;
            renderGoals(currentTab);
        });
    });

    // ══════════════════════════════════════════
    // MODAL SYSTEM
    // ══════════════════════════════════════════
    function openOverlay(id) {
        document.getElementById(id)?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeOverlay(id) {
        document.getElementById(id)?.classList.remove('active');
        document.body.style.overflow = '';
    }
    function closeAllOverlays() {
        ['goalTypeOverlay','shortTermOverlay','longTermOverlay','updateProgressOverlay']
            .forEach(closeOverlay);
        document.body.style.overflow = '';
    }

    document.getElementById('openGoalTypeModal')?.addEventListener('click', () => openOverlay('goalTypeOverlay'));
    document.getElementById('closeTypeModal')?.addEventListener('click',    () => closeOverlay('goalTypeOverlay'));
    document.getElementById('goalTypeOverlay')?.addEventListener('click', function(e) {
        if (e.target === this) closeOverlay('goalTypeOverlay');
    });

    document.getElementById('pickShortTerm')?.addEventListener('click', () => {
        closeOverlay('goalTypeOverlay');
        resetShortForm();
        openOverlay('shortTermOverlay');
        setTimeout(() => document.getElementById('shortGoalText')?.focus(), 100);
    });

    document.getElementById('pickLongTerm')?.addEventListener('click', () => {
        closeOverlay('goalTypeOverlay');
        resetLongForm();
        openOverlay('longTermOverlay');
        setTimeout(() => document.getElementById('longGoalTitle')?.focus(), 100);
    });

    document.getElementById('backToTypeFromShort')?.addEventListener('click', () => {
        closeOverlay('shortTermOverlay');
        openOverlay('goalTypeOverlay');
    });
    document.getElementById('backToTypeFromLong')?.addEventListener('click', () => {
        closeOverlay('longTermOverlay');
        openOverlay('goalTypeOverlay');
    });

    document.getElementById('closeShortModal')?.addEventListener('click',  () => closeOverlay('shortTermOverlay'));
    document.getElementById('closeLongModal')?.addEventListener('click',   () => closeOverlay('longTermOverlay'));
    document.getElementById('closeUpdateModal')?.addEventListener('click', () => closeOverlay('updateProgressOverlay'));

    ['shortTermOverlay','longTermOverlay','updateProgressOverlay'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', function(e) {
            if (e.target === this) closeOverlay(id);
        });
    });

    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllOverlays(); });

    // ── Priority pickers ──────────────────────────────────────
    function initPriorityPicker(pickerId, onSelect) {
        const picker = document.getElementById(pickerId);
        if (!picker) return;
        picker.querySelectorAll('.priority-opt').forEach(btn => {
            btn.addEventListener('click', function () {
                picker.querySelectorAll('.priority-opt').forEach(b => b.classList.remove('active-priority'));
                this.classList.add('active-priority');
                onSelect(this.dataset.priority);
            });
        });
    }
    initPriorityPicker('shortPriorityPicker', val => { shortPriority = val; });
    initPriorityPicker('longPriorityPicker',  val => { longPriority  = val; });

    // ── Frequency pickers ─────────────────────────────────────
    function initFreqPicker(pickerId, onSelect) {
        const picker = document.getElementById(pickerId);
        if (!picker) return;
        picker.querySelectorAll('.goal-freq-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                picker.querySelectorAll('.goal-freq-btn').forEach(b => b.classList.remove('active-freq'));
                this.classList.add('active-freq');
                onSelect(this.dataset.freq);
            });
        });
    }
    initFreqPicker('shortFreqPicker', val => { shortFreq = val; updateReminderPreview('short'); });
    initFreqPicker('longFreqPicker',  val => { longFreq  = val; updateReminderPreview('long');  });

    // ── Reminder toggles ──────────────────────────────────────
    document.getElementById('shortReminderToggle')?.addEventListener('change', function () {
        const opts = document.getElementById('shortReminderOptions');
        if (opts) {
            opts.style.display = this.checked ? 'flex' : 'none';
            if (this.checked) {
                const dateEl = document.getElementById('shortReminderDate');
                if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().split('T')[0];
            }
        }
    });

    document.getElementById('longReminderToggle')?.addEventListener('change', function () {
        const opts = document.getElementById('longReminderOptions');
        if (opts) {
            opts.style.display = this.checked ? 'flex' : 'none';
            if (this.checked) {
                const dateEl = document.getElementById('longReminderDate');
                if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().split('T')[0];
            }
        }
    });

    ['shortReminderDate','shortReminderTime'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => updateReminderPreview('short'));
    });
    ['longReminderDate','longReminderTime'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => updateReminderPreview('long'));
    });

    // ── Reset forms ───────────────────────────────────────────
    function resetShortForm() {
        editingGoalId = null;
        document.getElementById('createShortGoalBtn').innerHTML = '<i class="fa-solid fa-plus"></i> Add Goal';
        document.querySelector('#shortTermOverlay .goal-modal-title').textContent = 'Short-Term Goal ⚡';
        document.getElementById('shortGoalText').value         = '';
        document.getElementById('shortGoalDesc').value         = '';
        document.getElementById('shortGoalDay').value          = '';
        document.getElementById('shortGoalError').classList.remove('visible');
        document.getElementById('shortReminderToggle').checked = false;
        document.getElementById('shortReminderOptions').style.display = 'none';
        document.getElementById('shortReminderDate').value     = '';
        document.getElementById('shortReminderTime').value     = '';
        document.getElementById('shortReminderPreview').style.display = 'none';
        shortPriority = 'low';
        shortFreq     = 'daily';
        resetPicker('shortPriorityPicker', 'low');
        resetFreqPicker('shortFreqPicker', 'daily');
    }

    function resetLongForm() {
        editingGoalId = null;
        document.getElementById('createLongGoalBtn').innerHTML = '<i class="fa-solid fa-plus"></i> Create Goal';
        document.querySelector('#longTermOverlay .goal-modal-title').textContent = 'Long-Term Goal 🎯';
        document.getElementById('longGoalTitle').value         = '';
        document.getElementById('longGoalDesc').value          = '';
        document.getElementById('longGoalTargetValue').value   = '';
        document.getElementById('longGoalTargetAmount').value  = '';
        document.getElementById('longGoalDeadline').value      = '';
        document.getElementById('longGoalInitProgress').value  = '0';
        document.getElementById('longGoalError').classList.remove('visible');
        document.getElementById('longReminderToggle').checked  = false;
        document.getElementById('longReminderOptions').style.display = 'none';
        document.getElementById('longReminderDate').value      = '';
        document.getElementById('longReminderTime').value      = '';
        document.getElementById('longReminderPreview').style.display = 'none';
        longPriority = 'low';
        longFreq     = 'daily';
        resetPicker('longPriorityPicker', 'low');
        resetFreqPicker('longFreqPicker', 'daily');
    }

    function resetPicker(pickerId, defaultVal) {
        const picker = document.getElementById(pickerId);
        picker?.querySelectorAll('.priority-opt').forEach(b => {
            b.classList.remove('active-priority');
            if (b.dataset.priority === defaultVal) b.classList.add('active-priority');
        });
    }
    function resetFreqPicker(pickerId, defaultVal) {
        const picker = document.getElementById(pickerId);
        picker?.querySelectorAll('.goal-freq-btn').forEach(b => {
            b.classList.remove('active-freq');
            if (b.dataset.freq === defaultVal) b.classList.add('active-freq');
        });
    }

    // ── Create or Edit short-term goal ────────────────────────────────
    document.getElementById('createShortGoalBtn')?.addEventListener('click', async () => {
        const textEl = document.getElementById('shortGoalText');
        const errEl  = document.getElementById('shortGoalError');
        const text   = textEl?.value.trim();
        if (!text) { errEl?.classList.add('visible'); textEl?.focus(); return; }
        errEl?.classList.remove('visible');

        const desc       = document.getElementById('shortGoalDesc')?.value.trim();
        const day        = document.getElementById('shortGoalDay')?.value;
        const wantRemind = document.getElementById('shortReminderToggle')?.checked;
        const remDate    = document.getElementById('shortReminderDate')?.value;
        const remTime    = document.getElementById('shortReminderTime')?.value;

        if (wantRemind && (!remDate || !remTime)) {
            showToast('Please select a date and time for the reminder.', 'error'); return;
        }
        if (wantRemind && new Date(`${remDate}T${remTime}`) <= new Date()) {
            showToast('Reminder date and time must be in the future.', 'error'); return;
        }

        const payload = {
            type: 'short', title: text, description: desc || '', day: day || '',
            priority: shortPriority, hasReminder: wantRemind, 
            reminderFreq: wantRemind ? shortFreq : null
        };

        try {
            if (editingGoalId) {
                const res = await apiFetch(`/api/goals/${editingGoalId}`, { method: 'PUT', body: payload });
                const idx = plannerGoals.findIndex(g => g.id === editingGoalId);
                if (idx !== -1) plannerGoals[idx] = { ...res.data, id: res.data._id };
                showToast(`"${text}" updated! ✓`, 'success');
            } else {
                payload.status = 'active';
                payload.progress = 0;
                payload.progressLog = [];
                const res = await apiFetch('/api/goals', { method: 'POST', body: payload });
                const newGoal = { ...res.data, id: res.data._id };
                plannerGoals.unshift(newGoal);
                
                if (wantRemind) {
                    addReminderForGoal(newGoal.id, text, shortFreq, remDate, remTime);
                    pushNotification('reminder', 'Goal reminder set 🔔', `"${text}" reminder set — ${shortFreq}, starting ${remDate} at ${remTime}.`);
                }
                pushNotification('goal', 'Short-term goal added ⚡', `"${text}" added${day ? ` for ${day}` : ''} with ${shortPriority} priority.`);
                showToast(`"${text}" added! ✓`, 'success');
            }
            closeOverlay('shortTermOverlay');
            renderGoals(currentTab);
        } catch(err) {
            showToast(err.message || 'Error saving goal', 'error');
        }
    });

    document.getElementById('shortGoalText')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('createShortGoalBtn')?.click();
    });

    // ── Create or Edit long-term goal ─────────────────────────────────
    document.getElementById('createLongGoalBtn')?.addEventListener('click', async () => {
        const titleEl = document.getElementById('longGoalTitle');
        const errEl   = document.getElementById('longGoalError');
        const title   = titleEl?.value.trim();
        if (!title) { errEl?.classList.add('visible'); titleEl?.focus(); return; }
        errEl?.classList.remove('visible');

        const desc         = document.getElementById('longGoalDesc')?.value.trim();
        const targetValue  = document.getElementById('longGoalTargetValue')?.value.trim();
        const targetAmount = document.getElementById('longGoalTargetAmount')?.value;
        const deadline     = document.getElementById('longGoalDeadline')?.value;
        const initProg     = Math.min(100, Math.max(0,
            parseInt(document.getElementById('longGoalInitProgress')?.value || '0')
        ));
        const wantRemind   = document.getElementById('longReminderToggle')?.checked;
        const remDate      = document.getElementById('longReminderDate')?.value;
        const remTime      = document.getElementById('longReminderTime')?.value;

        if (wantRemind && (!remDate || !remTime)) {
            showToast('Please select a date and time for the reminder.', 'error'); return;
        }
        if (wantRemind && new Date(`${remDate}T${remTime}`) <= new Date()) {
            showToast('Reminder date and time must be in the future.', 'error'); return;
        }

        const payload = {
            type: 'long', title, description: desc || '', priority: longPriority,
            targetValue: targetValue || '', targetAmount: targetAmount || '',
            deadline: deadline || null,
            hasReminder: wantRemind, reminderFreq: wantRemind ? longFreq : null
        };

        try {
            if (editingGoalId) {
                const res = await apiFetch(`/api/goals/${editingGoalId}`, { method: 'PUT', body: payload });
                const idx = plannerGoals.findIndex(g => g.id === editingGoalId);
                if (idx !== -1) plannerGoals[idx] = { ...res.data, id: res.data._id };
                showToast(`"${title}" updated! ✓`, 'success');
            } else {
                const initialLog = [];
                if (initProg > 0) {
                    initialLog.push({
                        pct:  initProg, prev: 0,
                        note: `🚀 Started at ${initProg}% progress.`,
                        date: new Date().toISOString(),
                    });
                }
                payload.progress = initProg;
                payload.status = initProg >= 100 ? 'completed' : 'active';
                payload.progressLog = initialLog;

                const res = await apiFetch('/api/goals', { method: 'POST', body: payload });
                const newGoal = { ...res.data, id: res.data._id };
                plannerGoals.unshift(newGoal);

                if (wantRemind) {
                    addReminderForGoal(newGoal.id, title, longFreq, remDate, remTime);
                    pushNotification('reminder', 'Goal reminder set 🔔', `"${title}" reminder set — ${longFreq}, starting ${remDate} at ${remTime}.`);
                }
                pushNotification('goal', 'Long-term goal created 🎯', `"${title}" added.${deadline ? ` Deadline: ${deadline}.` : ''}`);
                showToast(`"${title}" created! ✓`, 'success');
            }
            closeOverlay('longTermOverlay');
            renderGoals(currentTab);
        } catch(err) {
            showToast(err.message || 'Error saving goal', 'error');
        }
    });

    document.getElementById('longGoalTitle')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('createLongGoalBtn')?.click();
    });

    // ══════════════════════════════════════════
    // UPDATE PROGRESS MODAL — with log
    // ══════════════════════════════════════════
    function renderProgressLog(log) {
        const listEl = document.getElementById('progressLogList');
        if (!listEl) return;

        if (!log || log.length === 0) {
            listEl.innerHTML = `<div class="goal-progress-log-empty">No updates yet — be the first!</div>`;
            return;
        }

        listEl.innerHTML = '';

        log.forEach((entry, index) => {
            const isLatest = index === 0;
            const isStart  = index === log.length - 1;
            const gain     = entry.pct - (entry.prev || 0);

            const entryEl = document.createElement('div');
            entryEl.className = `goal-log-entry${isLatest ? ' is-latest' : ''}${isStart && log.length > 1 ? ' is-start' : ''}`;

            entryEl.innerHTML = `
<div class="goal-log-entry-left">
  <div class="goal-log-dot">${entry.pct}%</div>
  ${!isStart ? '<div class="goal-log-connector"></div>' : ''}
</div>
<div class="goal-log-entry-right">
  <div class="goal-log-entry-header">
    <span class="goal-log-pct">${entry.pct}%</span>
    ${gain > 0 ? `<span class="goal-log-gain">+${gain}%</span>` : ''}
    <span class="goal-log-date">${formatLogDate(entry.date)}</span>
  </div>
  <div class="goal-log-note">${entry.note || '<em style="color:var(--text-muted)">No note added</em>'}</div>
</div>`;

            listEl.appendChild(entryEl);
        });
    }

    function openUpdateModal(id) {
        const goal = getPlannerGoals().find(g => g.id === id);
        if (!goal) return;
        updateTargetId = id;

        const currentPct = goal.progress || 0;

        const nameEl   = document.getElementById('updateGoalName');
        const slider   = document.getElementById('updateProgressSlider');
        const valEl    = document.getElementById('updateProgressVal');
        const noteEl   = document.getElementById('updateProgressNote');
        const noteErr  = document.getElementById('updateNoteError');
        const curFill  = document.getElementById('updateCurrentFill');
        const curPct   = document.getElementById('updateCurrentPct');

        const newPctEl = document.getElementById('updateNewPct');
        const lockedNote = document.getElementById('updateLockedNote');
        const minNote    = document.getElementById('updateMinNote');

        if (nameEl) nameEl.textContent = goal.title || goal.text;

        // Set slider min to current progress so it can't go backwards
        if (slider) {
            slider.min   = currentPct;
            slider.value = currentPct;
        }
        if (valEl)    valEl.textContent  = currentPct;
        if (noteEl)   noteEl.value       = '';
        if (noteErr)  noteErr.classList.remove('visible');

        // Show current progress bar
        if (curFill)  curFill.style.width = currentPct + '%';
        if (curPct)   curPct.textContent  = currentPct + '%';
        if (newPctEl) newPctEl.textContent = currentPct + '%';

        // Show locked note if already has progress
        if (lockedNote && minNote) {
            if (currentPct > 0) {
                lockedNote.style.display = 'inline';
                minNote.textContent = currentPct;
            } else {
                lockedNote.style.display = 'none';
            }
        }

        // Render log
        renderProgressLog(goal.progressLog || []);

        openOverlay('updateProgressOverlay');
    }

    // Slider live update
    document.getElementById('updateProgressSlider')?.addEventListener('input', function () {
        const valEl    = document.getElementById('updateProgressVal');
        const newPctEl = document.getElementById('updateNewPct');
        const curFill  = document.getElementById('updateCurrentFill');
        if (valEl)    valEl.textContent    = this.value;
        if (newPctEl) newPctEl.textContent = this.value + '%';
        // Animate fill to show new value
        if (curFill) {
            curFill.style.background = `linear-gradient(90deg, #7c3aed ${+this.dataset.prev || 0}%, #10b981 ${this.value}%)`;
            curFill.style.width = this.value + '%';
        }
    });

    // Save progress
    document.getElementById('saveProgressBtn')?.addEventListener('click', async () => {
        if (updateTargetId === null) return;

        const goals  = getPlannerGoals();
        const goal   = goals.find(g => g.id === updateTargetId);
        if (!goal) return;

        const slider  = document.getElementById('updateProgressSlider');
        const noteEl  = document.getElementById('updateProgressNote');
        const noteErr = document.getElementById('updateNoteError');
        const newPct  = parseInt(slider?.value || 0);
        const note    = noteEl?.value.trim();

        // Require a note
        if (!note) {
            noteErr?.classList.add('visible');
            noteEl?.focus();
            return;
        }
        noteErr?.classList.remove('visible');

        const prevPct = goal.progress || 0;

        // Ensure progress only goes up
        if (newPct < prevPct) {
            showToast(`Progress can't go below ${prevPct}%`, 'warning');
            return;
        }

        // Build log entry
        const logEntry = {
            pct:  newPct,
            prev: prevPct,
            note: note,
            date: new Date().toISOString(),
        };

        const updatedLog = [...(goal.progressLog || [])];
        updatedLog.unshift(logEntry);
        
        try {
            await apiFetch(`/api/goals/${updateTargetId}/progress`, {
                method: 'PATCH',
                body: { progress: newPct, milestones: goal.milestones, progressLog: updatedLog }
            });
            
            goal.progress = newPct;
            goal.progressLog = updatedLog;

            if (newPct >= 100) {
                goal.status   = 'completed';
                goal.progress = 100;
                goal.progressLog[0].pct = 100;
                pushNotification('goal', 'Goal completed! 🎉', `"${goal.title}" reached 100% — you crushed it!`);
                showToast(`"${goal.title}" completed! 🎉`, 'success');
            } else {
                const gain = newPct - prevPct;
                pushNotification(
                    'goal', 'Goal progress updated',
                    `"${goal.title}" is now at ${newPct}%${gain > 0 ? ` (+${gain}%)` : ''} — ${note}`
                );
                showToast(`Progress updated to ${newPct}% ✓`, 'success');
            }

            closeOverlay('updateProgressOverlay');
            updateTargetId = null;
            renderGoals(currentTab);
        } catch(err) {
            showToast('Failed to update progress', 'error');
        }
    });

    // ── Init ──────────────────────────────────────────────────
    function initPlanner() {
        updateHero();
        updateStats();
        fetchGoals();
    }
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initPlanner);
    } else {
        initPlanner();
    }
}


// ============================================================
// NOTEBOOK PAGE
// ============================================================
if (page === 'notebook') {
    (function () {
        const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

        let notesData = [];
        let activeNoteId = null;
        let activeNoteCategory = 'all';
        let searchQuery = '';
        let pinInFlight = false;

        const categoryLabels = {
            personal: 'Personal',
            work: 'Work',
            study: 'Study',
            ideas: 'Ideas'
        };

        async function fetchNotes() {
            const list = document.getElementById('notesList');
            if (list) list.innerHTML = `<div style="text-align:center;padding:30px;color:#aaa;">Loading notes...</div>`;
            try {
                const res = await apiFetch('/api/notes');
                if (res.data) {
                    notesData = res.data.map(n => ({ ...n, id: n._id }));
                    renderNotes();
                }
            } catch (err) {
                console.error('Failed to fetch notes:', err);
                showToast('Failed to load notes', 'error');
            }
        }

        function formatShortDate(d) {
            d = new Date(d);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const noteDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const diff = Math.round((today - noteDay) / 86400000);
            if (diff === 0) return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
            if (diff === 1) return 'Yesterday';
            if (diff < 7) return DAYS[d.getDay()];
            return `${d.getMonth()+1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
        }

        function groupLabel(d) {
            d = new Date(d);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const noteDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const diff = Math.round((today - noteDay) / 86400000);
            if (diff === 0) return 'Today';
            if (diff <= 6) return 'This Week';
            if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) return 'This Month';
            if (d.getFullYear() === now.getFullYear()) return MONTHS[d.getMonth()];
            return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
        }

        function renderNotes() {
            const list = document.getElementById('notesList');
            if (!list) return;

            // Filter
            let filtered = activeNoteCategory === 'all'
                ? notesData
                : notesData.filter(n => n.category === activeNoteCategory);

            // Search
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                filtered = filtered.filter(n => 
                    (n.title && n.title.toLowerCase().includes(q)) || 
                    (n.content && n.content.toLowerCase().includes(q))
                );
            }

            // Sort: Pinned first, then date descending
            filtered.sort((a, b) => {
                if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
                return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
            });

            if (filtered.length === 0) {
                list.innerHTML = `<div style="text-align:center;padding:30px 16px;font-size:12px;color:#aaa;font-family:'Inter',sans-serif;">No notes found</div>`;
                return;
            }

            list.innerHTML = '';
            let lastGroup = null;

            filtered.forEach(note => {
                const g = groupLabel(note.updatedAt || note.createdAt);
                if (!note.pinned && g !== lastGroup) {
                    const label = document.createElement('div');
                    label.className = 'notes-date-group-label';
                    label.textContent = g;
                    list.appendChild(label);
                    lastGroup = g;
                } else if (note.pinned && lastGroup !== 'Pinned') {
                    const label = document.createElement('div');
                    label.className = 'notes-date-group-label';
                    label.innerHTML = '<i class="fa-solid fa-thumbtack"></i> Pinned';
                    list.appendChild(label);
                    lastGroup = 'Pinned';
                }

                list.appendChild(buildNoteItem(note));
            });
        }

        function buildNoteItem(note) {
            const item = document.createElement('div');
            item.className = `notes-item ${note.id === activeNoteId ? 'active' : ''} ${note.pinned ? 'pinned' : ''}`;
            item.dataset.id = note.id;

            const snippet = (note.content || '').replace(/\n/g, ' ').substring(0, 150);
            const tagsHtml = (note.tags && note.tags.length) 
                ? `<div class="note-tags-list" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${note.tags.map(t => `<span class="note-tag-chip" style="font-size:10px;background:var(--surface-2);padding:2px 6px;border-radius:4px;color:var(--text-sub);">#${t}</span>`).join('')}</div>`
                : '';

            item.innerHTML = `
                <div class="notes-item-header" style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div class="notes-item-title" style="font-weight:600;font-size:0.9rem;color:var(--text-primary);">${note.title || 'Untitled'}</div>
                    <button class="notes-item-del" data-id="${note.id}" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:16px;">×</button>
                </div>
                <div class="notes-item-preview" style="font-size:0.8rem;color:var(--text-sub);margin-top:4px;">
                    <span class="notes-item-date" style="color:var(--accent);margin-right:6px;">${formatShortDate(note.updatedAt || note.createdAt)}</span>
                    <span class="notes-item-snippet">${snippet}${snippet.length >= 150 ? '...' : ''}</span>
                </div>
                <div class="notes-item-footer" style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                    <span class="note-category-badge cat-${note.category}" style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">${categoryLabels[note.category] || note.category}</span>
                    ${tagsHtml}
                </div>
            `;

            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('notes-item-del')) return;
                selectNote(note.id);
            });

            item.querySelector('.notes-item-del').addEventListener('click', (e) => {
                e.stopPropagation();
                confirmDelete(`Delete "${note.title || 'Untitled'}"?`, () => deleteNote(note.id));
            });

            return item;
        }

        function selectNote(id) {
            activeNoteId = id;
            const note = notesData.find(n => n.id === id);
            if (!note) return;

            document.getElementById('notesEmptyState').style.display = 'none';
            document.getElementById('notesEditorContent').style.display = 'flex';
            
            document.getElementById('noteTitleInput').value = note.title || '';
            document.getElementById('noteBodyInput').value = note.content || '';
            document.getElementById('noteCategorySelect').value = note.category || 'personal';
            document.getElementById('noteTagsInput').value = (note.tags || []).join(', ');
            
            const pinBtn = document.getElementById('notesPinBtn');
            if (pinBtn) {
                pinBtn.classList.toggle('active', !!note.pinned);
                pinBtn.style.color = note.pinned ? 'var(--accent)' : 'inherit';
            }

            const d = new Date(note.updatedAt || note.createdAt);
            document.getElementById('notesEditorMeta').textContent =
                `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ` +
                d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
            
            renderNotes();
        }

        async function saveActive() {
            if (!activeNoteId) return;

            const title = document.getElementById('noteTitleInput').value.trim();
            const content = document.getElementById('noteBodyInput').value;
            const category = document.getElementById('noteCategorySelect').value;
            const tagsRaw = document.getElementById('noteTagsInput').value;
            const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t) : [];

            if (!title) {
                showToast('Title is required', 'warning');
                return;
            }

            try {
                const res = await apiFetch(`/api/notes/${activeNoteId}`, {
                    method: 'PUT',
                    body: { title, content, category, tags }
                });

                if (res.success) {
                    const updatedNote = { ...res.data, id: res.data._id };
                    const idx = notesData.findIndex(n => n.id === activeNoteId);
                    if (idx !== -1) notesData[idx] = updatedNote;
                    
                    showToast('Note saved ✓', 'success');
                    renderNotes();
                }
            } catch (err) {
                console.error('Failed to save note:', err);
                showToast('Failed to save note', 'error');
            }
        }

        async function newNote() {
            try {
                const res = await apiFetch('/api/notes', {
                    method: 'POST',
                    body: {
                        title: 'Untitled Note',
                        content: '',
                        category: activeNoteCategory === 'all' ? 'personal' : activeNoteCategory,
                        tags: []
                    }
                });

                if (res.success) {
                    const note = { ...res.data, id: res.data._id };
                    notesData.unshift(note);
                    renderNotes();
                    selectNote(note.id);
                    document.getElementById('noteTitleInput').focus();
                    pushNotification('note', 'New note created 📝', 'Start writing your thoughts!');
                }
            } catch (err) {
                console.error('Failed to create note:', err);
                showToast('Failed to create note', 'error');
            }
        }

        async function deleteNote(id) {
            try {
                const res = await apiFetch(`/api/notes/${id}`, { method: 'DELETE' });
                if (res.success) {
                    notesData = notesData.filter(n => n.id !== id);
                    if (activeNoteId === id) {
                        activeNoteId = null;
                        document.getElementById('notesEmptyState').style.display = 'flex';
                        document.getElementById('notesEditorContent').style.display = 'none';
                    }
                    renderNotes();
                    pushNotification('delete', 'Note deleted', 'Note has been removed.');
                }
            } catch (err) {
                console.error('Failed to delete note:', err);
                showToast('Failed to delete note', 'error');
            }
        }

        async function togglePin() {
            if (!activeNoteId || pinInFlight) return;

            pinInFlight = true;
            try {
                const res = await apiFetch(`/api/notes/${activeNoteId}/pin`, { method: 'PUT' });
                if (res.success) {
                    const updatedNote = { ...res.data, id: res.data._id };
                    const idx = notesData.findIndex(n => n.id === activeNoteId);
                    if (idx !== -1) notesData[idx] = updatedNote;
                    
                    const pinBtn = document.getElementById('notesPinBtn');
                    if (pinBtn) {
                        pinBtn.classList.toggle('active', !!updatedNote.pinned);
                        pinBtn.style.color = updatedNote.pinned ? 'var(--accent)' : 'inherit';
                    }
                    
                    renderNotes();
                }
            } catch (err) {
                console.error('Failed to toggle pin:', err);
                showToast('Failed to toggle pin', 'error');
            } finally {
                pinInFlight = false;
            }
        }

        function initNotes() {
            const newBtn = document.getElementById('newNoteBtn');
            const newBtnAlt = document.getElementById('newNoteBtnAlt');
            const saveBtn = document.getElementById('notesSaveBtn');
            const delBtn = document.getElementById('notesDeleteBtn');
            const pinBtn = document.getElementById('notesPinBtn');
            const tabs = document.getElementById('notesCategoryTabs');
            const search = document.getElementById('noteSearchInput');
            const categorySelect = document.getElementById('noteCategorySelect');

            if (!newBtn) return;

            newBtn.addEventListener('click', newNote);
            if (newBtnAlt) newBtnAlt.addEventListener('click', newNote);
            saveBtn.addEventListener('click', saveActive);
            delBtn.addEventListener('click', () => { if (activeNoteId) deleteNote(activeNoteId); });
            if (pinBtn) pinBtn.addEventListener('click', togglePin);
            
            if (categorySelect) categorySelect.addEventListener('change', saveActive);

            if (tabs) {
                tabs.querySelectorAll('.notes-cat-tab').forEach(btn => {
                    btn.addEventListener('click', function () {
                        tabs.querySelectorAll('.notes-cat-tab').forEach(b => b.classList.remove('active'));
                        this.classList.add('active');
                        activeNoteCategory = this.dataset.filter;
                        renderNotes();
                    });
                });
            }

            if (search) {
                search.addEventListener('input', (e) => {
                    searchQuery = e.target.value;
                    renderNotes();
                });
            }

            const titleInput = document.getElementById('noteTitleInput');
            if (titleInput) {
                titleInput.addEventListener('focus', () => {
                    if (titleInput.value === 'Untitled Note') {
                        titleInput.value = '';
                    }
                });

                titleInput.addEventListener('blur', () => {
                    if (titleInput.value.trim() === '') {
                        titleInput.value = 'Untitled Note';
                        saveActive();
                    }
                });
            }

            fetchNotes();
        }

        initNotes();
    })();
}

// ============================================================
// ACCOUNT PAGE
// ============================================================
if (page === 'account') {
    const fullNameInput = document.getElementById('fullName');
    const emailInput    = document.getElementById('email');
    const timezoneInput = document.getElementById('timezone');
    const accName       = document.getElementById('accName');
    const accEmail      = document.getElementById('accEmail');

    window.addEventListener('load', () => {
        const saved = JSON.parse(localStorage.getItem('accountData'));
        if (saved) {
            if (fullNameInput) fullNameInput.value = saved.name     || '';
            if (emailInput)    emailInput.value    = saved.email    || '';
            if (timezoneInput) timezoneInput.value = saved.timezone || '';
            if (accName)       accName.innerText   = saved.name     || 'Your Name';
            if (accEmail)      accEmail.innerText  = saved.email    || 'your@email.com';
        } else {
            const hubUser  = localStorage.getItem('hubUser')  || sessionStorage.getItem('hubUser')  || '';
            const hubEmail = localStorage.getItem('hubEmail') || sessionStorage.getItem('hubEmail') || '';
            if (accName)       accName.innerText   = hubUser;
            if (accEmail)      accEmail.innerText  = hubEmail;
            if (fullNameInput) fullNameInput.value = hubUser;
            if (emailInput)    emailInput.value    = hubEmail;
        }
        const savedImage = localStorage.getItem('profileImage');
        const profileImg = document.getElementById('profileImage');
        if (savedImage && profileImg) profileImg.src = savedImage;

        if (!localStorage.getItem('memberSince')) {
            localStorage.setItem('memberSince', new Date().toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' }));
        }
        const memberSinceEl = document.getElementById('memberSince');
        if (memberSinceEl) memberSinceEl.value = localStorage.getItem('memberSince') || '—';
    });

    window.toggleEdit = function () {
        document.querySelectorAll('#accountSection input:not(#memberSince)').forEach(i => i.removeAttribute('readonly'));
        document.querySelectorAll('#accountSection select').forEach(s => s.removeAttribute('disabled'));
        document.getElementById('saveBtn').style.display   = 'inline-flex';
        document.getElementById('cancelBtn').style.display = 'inline-flex';
        document.querySelector('.edit-btn').style.display  = 'none';
    };

    window.cancelEdit = function () { location.reload(); };

    window.saveAccount = function () {
        const data = {
            name:     fullNameInput.value.trim(),
            email:    emailInput.value.trim(),
            timezone: timezoneInput.value,
        };
        if (!data.name) { showToast('Please enter your full name.', 'error'); return; }
        if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            showToast('Please enter a valid email.', 'error'); return;
        }
        localStorage.setItem('accountData', JSON.stringify(data));
        if (accName)  accName.innerText  = data.name;
        if (accEmail) accEmail.innerText = data.email;
        document.querySelectorAll('#accountSection input:not(#memberSince)').forEach(i => i.setAttribute('readonly', true));
        document.querySelectorAll('#accountSection select').forEach(s => s.setAttribute('disabled', true));
        document.getElementById('saveBtn').style.display   = 'none';
        document.getElementById('cancelBtn').style.display = 'none';
        document.querySelector('.edit-btn').style.display  = 'inline-flex';
        pushNotification('system', 'Profile updated ✓', 'Your profile has been updated successfully.');
        showToast('Profile updated successfully! ✓', 'success');
    };

    window.openSettingsPage = function (pageId) {
        document.getElementById('settingsMenu').style.display     = 'none';
        document.getElementById('settingsTitle').style.display    = 'none';
        document.getElementById('settingsSubtitle').style.display = 'none';
        document.getElementById(pageId).style.display             = 'block';
    };

    window.closeSettingsPage = function (pageId) {
        document.getElementById(pageId).style.display             = 'none';
        document.getElementById('settingsTitle').style.display    = 'block';
        document.getElementById('settingsSubtitle').style.display = 'block';
        document.getElementById('settingsMenu').style.display     = 'flex';
    };

    const imageUpload = document.getElementById('imageUpload');
    if (imageUpload) {
        imageUpload.addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function () {
                document.getElementById('profileImage').src = reader.result;
                localStorage.setItem('profileImage', reader.result);
                pushNotification('system', 'Profile photo updated 📸', 'Your profile picture has been changed successfully.');
                showToast('Profile photo updated! ✓', 'success');
            };
            reader.readAsDataURL(file);
        });
    }
}



// ============================================================
// ALERTS / NOTIFICATIONS PAGE
// ============================================================
// Wallet / Finance — account page wiring
if (page === 'account') {
    const WALLET_API_BASE = 'http://localhost:5000/api/finance'; // adjust to match your backend

    const walletState = { plans: [], transactions: [] };

    function walletFormatMoney(n) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
    }

    function walletFormatDate(dateStr) {
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function walletEscape(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    async function walletFetchJSON(url, options = {}) {
        const token = localStorage.getItem('gv_token');
        const headers = { ...options.headers };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const res = await fetch(url, { ...options, headers });
        if (!res.ok) throw new Error(`Request to ${url} failed with status ${res.status}`);
        return res.json();
    }

    async function loadWalletSummary() {
        try {
            // Using getSummary endpoint which returns { wallets: [...] }
            const summaryRes = await walletFetchJSON(`${WALLET_API_BASE}/summary`);
            const summary = summaryRes.data || summaryRes;
            const balance = summary.wallets && summary.wallets.length > 0 ? summary.wallets[0].balance : 0;
            
            document.getElementById('balanceAmount').textContent = walletFormatMoney(balance);
            const label = document.getElementById('monthChangeLabel');
            if (label) {
                const change = summary.monthChange || 0;
                label.textContent = `${change >= 0 ? '+' : ''}${walletFormatMoney(change)} this month`;
            }
        } catch (err) {
            console.error('Could not load wallet summary', err);
        }
    }

    async function loadWalletPlans() {
        try {
            const res = await walletFetchJSON(`${WALLET_API_BASE}/budgets?type=plan`);
            walletState.plans = (res.data || []).map(p => ({
                id: p._id,
                name: p.category,
                saved: p.savedAmount || 0,
                target: p.targetAmount || 0,
                deadline: p.deadline,
                reason: p.reason
            }));
            renderWalletPlans();
            populatePlanDropdown();
        } catch (err) {
            console.error('Could not load plans', err);
        }
    }

    async function loadWalletTransactions() {
        try {
            // Fetch wallets first to get default wallet ID
            const walletsRes = await walletFetchJSON(`${WALLET_API_BASE}/wallets`);
            const wallets = walletsRes.data || [];
            if (!wallets.length) return;
            const currentWallet = wallets.find(w => w.isDefault) || wallets[0];
            
            const res = await walletFetchJSON(`${WALLET_API_BASE}/transactions?walletId=${currentWallet._id}`);
            walletState.transactions = res.data || [];
            renderWalletTransactions();
        } catch (err) {
            console.error('Could not load transactions', err);
        }
    }

    function renderWalletPlans() {
        const container = document.getElementById('walletPlanList') || document.getElementById('walletPlansList');
        if (!container) return;
        if (!walletState.plans.length) {
            container.innerHTML = `
                <div style="text-align:center; padding:24px; color:var(--text-muted); font-size:0.84rem; font-family:'Inter',sans-serif; background:var(--surface-2); border-radius:var(--radius); border:1.5px dashed var(--border);">
                    <div style="font-size:1.8rem;margin-bottom:8px;">🎯</div>
                    No plans yet
                </div>`;
            return;
        }
        container.innerHTML = walletState.plans.map((plan) => {
            const pct = Math.min(100, Math.round((plan.saved / plan.target) * 100));
            return `
                <div class="wallet-plan-card">
                    <div class="wallet-plan-top">
                        <p class="wallet-plan-name">${walletEscape(plan.name)}</p>
                        <p class="wallet-plan-deadline">Due ${walletFormatDate(plan.deadline)}</p>
                    </div>
                    <div class="wallet-progress-track">
                        <div class="wallet-progress-fill" style="width:${pct}%;"></div>
                    </div>
                    <p class="wallet-plan-meta">${walletFormatMoney(plan.saved)} of ${walletFormatMoney(plan.target)} · ${walletEscape(plan.reason)}</p>
                </div>`;
        }).join('');
    }

    function walletTxRowHTML(tx) {
        const icon = tx.type === 'deposit' ? '⬇️' : '⬆️';
        const sign = tx.type === 'deposit' ? '+' : '-';
        return `
            <div class="wallet-tx-row">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span>${icon}</span>
                    <div>
                        <p class="wallet-tx-reason">${walletEscape(tx.description || tx.reason)}</p>
                        <p class="wallet-tx-meta">${walletFormatDate(tx.date)} · ${walletEscape(tx.category)}</p>
                    </div>
                </div>
                <p class="wallet-tx-amount ${tx.type}">${sign}${walletFormatMoney(tx.amount)}</p>
            </div>`;
    }

    function renderWalletTransactions() {
        const container = document.getElementById('walletTxList');
        if (!container) return;
        if (!walletState.transactions.length) {
            container.innerHTML = `
                <div style="text-align:center; padding:24px; color:var(--text-muted); font-size:0.84rem; font-family:'Inter',sans-serif; background:var(--surface-2); border-radius:var(--radius); border:1.5px dashed var(--border);">
                    <div style="font-size:1.8rem;margin-bottom:8px;">🧾</div>
                    No transactions yet
                </div>`;
            return;
        }
        container.innerHTML = walletState.transactions.slice(0, 5).map(walletTxRowHTML).join('');
    }

    function populatePlanDropdown() {
        const select = document.getElementById('walletTxPlan');
        if (!select) return;
        select.innerHTML = '<option value="">None</option>' +
            walletState.plans.map((p) => `<option value="${p.id}">${walletEscape(p.name)}</option>`).join('');
    }

    function openWalletModal(id) { 
        const el = document.getElementById(id);
        if (el) el.hidden = false; 
    }
    function closeWalletModal(id) { 
        const el = document.getElementById(id);
        if (el) el.hidden = true; 
    }

    document.querySelectorAll('[data-close]').forEach((btn) => {
        btn.addEventListener('click', () => closeWalletModal(btn.dataset.close));
    });

    const addFundsBtn = document.getElementById('openAddFunds');
    if (addFundsBtn) {
        addFundsBtn.addEventListener('click', () => {
            document.getElementById('walletTxType').value = 'deposit';
            document.getElementById('walletTxModalTitle').textContent = 'Add Funds';
            document.getElementById('walletTxSubmit').textContent = 'Add deposit';
            document.getElementById('walletTxDate').valueAsDate = new Date();
            openWalletModal('walletTxModal');
        });
    }

    const withdrawBtn = document.getElementById('openWithdraw');
    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', () => {
            document.getElementById('walletTxType').value = 'withdraw';
            document.getElementById('walletTxModalTitle').textContent = 'Withdraw Funds';
            document.getElementById('walletTxSubmit').textContent = 'Withdraw';
            document.getElementById('walletTxDate').valueAsDate = new Date();
            openWalletModal('walletTxModal');
        });
    }

    const newPlanBtn = document.getElementById('openNewPlan');
    if (newPlanBtn) {
        newPlanBtn.addEventListener('click', () => openWalletModal('walletPlanModal'));
    }

    const viewAllBtn = document.getElementById('viewAllTx');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            renderAllWalletTransactions();
            openWalletModal('walletAllTxModal');
        });
    }

    const txForm = document.getElementById('walletTxForm');
    if (txForm) {
        txForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Need wallet ID for backend request
            const walletsRes = await walletFetchJSON(`${WALLET_API_BASE}/wallets`);
            const wallets = walletsRes.data || [];
            const currentWallet = wallets.find(w => w.isDefault) || wallets[0];
            
            const payload = {
                type: document.getElementById('walletTxType').value,
                amount: parseFloat(document.getElementById('walletTxAmount').value),
                description: document.getElementById('walletTxReason').value.trim(),
                category: document.getElementById('walletTxCategory').value,
                date: document.getElementById('walletTxDate').value,
                linkedPlan: document.getElementById('walletTxPlan').value || null,
                walletId: currentWallet ? currentWallet._id : null
            };
            try {
                await walletFetchJSON(`${WALLET_API_BASE}/transactions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                e.target.reset();
                closeWalletModal('walletTxModal');
                await Promise.all([loadWalletSummary(), loadWalletPlans(), loadWalletTransactions()]);
            } catch (err) {
                console.error('Could not save transaction', err);
                alert('Could not save the transaction. Please try again.');
            }
        });
    }

    const planForm = document.getElementById('walletPlanForm');
    if (planForm) {
        planForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                type: 'plan',
                category: document.getElementById('walletPlanName').value.trim(),
                targetAmount: parseFloat(document.getElementById('walletPlanTarget').value),
                deadline: document.getElementById('walletPlanDeadline').value,
                reason: document.getElementById('walletPlanReason').value.trim(),
            };
            try {
                await walletFetchJSON(`${WALLET_API_BASE}/budgets`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                e.target.reset();
                closeWalletModal('walletPlanModal');
                await loadWalletPlans();
            } catch (err) {
                console.error('Could not save plan', err);
                alert('Could not save the plan. Please try again.');
            }
        });
    }

    function renderAllWalletTransactions() {
        const list = document.getElementById('walletAllTxList');
        if (!list) return;
        const typeFilter = document.getElementById('walletFilterType').value;
        const categoryFilter = document.getElementById('walletFilterCategory').value;

        const catSelect = document.getElementById('walletFilterCategory');
        if (catSelect.options.length <= 1) {
            const categories = [...new Set(walletState.transactions.map((t) => t.category))];
            catSelect.innerHTML = '<option value="">All categories</option>' +
                categories.map((c) => `<option value="${c}">${walletEscape(c)}</option>`).join('');
        }

        const filtered = walletState.transactions.filter((t) =>
            (!typeFilter || t.type === typeFilter) && (!categoryFilter || t.category === categoryFilter));

        list.innerHTML = filtered.length
            ? filtered.map(walletTxRowHTML).join('')
            : `<p style="text-align:center; color:var(--text-muted); font-size:0.84rem; padding:20px;">No transactions match these filters.</p>`;
    }

    const typeFilterEl = document.getElementById('walletFilterType');
    if (typeFilterEl) typeFilterEl.addEventListener('change', renderAllWalletTransactions);
    const catFilterEl = document.getElementById('walletFilterCategory');
    if (catFilterEl) catFilterEl.addEventListener('change', renderAllWalletTransactions);

    function initWallet() {
        loadWalletSummary();
        loadWalletPlans();
        loadWalletTransactions();
    }

    // Ensure wallet loads when wallet subpage is opened
    const originalOpen = window.openSettingsPage;
    window.openSettingsPage = function (pageId) {
        originalOpen(pageId);
        if (pageId === 'walletPageInner') {
            setTimeout(() => initWallet(), 60);
        }
    };
}

if (page === 'notifications' || page === 'alerts') {
    let activeNotifFilter = 'all';

    async function fetchNotifications() {
        try {
            const res = await apiFetch('/api/notification');
            notificationsData = (res.data || []).map(n => ({ ...n, id: n._id }));
            renderNotifications();
        } catch (err) {
            console.error('Failed to load notifications:', err);
            showToast('Failed to load notifications', 'error');
        }
    }

    function renderNotifications() {
        const notifList = document.getElementById('notifList');
        if (!notifList) return;

        // Filter logic
        let filtered = notificationsData;
        if (activeNotifFilter === 'unread') {
            filtered = notificationsData.filter(n => !n.read);
        } else if (activeNotifFilter === 'read') {
            filtered = notificationsData.filter(n => n.read);
        } else if (activeNotifFilter !== 'all') {
            // Support for type filtering if present
            filtered = notificationsData.filter(n => n.type === activeNotifFilter);
        }

        // Sort: Unread first, then date descending
        filtered.sort((a, b) => {
            if (a.read !== b.read) return a.read ? 1 : -1;
            return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
        });

        // Update counts
        const countLabel = document.getElementById('notifCountLabel');
        if (countLabel) {
            const noun = page === 'alerts' ? 'alert' : 'notification';
            countLabel.textContent = `${filtered.length} ${noun}${filtered.length === 1 ? '' : 's'}`;
        }

        const currentUnread = notificationsData.filter(n => !n.read).length;
        const unreadBanner = document.getElementById('notifUnreadBanner');
        const unreadText = document.getElementById('notifUnreadText');
        if (unreadBanner) {
            unreadBanner.style.display = currentUnread > 0 ? 'flex' : 'none';
            if (unreadText) {
                const noun = page === 'alerts' ? 'alert' : 'notification';
                unreadText.textContent = currentUnread === 1 ? `1 unread ${noun}` : `${currentUnread} unread ${noun}s`;
            }
        }

        // Disable/hide "Mark all read" if no unread
        const markAllBtn = document.getElementById('markAllReadBtn');
        if (markAllBtn) markAllBtn.disabled = currentUnread === 0;

        // Disable "Clear all" if no notifications at all
        const clearAllBtn = document.getElementById('clearAllNotifs');
        if (clearAllBtn) clearAllBtn.disabled = notificationsData.length === 0;

        if (filtered.length === 0) {
            let emptyMsg = 'All caught up!';
            let emptySub = 'No notifications yet. Start adding tasks, habits, and goals!';
            
            if (activeNotifFilter === 'unread') {
                emptyMsg = 'No unread alerts';
                emptySub = 'You have read all your notifications.';
            } else if (activeNotifFilter === 'read') {
                emptyMsg = 'No read alerts';
                emptySub = 'You haven\'t read any notifications yet.';
            } else if (activeNotifFilter !== 'all') {
                emptyMsg = `No ${activeNotifFilter} alerts`;
                emptySub = `You don't have any notifications of type "${activeNotifFilter}".`;
            }

            notifList.innerHTML = `
                <div class="notif-empty">
                    <div class="notif-empty-icon">🔔</div>
                    <div class="notif-empty-title">${emptyMsg}</div>
                    <div class="notif-empty-sub">${emptySub}</div>
                </div>`;
            return;
        }

        let html = '', lastGroup = null;
        filtered.forEach(n => {
            const date = n.createdAt || n.date;
            const group = notifGroupLabel(date);
            if (group !== lastGroup) {
                html += `<div class="notif-group-label">${group}</div>`;
                lastGroup = group;
            }
            const typeConfig = NOTIF_TYPES[n.type] || NOTIF_TYPES.system;
            html += `
                <div class="notif-item${n.read ? '' : ' unread'}" 
                     data-id="${n.id}" 
                     data-reference-id="${n.reference?.documentId || ''}" 
                     data-reference-type="${n.reference?.model || ''}"
                     style="cursor: ${n.reference?.documentId ? 'pointer' : 'default'}">
                    <div class="notif-icon-bubble ${n.type}">${typeConfig.icon}</div>
                    <div class="notif-content">
                        <div class="notif-title">${n.title}</div>
                        <div class="notif-body">${n.message || n.body}</div>
                        <div class="notif-time">${getRelativeTime(date)}</div>
                    </div>
                    <div class="notif-right">
                        <span class="notif-type-badge ${n.type}">${typeConfig.label}</span>
                        ${!n.read ? `<button class="notif-read-btn" data-read="${n.id}" title="Mark as read"><i class="fa-solid fa-check"></i></button>` : ''}
                        <button class="notif-dismiss-btn" data-dismiss="${n.id}" title="Delete">✕</button>
                    </div>
                </div>`;
        });

        notifList.innerHTML = html;

        // Event Listeners
        notifList.querySelectorAll('.notif-item').forEach(item => {
            item.addEventListener('click', () => {
                const refId = item.dataset.referenceId;
                const refType = item.dataset.referenceType;
                if (refId && refType) {
                    if (refType === 'Goal') window.location.href = 'planner.html';
                    else if (refType === 'Habit') window.location.href = 'habits.html';
                    else if (refType === 'Task') window.location.href = 'tasks.html';
                    else if (refType === 'Note') window.location.href = 'notebook.html';
                }
            });
        });
        notifList.querySelectorAll('[data-read]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.read;
                await markAsRead(id);
            });
        });

        notifList.querySelectorAll('[data-dismiss]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.dismiss;
                await deleteNotification(id);
            });
        });
    }

    async function markAsRead(id) {
        try {
            await apiFetch(`/api/notification/${id}/read`, { method: 'PATCH' });
            const notif = notificationsData.find(n => n.id === id);
            if (notif) notif.read = true;
            updateNotifBadge();
            renderNotifications();
        } catch (err) {
            showToast('Failed to mark as read', 'error');
        }
    }

    async function markAllAsRead() {
        const unreadOnly = notificationsData.filter(n => !n.read);
        if (unreadOnly.length === 0) return;
        try {
            await apiFetch('/api/notification/read-all', { method: 'PATCH' });
            notificationsData.forEach(n => n.read = true);
            updateNotifBadge();
            renderNotifications();
        } catch (err) {
            showToast('Failed to mark all as read', 'error');
        }
    }

    async function deleteNotification(id) {
        try {
            await apiFetch(`/api/notification/${id}`, { method: 'DELETE' });
            const idx = notificationsData.findIndex(n => n.id === id);
            if (idx !== -1) {
                notificationsData.splice(idx, 1);
                updateNotifBadge();
                renderNotifications();
            }
        } catch (err) {
            showToast('Failed to delete notification', 'error');
        }
    }

    async function clearAllNotifications() {
        const count = notificationsData.length;
        if (count === 0) return;
        
        confirmDelete(
            `Clear all ${count} notification${count === 1 ? '' : 's'}? This cannot be undone.`,
            async () => {
                try {
                    await apiFetch('/api/notification', { method: 'DELETE' });
                    notificationsData = [];
                    updateNotifBadge();
                    renderNotifications();
                } catch (err) {
                    showToast('Failed to clear notifications', 'error');
                }
            },
            { icon: '🔔', title: 'Clear Notifications?', confirmLabel: 'Clear All', btnColor: '#ef4444' }
        );
    }

    document.querySelectorAll('.notif-filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.notif-filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            activeNotifFilter = this.dataset.filter;
            renderNotifications();
        });
    });

    document.getElementById('markAllReadBtn')?.addEventListener('click', markAllAsRead);
    document.getElementById('clearAllNotifs')?.addEventListener('click', clearAllNotifications);

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', fetchNotifications);
    } else {
        fetchNotifications();
    }
    
    // Live polling for the notifications list when actively viewing it
    setInterval(fetchNotifications, 30000);
}


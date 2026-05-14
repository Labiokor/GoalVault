// ============================================================
// GOAL VAULT — login.js
// ============================================================

// ── Elements ─────────────────────────────────────────────────
const loginBtn      = document.getElementById('loginBtn');
const emailInput    = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const emailError    = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const togglePw      = document.getElementById('togglePw');

// ── Signup elements (declared at TOP — fixes scope bug) ──────
const signupOverlay   = document.getElementById('signupOverlay');
const closeSignup     = document.getElementById('closeSignup');
const signupBtn       = document.getElementById('signupBtn');
const toggleSignupPw  = document.getElementById('toggleSignupPw');
const signupEmailEl   = document.getElementById('signupEmail');
const signupPasswordEl= document.getElementById('signupPassword');
const confirmPasswordEl= document.getElementById('confirmPassword');

// ── Forgot password elements ─────────────────────────────────
const forgotBtn  = document.getElementById('forgotBtn');
const forgotCard = document.getElementById('forgotCard');
const backBtn    = document.getElementById('backBtn');
const resetBtn   = document.getElementById('resetBtn');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================
// TOAST NOTIFICATION
// ============================================================
function showToast(message, type = 'success') {
    // Remove existing toast if any
    const existing = document.getElementById('toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.textContent = message;

    const colors = {
        success: { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
        error:   { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
        info:    { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
    };
    const c = colors[type] || colors.success;

    Object.assign(toast.style, {
        position:     'fixed',
        bottom:       '30px',
        left:         '50%',
        transform:    'translateX(-50%) translateY(20px)',
        background:   c.bg,
        color:        c.color,
        border:       `1px solid ${c.border}`,
        padding:      '12px 24px',
        borderRadius: '99px',
        fontSize:     '0.88rem',
        fontWeight:   '600',
        fontFamily:   "'Inter', sans-serif",
        boxShadow:    '0 4px 20px rgba(0,0,0,0.12)',
        zIndex:       '99999',
        opacity:      '0',
        transition:   'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        whiteSpace:   'nowrap',
    });

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.style.opacity   = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    // Animate out after 3s
    setTimeout(() => {
        toast.style.opacity   = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================
// TOGGLE PASSWORD VISIBILITY — Login
// ============================================================
togglePw.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePw.classList.toggle('fa-eye',       !isPassword);
    togglePw.classList.toggle('fa-eye-slash',  isPassword);
});

// ============================================================
// TOGGLE PASSWORD VISIBILITY — Signup
// ============================================================
toggleSignupPw.addEventListener('click', () => {
    // ✅ Fixed — signupPasswordEl declared at top scope
    const isPassword = signupPasswordEl.type === 'password';
    signupPasswordEl.type = isPassword ? 'text' : 'password';
    toggleSignupPw.classList.toggle('fa-eye',       !isPassword);
    toggleSignupPw.classList.toggle('fa-eye-slash',  isPassword);
});

// ============================================================
// LOGIN
// ============================================================
function validateLogin() {
    let valid = true;

    // Validate email
    if (!emailRegex.test(emailInput.value.trim())) {
        emailError.style.display  = 'block';
        emailInput.style.borderColor = '#ef4444';
        valid = false;
    } else {
        emailError.style.display  = 'none';
        emailInput.style.borderColor = '';
    }

    // Validate password
    if (passwordInput.value.length < 6) {
        passwordError.style.display  = 'block';
        passwordInput.style.borderColor = '#ef4444';
        valid = false;
    } else {
        passwordError.style.display  = 'none';
        passwordInput.style.borderColor = '';
    }

    return valid;
}

loginBtn.addEventListener('click', () => {
    if (!validateLogin()) return;

    const emailVal   = emailInput.value.trim();
    const username   = emailVal.split('@')[0];
    const rememberMe = document.getElementById('rememberMe').checked;

    if (rememberMe) {
        localStorage.setItem('hubUser',  username);
        localStorage.setItem('hubEmail', emailVal);
    } else {
        sessionStorage.setItem('hubUser',  username);
        sessionStorage.setItem('hubEmail', emailVal);
    }

    // Button loading state
    loginBtn.textContent = 'Logging in...';
    loginBtn.disabled    = true;

    setTimeout(() => {
        window.location.href = 'index.html';
    }, 800);
});

// Enter key submits login
[emailInput, passwordInput].forEach(input => {
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') loginBtn.click();
    });
});

// ============================================================
// FORGOT PASSWORD
// ============================================================
forgotBtn.addEventListener('click', e => {
    e.preventDefault();
    forgotCard.style.display = 'block';

    // Hide login elements
    document.querySelector('.forgot-password').style.display = 'none';
    document.getElementById('loginBtn').style.display        = 'none';
    document.querySelector('.remember-me').style.display     = 'none';
    document.querySelector('.divider').style.display         = 'none';
    document.querySelector('.signup-text').style.display     = 'none';
    document.querySelectorAll('.input-group').forEach(el => el.style.display = 'none');

    document.querySelector('.login-card h2').textContent        = '🔑 Reset Password';
    document.querySelector('.login-card .subtitle').textContent = 'Enter your email to reset your password';
});

backBtn.addEventListener('click', () => {
    forgotCard.style.display = 'none';

    // Show login elements
    document.getElementById('loginBtn').style.display    = 'block';
    document.querySelector('.remember-me').style.display = 'flex';
    document.querySelector('.divider').style.display     = 'block';
    document.querySelector('.signup-text').style.display = 'block';
    document.querySelector('.forgot-password').style.display = 'block';
    document.querySelectorAll('.input-group').forEach(el => el.style.display = 'block');

    document.querySelector('.login-card h2').textContent        = 'Welcome back';
    document.querySelector('.login-card .subtitle').textContent = 'Log in to your Hub account';
});

resetBtn.addEventListener('click', () => {
    const resetEmail = document.getElementById('resetEmail').value.trim();
    if (!emailRegex.test(resetEmail)) {
        showToast('Please enter a valid email.', 'error');
        return;
    }
    resetBtn.textContent = '✅ Link Sent!';
    resetBtn.disabled    = true;
    showToast('Reset link sent! Check your inbox.', 'success');
    setTimeout(() => {
        resetBtn.textContent = 'Send Reset Link';
        resetBtn.disabled    = false;
    }, 3000);
});

// ============================================================
// SIGNUP POPUP
// ============================================================

// Open popup
document.querySelector('.signup-text a').addEventListener('click', e => {
    e.preventDefault();
    openSignup();
});

function openSignup() {
    signupOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // prevent bg scroll
    // Clear fields
    signupEmailEl.value      = '';
    signupPasswordEl.value   = '';
    confirmPasswordEl.value  = '';
    clearSignupErrors();
}

function closeSignupPopup() {
    signupOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Close via X button
closeSignup.addEventListener('click', closeSignupPopup);

// Close when clicking outside popup
signupOverlay.addEventListener('click', e => {
    if (e.target === signupOverlay) closeSignupPopup();
});

// Close on Escape key
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && signupOverlay.classList.contains('active')) {
        closeSignupPopup();
    }
});

// ── Signup validation helpers ─────────────────────────────────
function clearSignupErrors() {
    document.getElementById('signupEmailError').style.display    = 'none';
    document.getElementById('signupPasswordError').style.display = 'none';
    document.getElementById('confirmPasswordError').style.display= 'none';
    signupEmailEl.style.borderColor      = '';
    signupPasswordEl.style.borderColor   = '';
    confirmPasswordEl.style.borderColor  = '';
}

function validateSignup() {
    let valid = true;
    clearSignupErrors();

    // Email
    if (!emailRegex.test(signupEmailEl.value.trim())) {
        document.getElementById('signupEmailError').style.display = 'block';
        signupEmailEl.style.borderColor = '#ef4444';
        valid = false;
    }

    // Password
    if (signupPasswordEl.value.length < 6) {
        document.getElementById('signupPasswordError').style.display = 'block';
        signupPasswordEl.style.borderColor = '#ef4444';
        valid = false;
    }

    // Confirm password
    if (confirmPasswordEl.value !== signupPasswordEl.value) {
        document.getElementById('confirmPasswordError').style.display = 'block';
        confirmPasswordEl.style.borderColor = '#ef4444';
        valid = false;
    }

    return valid;
}

// ── Signup submit ─────────────────────────────────────────────
signupBtn.addEventListener('click', () => {
    if (!validateSignup()) return;

    const username = signupEmailEl.value.trim().split('@')[0];
    localStorage.setItem('hubUser',  username);
    localStorage.setItem('hubEmail', signupEmailEl.value.trim());

    signupBtn.textContent = '✅ Account Created!';
    signupBtn.disabled    = true;

    showToast(`Welcome aboard, ${username}! 🎉`, 'success');

    setTimeout(() => {
        closeSignupPopup();
        window.location.href = 'index.html';
    }, 1200);
});

// Enter key in signup fields
[signupEmailEl, signupPasswordEl, confirmPasswordEl].forEach(input => {
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') signupBtn.click();
    });
});
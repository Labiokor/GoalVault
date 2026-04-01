const loginBtn = document.getElementById('loginBtn');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const togglePw = document.getElementById('togglePw');

// Toggle password visibility
togglePw.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePw.classList.toggle('fa-eye', !isPassword);
    togglePw.classList.toggle('fa-eye-slash', isPassword);
});
// Login logic
loginBtn.addEventListener('click', () => {
    let valid = true;
    // Validate email
    const emailVal = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
        emailError.style.display = 'block';
        emailInput.style.borderColor = '#e74c3c';
        valid = false;
    } else {
        emailError.style.display = 'none';
        emailInput.style.borderColor = '#ddd';
    }
    // Validate password
    if (passwordInput.value.length < 6) {
        passwordError.style.display = 'block';
        passwordInput.style.borderColor = '#e74c3c';
        valid = false;
    } else {
        passwordError.style.display = 'none';
        passwordInput.style.borderColor = '#ddd';
    }
    // If valid, redirect to dashboard
    if (valid) {
        const username = emailVal.split('@')[0];
        const rememberMe = document.getElementById('rememberMe').checked;
if (rememberMe) {
        localStorage.setItem('hubUser', username);
        localStorage.setItem('hubEmail', emailVal);
    } 
 else {
        sessionStorage.setItem('hubUser', username);
        sessionStorage.setItem('hubEmail', emailVal);
}
    loginBtn.textContent = 'Logging in...';
        loginBtn.disabled = true;
        setTimeout(() => {
            window.location.href = 'goal code.html';
        }, 800);
    }
});
// Allow Enter key to submit
[emailInput, passwordInput].forEach(input => {
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') loginBtn.click();
    });
});
const forgotBtn = document.getElementById('forgotBtn');
const forgotCard = document.getElementById('forgotCard');
const backBtn = document.getElementById('backBtn');
const resetBtn = document.getElementById('resetBtn');

// Show forgot password form
forgotBtn.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('.login-card > *:not(#forgotCard)') ;
    forgotCard.style.display = 'block';
    forgotBtn.closest('.forgot-password').style.display = 'none';
    document.getElementById('loginBtn').style.display = 'none';
    document.querySelector('.remember-me').style.display = 'none';
    document.querySelector('.divider').style.display = 'none';
    document.querySelector('.signup-text').style.display = 'none';
    document.querySelectorAll('.input-group').forEach(el => el.style.display = 'none');
    document.querySelector('.login-card h2').textContent = '🔑 Forgot Password';
    document.querySelector('.login-card .subtitle').textContent = 'Enter your email to reset your password';
});
// Back to login
backBtn.addEventListener('click', () => {
    forgotCard.style.display = 'none';
    document.getElementById('loginBtn').style.display = 'block';
    document.querySelector('.remember-me').style.display = 'flex';
    document.querySelector('.divider').style.display = 'block';
    document.querySelector('.signup-text').style.display = 'block';
    document.querySelectorAll('.input-group').forEach(el => el.style.display = 'block');
    document.querySelector('.forgot-password').style.display = 'block';
    document.querySelector('.login-card h2').textContent = 'Welcome back 👋';
    document.querySelector('.login-card .subtitle').textContent = 'Log in to your Hub account';
});
// Send reset link
resetBtn.addEventListener('click', () => {
    const resetEmail = document.getElementById('resetEmail').value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
        alert('Please enter a valid email.');
        return;
    }
    resetBtn.textContent = '✅ Link Sent!';
    resetBtn.disabled = true;
    setTimeout(() => {
        resetBtn.textContent = 'Send Reset Link';
        resetBtn.disabled = false;
    }, 3000);
});
const signupOverlay = document.getElementById('signupOverlay');
const closeSignup = document.getElementById('closeSignup');
const signupBtn = document.getElementById('signupBtn');
const toggleSignupPw = document.getElementById('toggleSignupPw');

// Open signup popup
document.querySelector('.signup-text a').addEventListener('click', (e) => {
    e.preventDefault();
    signupOverlay.classList.add('active');
});
// Close signup popup
closeSignup.addEventListener('click', () => {
    signupOverlay.classList.remove('active');
});
// Close when clicking outside
signupOverlay.addEventListener('click', (e) => {
    if (e.target === signupOverlay) {
        signupOverlay.classList.remove('active');
    }
});
// Toggle signup password visibility
toggleSignupPw.addEventListener('click', () => {
    const isPassword = signupPassword.type === 'password';
    signupPassword.type = isPassword ? 'text' : 'password';
    toggleSignupPw.classList.toggle('fa-eye', !isPassword);
    toggleSignupPw.classList.toggle('fa-eye-slash', isPassword);
});

// Signup logic
signupBtn.addEventListener('click', () => {
    const signupEmail = document.getElementById('signupEmail');
    const signupPassword = document.getElementById('signupPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const signupEmailError = document.getElementById('signupEmailError');
    const signupPasswordError = document.getElementById('signupPasswordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let valid = true;

    // Validate email
    if (!emailRegex.test(signupEmail.value.trim())) {
        signupEmailError.style.display = 'block';
        signupEmail.style.borderColor = '#e74c3c';
        valid = false;
    } else {
        signupEmailError.style.display = 'none';
        signupEmail.style.borderColor = '#ddd';
    }
    // Validate password
    if (signupPassword.value.length < 6) {
        signupPasswordError.style.display = 'block';
        signupPassword.style.borderColor = '#e74c3c';
        valid = false;
    } else {
        signupPasswordError.style.display = 'none';
        signupPassword.style.borderColor = '#ddd';
    }
    // confirm password
    if (confirmPassword.value !== signupPassword.value) {
        confirmPasswordError.style.display = 'block';
        confirmPassword.style.borderColor = '#e74c3c';
        valid = false;
    } else {
        confirmPasswordError.style.display = 'none';
        confirmPassword.style.borderColor = '#ddd';
    }
    if (valid) {
        const username = signupEmail.value.trim().split('@')[0];
        localStorage.setItem('hubUser', username);
        localStorage.setItem('hubEmail', signupEmail.value.trim());
        signupBtn.textContent = '✅ Account Created!';
        signupBtn.disabled = true;
        setTimeout(() => {
            signupOverlay.classList.remove('active');
            window.location.href = 'goal code.html';
        }, 1000);
    }
});
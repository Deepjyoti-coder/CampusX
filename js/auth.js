// ============================================================
//  CampusAI — auth.js  (Login Page Logic)
// ============================================================

let selectedRole = 'student';
let authMode = 'login';

const signupAllowedRoles = new Set(['student', 'alumni']);
const AUTH_API_ORIGIN = globalThis.CAMPUSAI_API_ORIGIN
    || (globalThis.location.port === '5000' ? globalThis.location.origin : 'http://localhost:5000');

const DEMO_CREDENTIALS = {
    student: { email: 'deep@campus.edu' },
    librarian: { email: 'librarian@campus.edu' },
    admin: { email: 'admin@campus.edu' },
    alumni: { email: 'priya@alumni.edu' }
};

function getPageByRole(role) {
    const pages = { student: 'student.html', librarian: 'librarian.html', admin: 'admin.html', alumni: 'alumni.html' };
    return pages[role] || 'student.html';
}

function showOverlay(message) {
    const overlay = document.getElementById('loadingOverlay');
    const msg = document.getElementById('loadingMsg');
    overlay.style.display = 'flex';
    msg.textContent = message;
}

function hideOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    overlay.style.display = 'none';
}

function setAuthMode(mode) {
    authMode = mode;
    const isSignup = mode === 'signup';
    document.body.classList.toggle('signup-mode', isSignup);

    document.querySelectorAll('.mode-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    document.getElementById('authTitle').textContent = isSignup ? 'Create account' : 'Welcome back';
    document.getElementById('authSub').textContent = isSignup
        ? 'Create your profile and access CampusAI.'
        : 'Select your role and sign in to continue.';

    document.getElementById('fullNameGroup').classList.toggle('hidden', !isSignup);
    document.getElementById('confirmPasswordGroup').classList.toggle('hidden', !isSignup);
    document.getElementById('signupHint').classList.toggle('hidden', !isSignup);
    document.getElementById('demoLoginHint').classList.toggle('hidden', isSignup);
    document.getElementById('authRememberBlock').classList.toggle('hidden', isSignup);
    document.getElementById('googleCompactBtn').classList.toggle('hidden', !isSignup);
    document.getElementById('oauthDivider').classList.toggle('hidden', isSignup);
    document.getElementById('oauthBtn').classList.toggle('hidden', isSignup);
    document.getElementById('loginBtn').textContent = isSignup ? 'Create your account' : 'Sign In to CampusAI';
}

function selectRole(card) {
    document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedRole = card.dataset.role;

    if (authMode === 'signup' && !signupAllowedRoles.has(selectedRole)) {
        alert('Self-signup is only available for Student and Alumni roles.');
    }

    // Auto-fill demo credentials that match seeded users.
    const creds = DEMO_CREDENTIALS[selectedRole] || DEMO_CREDENTIALS.student;
    if (authMode === 'login') {
        const emailInput = document.getElementById('emailInput');
        const currentEmail = (emailInput.value || '').trim().toLowerCase();
        const isDemoEmail = Object.values(DEMO_CREDENTIALS)
            .some(({ email }) => email.toLowerCase() === currentEmail);

        // Keep user-typed custom emails intact; only swap auto-filled demo emails.
        if (!currentEmail || isDemoEmail) {
            emailInput.value = creds.email;
        }
    }
}

function fillDemoCredentials() {
    if (authMode !== 'login') return;

    const creds = DEMO_CREDENTIALS[selectedRole] || DEMO_CREDENTIALS.student;
    const demoPassword = document.getElementById('demoPasswordValue')?.value || '';
    document.getElementById('emailInput').value = creds.email;
    document.getElementById('passwordInput').value = demoPassword;
}

function handlePrimaryAuth() {
    if (authMode === 'signup') {
        return handleSignup();
    }
    return handleLogin();
}

async function handleSignup() {
    const fullName = document.getElementById('fullNameInput').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const pass = document.getElementById('passwordInput').value.trim();
    const confirm = document.getElementById('confirmPasswordInput').value.trim();

    if (!signupAllowedRoles.has(selectedRole)) {
        alert('Please select Student or Alumni to create an account.');
        return;
    }
    if (!fullName || !email || !pass || !confirm) {
        alert('Please complete all signup fields.');
        return;
    }
    if (pass.length < 8) {
        alert('Password must be at least 8 characters long.');
        return;
    }
    if (pass !== confirm) {
        alert('Password and confirm password do not match.');
        return;
    }

    showOverlay('Creating your account...');
    try {
        const response = await api.post('/auth/register', {
            name: fullName,
            email,
            password: pass,
            role: selectedRole
        });

        if (!response?.success) {
            hideOverlay();
            alert(response?.message || 'Signup failed. Please try again.');
            return;
        }

        api.saveLogin(response.data);
        const role = response.data?.user?.role || selectedRole;
        globalThis.location.href = getPageByRole(role);
    } catch {
        hideOverlay();
        alert('Unable to create account right now. Please try again in a moment.');
    }
}

async function handleLogin() {
    const email = document.getElementById('emailInput').value.trim();
    const pass = document.getElementById('passwordInput').value.trim();
    if (!email || !pass) { alert('Please enter your credentials.'); return; }

    showOverlay('Authenticating...');
    try {
        const response = await api.post('/auth/login', { email, password: pass, role: selectedRole });
        if (!response?.success) {
            hideOverlay();
            alert(response?.message || 'Login failed. Please try again.');
            return;
        }

        api.saveLogin(response.data);
        const role = response.data?.user?.role || selectedRole;
        globalThis.location.href = getPageByRole(role);
    } catch {
        hideOverlay();
        alert('Unable to login right now. Please try again in a moment.');
    }
}

function handleOAuth(provider) {
    if (provider !== 'google') return;
    showOverlay('Redirecting to Google...');
    const oauthRole = ['student', 'alumni'].includes(selectedRole) ? selectedRole : 'student';
    globalThis.location.href = `${AUTH_API_ORIGIN}/api/auth/google/start?role=${encodeURIComponent(oauthRole)}`;
}

// Allow Enter key to submit
document.addEventListener('DOMContentLoaded', () => {
    // Prevent stale overlay state from blocking clicks when page is restored.
    hideOverlay();

    setAuthMode('login');

    const selectedCard = document.querySelector('.role-card.selected');
    if (selectedCard) selectRole(selectedCard);

    const params = new URLSearchParams(globalThis.location.search);
    const authError = params.get('authError');
    if (authError) {
        alert('Google sign-in failed. Please try again.');
    }

    // Intentionally avoid auto-redirect on page load.
    // Users should always land on the main login/role-selection interface first.
    api.get('/auth/me').then((response) => {
        if (response?.success && response?.data) {
            const user = response.data;
            api.saveLogin({ token: localStorage.getItem('campusai_token') || '', user });
        }
    }).catch(() => {
        // Ignore when unauthenticated.
    });

    ['passwordInput', 'confirmPasswordInput'].forEach((id) => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handlePrimaryAuth();
        });
    });
});

// Browsers can restore previous DOM state (including loading overlay) on back/forward.
globalThis.addEventListener('pageshow', () => {
    hideOverlay();
});

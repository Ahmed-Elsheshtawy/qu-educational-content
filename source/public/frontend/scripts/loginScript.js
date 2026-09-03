// DOM elements
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('password');
const loginBtn = loginForm.querySelector('.login-btn');
const errorMessage = document.getElementById('error-message');

// Handle form submission
loginForm.addEventListener('submit', handleLogin);

async function handleLogin(e) {
    e.preventDefault();
    
    const password = passwordInput.value.trim();
    
    if (!password) {
        showError('Please enter a password');
        return;
    }

    // Clear previous errors
    clearError();
    
    // Set loading state
    setLoading(true);

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (response.ok) {
            // Success - JWT token is now stored in httpOnly cookie
            // Redirect to admin panel
            window.location.href = '/admin';
        } else {
            // Show error message
            showError(data.error || 'Invalid password. Please try again.');
            setLoading(false);
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Connection error. Please try again.');
        setLoading(false);
    }
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Clear error message
function clearError() {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
}

// Set loading state
function setLoading(isLoading) {
    if (isLoading) {
        loginBtn.disabled = true;
        loginBtn.classList.add('loading');
        loginBtn.querySelector('.btn-text').textContent = 'Signing in...';
    } else {
        loginBtn.disabled = false;
        loginBtn.classList.remove('loading');
        loginBtn.querySelector('.btn-text').textContent = 'Sign In';
    }
}

// Clear error on input
passwordInput.addEventListener('input', () => {
    if (errorMessage.textContent) {
        clearError();
    }
});

// Auto-focus password field
passwordInput.focus();

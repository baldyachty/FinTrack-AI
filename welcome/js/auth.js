// Auth forms functionality
class AuthForms {
    constructor() {
        console.log('AuthForms initializing...');
        
        // Verify Utils is loaded
        if (!window.Utils) {
            console.error('Utils module not found! Please ensure utils.js is loaded before auth.js');
            return;
        }
        
        
        // Define the base URL for our backend API
        this.apiUrl = 'http://127.0.0.1:5000';
        
        this.pendingEmail = null;

        this.init();
    }

    // Floating particles in auth section
    initHeroParticles() {
        const container = document.querySelector('.hero-particles');
        if (!container) return;
        container.innerHTML = '';
        const count = 14;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'hero-particle';
            const size = 16 + Math.random() * 32;
            p.style.width = p.style.height = size + 'px';
            p.style.left = (Math.random() * 90) + '%';
            p.style.top = (Math.random() * 80) + '%';
            p.style.animationDuration = (6 + Math.random() * 6) + 's';
            p.style.animationDelay = (-Math.random() * 8) + 's';
            container.appendChild(p);
        }
    }

    // Interactive ripple effect for auth section
    initHeroRipples() {
        const section = document.querySelector('.auth-section');
        const ripples = document.querySelector('.hero-ripples');
        if (!section || !ripples) return;
        section.addEventListener('pointerdown', e => {
            if (e.button !== 0 && e.pointerType !== 'touch') return;
            const rect = section.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const size = Math.max(rect.width, rect.height) * 0.5;
            const ripple = document.createElement('div');
            ripple.className = 'hero-ripple';
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (x - size / 2) + 'px';
            ripple.style.top = (y - size / 2) + 'px';
            ripples.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove());
        });
    }

    init() {
        console.log('Initializing auth forms...');
        
        try {
            window.Utils.accentColor.initialize();
            window.Utils.darkMode.initialize();
            console.log('Dark mode and accent initialized successfully');
        } catch (error) {
            console.error('Error initializing theme:', error);
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        //  1. Form Listeners
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            console.log('Login form found, adding submit listener');
            loginForm.addEventListener('submit', (e) => {
                console.log('Login form submitted');
                this.handleLogin(e);
            });
        }

        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            console.log('Register form found, adding submit listener');
            registerForm.addEventListener('submit', (e) => {
                console.log('Register form submitted');
                this.handleRegister(e);
            });
        }

        //  2. Theme Listener 
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            console.log('Dark mode toggle found, adding click listener');
            darkModeToggle.addEventListener('click', () => this.toggleDarkMode());
        }

        //  3. Policy Modal Listeners
        const tosLink = document.getElementById('tosLink');
        const privacyLink = document.getElementById('privacyLink');
        const closeModal = document.getElementById('closeModal');
        const modalAccept = document.getElementById('modalAccept');
        const modal = document.getElementById('policyModal');

        // Open Modal for Terms of Service
        if (tosLink) {
            tosLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPolicy('tos');
            });
        }

        // Open Modal for Privacy Policy
        if (privacyLink) {
            privacyLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPolicy('privacy');
            });
        }

        // Close logic: Clicking 'X', the 'Understand' button, or clicking outside on the background overlay
        const closeElements = [closeModal, modalAccept, modal?.querySelector('.modal-overlay')];
        
        closeElements.forEach(element => {
            if (element) {
                element.addEventListener('click', () => {
                    if (modal) modal.classList.remove('active');
                });
            }
        });
        // Forgot Password Toggle Logic
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const backToLoginLink = document.getElementById('backToLogin');
const loginView = document.getElementById('loginView');
const forgotPasswordSection = document.getElementById('forgotPasswordSection');

if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginView.style.display = 'none';
        forgotPasswordSection.style.display = 'block';
    });
}

if (backToLoginLink) {
    backToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        forgotPasswordSection.style.display = 'none';
        loginView.style.display = 'block';
    });
}

//  Send Reset Link Action
const sendResetBtn = document.getElementById('sendResetBtn');
if (sendResetBtn) {
    sendResetBtn.addEventListener('click', () => this.handleForgotPassword());
}

    }
    showPolicy(type) {
    const modal = document.getElementById('policyModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    if (!modal || !title || !body) return;

    if (type === 'tos') {
        title.textContent = 'Detailed Terms of Service';
        body.innerHTML = `
            <h3>1. Agreement to Terms</h3>
            <p>By creating an account at FinTrack AI, you agree to be bound by these Terms of Service. These terms constitute a legally binding agreement between you and FinTrack AI, managed by Brian Macharia Mwangi. If you do not agree with any part of these terms, you are prohibited from using the service.</p>
            
            <h3>2. Description of AI Services</h3>
            <p>FinTrack AI provides automated financial analysis tools. Our <strong>ARIMA (AutoRegressive Integrated Moving Average)</strong> models generate balance forecasts based on historical trends. Our <strong>Isolation Forest</strong> algorithms monitor your transactions to identify "anomalies" or unusual spending behaviors. You acknowledge that these are mathematical projections and not absolute certainties.</p>
            
            <h3>3. Financial Advice Disclaimer</h3>
            <p>The information provided by the FinTrack AI dashboard, including budget status, category predictions, and cash flow forecasts, is for informational and educational purposes only. It does not constitute professional financial, investment, or legal advice. You should consult with a certified financial planner before making significant financial decisions. We are not liable for any financial losses incurred through the use of our automated tools.</p>
            
            <h3>4. User Conduct & Prohibited Activities</h3>
            <p>You agree not to misuse the service by attempting to circumvent security measures, reverse-engineer our AI model training logic, or use the <strong>Gemini Chatbot</strong> to generate harmful or illegal content. We reserve the right to terminate access for any user found to be interfering with the integrity of our database or API endpoints.</p>
            
            <h3>5. Intellectual Property</h3>
            <p>The "FinTrack AI" brand, the cinematic UI design, and the custom-trained AI model structures (stored as <code>.joblib</code> files) are the intellectual property of the developer. Users are granted a limited, non-exclusive license to use the interface for personal financial management only.</p>
            
            <h3>6. Limitation of Liability</h3>
            <p>To the maximum extent permitted by law, FinTrack AI shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the service, including but not limited to data loss due to server interruptions or inaccuracies in AI-generated predictions.</p>
        `;
    } else {
        title.textContent = 'Comprehensive Privacy Policy';
        body.innerHTML = `
            <h3>1. Introduction to Data Privacy</h3>
            <p>At FinTrack AI, we believe your financial data belongs to you. This policy outlines our commitment to protecting the privacy of Brian Macharia Mwangi's users (fintrackai@gmail.com). We use industry-standard encryption and security protocols to ensure your information remains confidential.</p>
            
            <h3>2. Technical Data Security</h3>
            <p>We do not store plain-text passwords. Every password is processed through the <strong>Bcrypt hashing algorithm</strong>, creating a secure, one-way cryptographic representation. Furthermore, session security is maintained through <strong>JSON Web Tokens (JWT)</strong>, ensuring that only authenticated users can access specific <code>user_id</code> data.</p>
            
            <h3>3. AI Model Data Usage</h3>
            <p>Your transaction history is used locally to train a personalized <strong>K-Nearest Neighbors (KNN)</strong> model. This model learns your specific spending habits to suggest categories for future transactions. This training data is stored in isolated <code>.joblib</code> files associated with your unique account and is not used to train models for other users.</p>
            
            <h3>4. Third-Party API Integration (Gemini AI)</h3>
            <p>Our "Smart Chat" feature utilizes the <strong>Google Gemini API</strong>. When you ask a question, a sanitized summary of your recent transaction data is sent to the API to generate an intelligent response. We do not share your email, name, or hashed password with Google or any other third-party providers.</p>
            
            <h3>5. Data Retention and Deletion Rights</h3>
            <p>We retain your data for as long as your account is active. You have the "Right to be Forgotten," which allows you to request the permanent deletion of your profile, all transaction history, and your personalized AI model files from our <code>fintrack.db</code> database.</p>
            
            <h3>6. Cookies and Local Storage</h3>
            <p>We use your browser's local storage to save UI preferences, such as your preferred <strong>Theme</strong> (Dark or Light mode) and <strong>Accent Color</strong>. This ensures a consistent experience every time you log in without needing to reset your settings.</p>
            
            <h3>7. Updates to this Policy</h3>
            <p>We may update this Privacy Policy to reflect changes in AI technology or privacy laws. Users will be notified of significant changes via the email address (fintrackintelligence@gmail.com) provided during registration.</p>
        `;
    }

    modal.classList.add('active');
}
async handleForgotPassword() {
    const email = document.getElementById('forgotEmail')?.value;

    if (!email || !Utils.validation.email(email)) {
        Utils.toast.show('Please enter a valid email address', 'error');
        return;
    }

    this.setFormLoading(true);

    try {
        const response = await fetch(`${this.apiUrl}/api/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email }),
        });

        const data = await response.json();
        
        // Even if the email isn't found, we show a success message for security
        Utils.toast.show(data.msg || 'If that account exists, a reset link has been sent.', 'success');
        
        // Optionally switch back to login after 2 seconds
        setTimeout(() => {
            document.getElementById('backToLogin').click();
            this.setFormLoading(false);
        }, 2000);

    } catch (error) {
        console.error('Forgot Password error:', error);
        this.setFormLoading(false);
        Utils.toast.show('An error occurred. Please try again.', 'error');
    }
}
async handleResetPassword(e) {
    e.preventDefault();
    console.log('--- STARTING RESET PROCESS ---');
    
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const password = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmNewPassword')?.value;

    if (!token) {
        Utils.toast.show('Invalid or expired reset link.', 'error');
        return;
    }

    if (password !== confirmPassword) {
        Utils.toast.show('Passwords do not match.', 'error');
        return;
    }

    this.setFormLoading(true);

    try {
        const response = await fetch(`${this.apiUrl}/api/reset-password`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ password: password }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.msg);

        // Turn off loading to reactivate UI
        this.setFormLoading(false);
        console.log('SUCCESS: Password changed in database.');

        Utils.toast.show('Password updated! Redirecting to login...', 'success');
        
        // Use assign and a slightly shorter timer
        setTimeout(() => {
            console.log('REDIRECTING NOW...');
            window.location.href('/welcome/login.html');
        }, 1500);

    } catch (error) {
        console.error('RESET ERROR:', error);
        this.setFormLoading(false);
        Utils.toast.show(error.message || 'Failed to reset password.', 'error');
    }
}    
    async handleLogin(e) {
        e.preventDefault();
        
        // 1. Identify which step we are in
        const codeField = document.getElementById('2faCode');
        const code = codeField?.value;

        //  STEP 2: 2FA VERIFICATION 
        if (code && this.pendingEmail) {
            console.log('2FA Step: Verifying code...');
            this.setFormLoading(true);
            return this.handle2faLogin(this.pendingEmail, code);
        }

        // STEP 1: PASSWORD LOGIN 
        console.log('Password Step: Processing login...');
        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;

        if (!email || !Utils.validation.email(email)) {
            Utils.toast.show('Please enter a valid email address', 'error');
            return;
        }

        if (!password || password.length < 6) {
            Utils.toast.show('Password must be at least 6 characters', 'error');
            return;
        }

        this.setFormLoading(true);
        
        try {
            const response = await fetch(`${this.apiUrl}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || 'Login failed. Please try again.');
            }

            // Check if backend requires 2FA
            if (data.two_factor_required) {
                this.pendingEmail = data.email;
                
                // Update UI to 2FA mode
                document.getElementById('email').parentElement.style.display = 'none';
                document.getElementById('password').parentElement.style.display = 'none';
                document.querySelector('.form-actions').style.display = 'none';
                document.getElementById('2faSection').style.display = 'block';
                
                this.setFormLoading(false);
                
                // Overriding the button text after setFormLoading resets it
                const submitBtn = document.querySelector('#loginForm button[type="submit"]');
                if (submitBtn) submitBtn.textContent = 'Verify Code';
                
                return; 
            }

            // Normal login success (No 2FA enabled)
            this._finalizeLogin(data);
            
        } catch (error) {
            console.error('Login error:', error);
            this.setFormLoading(false);
            Utils.toast.show(error.message, 'error');
        }
    }
    async handle2faLogin(email, code) {
        try {
            const response = await fetch(`${this.apiUrl}/api/2fa/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || 'Invalid authentication code');
            }

            // Use the shared helper to finish the login
            this._finalizeLogin(data);

        } catch (error) {
            console.error('2FA Verification error:', error);
            this.setFormLoading(false);
            
            // Force button text back to "Verify Code" so the user knows they are still in Step 2
            const submitBtn = document.querySelector('#loginForm button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Verify Code';
            
            Utils.toast.show(error.message, 'error');
        }
    }

    _finalizeLogin(data) {
        // Store the REAL token and user data from the backend
        localStorage.setItem('fintrack_auth', JSON.stringify({
            user: data.user,
            token: data.token
        }));

        sessionStorage.setItem('just_logged_in', 'true');
        Utils.toast.show('Login successful! Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    }
    
    async handleRegister(e) {
        e.preventDefault();
        console.log('Processing registration...');
        
        const name = document.getElementById('name')?.value;
        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        const terms = document.getElementById('terms')?.checked;

        console.log('Validating registration inputs...');
        
        if (!name || name.length < 2) {
            Utils.toast.show('Please enter your full name', 'error');
            return;
        }
        if (!email || !Utils.validation.email(email)) {
            Utils.toast.show('Please enter a valid email address', 'error');
            return;
        }
        if (!password || password.length < 6) {
            Utils.toast.show('Password must be at least 6 characters', 'error');
            return;
        }
        if (password !== confirmPassword) {
            Utils.toast.show('Passwords do not match', 'error');
            return;
        }
        if (!terms) {
            Utils.toast.show('Please accept the Terms of Service', 'error');
            return;
        }

        this.setFormLoading(true);
        
        try {
            // This is the REAL backend call
            const response = await fetch(`${this.apiUrl}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Throw an error with the backend message
                throw new Error(data.msg || 'Registration failed. Please try again.');
            }
            
            // Registration Successful
            console.log('Registration successful, storing auth data...');

            // Store the REAL token and user data from the backend
            localStorage.setItem('fintrack_auth', JSON.stringify({
                user: data.user,
                token: data.token
            }));

            sessionStorage.setItem('just_logged_in', 'true');
            Utils.toast.show('Registration successful! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } catch (error) {
            console.error('Registration error:', error);
            this.setFormLoading(false);
            // Show the specific error message
            Utils.toast.show(error.message, 'error');
        }
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Dark mode methods 
    initializeDarkMode() {
        const savedTheme = localStorage.getItem('fintrack_theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            this.enableDarkMode();
        }
    }
    toggleDarkMode() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            this.disableDarkMode();
        } else {
            this.enableDarkMode();
        }
    }
    enableDarkMode() {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('fintrack_theme', 'dark');
    }
    disableDarkMode() {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('fintrack_theme', 'light');
    }

    // setFormLoading
    setFormLoading(isLoading) {
        const form = document.querySelector('form');
        if (!form) return;
        const inputs = form.querySelectorAll('input');
        const submitBtn = form.querySelector('button[type="submit"]');
        if (isLoading) {
            inputs.forEach(input => {
                input.disabled = true;
            });
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `
                <svg class="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
                `;
            }
        } else {
            inputs.forEach(input => {
                input.disabled = false;
            });
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = form.id === 'loginForm' ? 'Sign In' : 'Create Account';
            }
        }
    }
}


// Initialize auth forms
document.addEventListener('DOMContentLoaded', () => {
    //  Now it also checks for 'resetPasswordForm'
    if (document.getElementById('loginForm') || 
        document.getElementById('registerForm') || 
        document.getElementById('resetPasswordForm')) {
        
        const auth = new AuthForms();
        window.authForms = auth;
        auth.initHeroParticles();
        auth.initHeroRipples();
        console.log('AuthForms initialized for this page.');
    }
});
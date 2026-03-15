//  WELCOME PAGE FUNCTIONALITY

class WelcomePage {
  constructor() {
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.initializeDarkMode();
    this.initializeAccentColor(); 
    this.animateOnLoad();
  }

  // EVENT LISTENERS
  setupEventListeners() {
    // Navigation buttons
    document.getElementById('getStartedBtn')?.addEventListener('click', () => this.handleGetStarted());
    document.getElementById('getStartedBtnMain')?.addEventListener('click', () => this.handleGetStarted());
    document.getElementById('loginBtn')?.addEventListener('click', () => this.handleLogin());
    // document.getElementById('demoBtn')?.addEventListener('click', () => this.showDemo());
    document.getElementById('closeDemo')?.addEventListener('click', () => this.closeDemo());

    // Dark Mode Toggle
    document.getElementById('darkModeToggle')?.addEventListener('click', () => this.toggleDarkMode());
  }

  // NAVIGATION HANDLERS
  handleGetStarted() {
    window.location.href = 'register.html';
  }

  handleLogin() {
    window.location.href = 'login.html';
  }

  showDemo() {
    const modal = document.getElementById('demoModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevents background scrolling
        console.log('Demo modal opened');
    }
}
closeDemo() {
    const modal = document.getElementById('demoModal');
    const iframe = document.getElementById('demoVideoFrame');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; 

        
        // in a way that YouTube's security allows
        if (iframe) {
            const currentSrc = iframe.src;
            iframe.src = ""; // Clear it first
            iframe.src = currentSrc; // Then reset it
        }
    }
}



  // DARK MODE
  initializeDarkMode() {
    // Check if the user previously chose a theme
    const savedTheme = localStorage.getItem('fintrack_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Apply the theme immediately on load
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  toggleDarkMode() {
    // This calls the centralized logic in utils.js to switch theme and save to memory
    window.Utils.darkMode.toggle();
  }

  enableDarkMode() {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('fintrack_theme', 'dark');
    this.animateThemeTransition();
  }

  disableDarkMode() {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('fintrack_theme', 'light');
    this.animateThemeTransition();
  }

  // ACCENT COLOR LOGIC 
  initializeAccentColor() {
    const savedAccent = localStorage.getItem('fintrack_accent') || '#6366f1'; // Default
    this.applyAccentColor(savedAccent);
    console.log('WelcomePage: Accent color initialized:', savedAccent);
  }

  applyAccentColor(color) {
    if (!color || !color.startsWith('#')) {
        console.error("Invalid color format passed to applyAccentColor:", color);
        return;
    }
    try {
      const rgbArray = this.hexToRgb(color);
      if (!rgbArray) throw new Error(`Could not convert hex "${color}" to RGB`);

      const root = document.documentElement;
      //  Set the CSS variables
      root.style.setProperty('--primary', color);
      root.style.setProperty('--primary-rgb', rgbArray.join(', '));
      root.style.setProperty('--primary-dark', this.adjustColor(color, -0.15)); // 15% darker
      root.style.setProperty('--primary-light', this.adjustColor(color, 0.30)); // 30% lighter
      // End Set CSS variables

    } catch (error) {
        console.error("Error applying accent color:", error);
    }
  }
  
  hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [ 
        parseInt(result[1], 16), 
        parseInt(result[2], 16), 
        parseInt(result[3], 16) 
    ] : null;
  }

  adjustColor(color, percent) {
    if (!color.startsWith('#')) return color;

    let R = parseInt(color.substring(1,3),16);
    let G = parseInt(color.substring(3,5),16);
    let B = parseInt(color.substring(5,7),16);

    R = Math.round(R * (1.0 + percent));
    G = Math.round(G * (1.0 + percent));
    B = Math.round(B * (1.0 + percent));

    R = Math.min(255, Math.max(0, R));  
    G = Math.min(255, Math.max(0, G));  
    B = Math.min(255, Math.max(0, B));  
    
    const RR = R.toString(16).padStart(2, '0');
    const GG = G.toString(16).padStart(2, '0');
    const BB = B.toString(16).padStart(2, '0');

    return `#${RR}${GG}${BB}`;
  }
  

  // ANIMATION
  animateOnLoad() {
    // Hero animations
    const heroElements = document.querySelectorAll('.hero-badge, .hero-title, .hero-description, .hero-actions, .hero-stats');
    heroElements.forEach((el, index) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      
      setTimeout(() => {
        el.style.transition = 'all 0.6s ease-out';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, index * 100);
    });

    // Feature cards animation
    const featureCards = document.querySelectorAll('.feature-card');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    featureCards.forEach(card => {
      observer.observe(card);
    });

    // Animate hero chart
    this.animateHeroChart(); // Make sure this function exists below

    // Section fade-in animations (header, features, footer)
    const fadeSections = document.querySelectorAll('.section-header, .features-grid, .footer');
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    fadeSections.forEach(section => {
      sectionObserver.observe(section);
    });

    // Parallax effect for hero background
    this.initHeroParallax(); // Make sure this function exists below

    // Advanced: floating particles
    this.initHeroParticles(); // Make sure this function exists below

    // Advanced: 3D tilt on hero-content and phone-mockup
    this.initHero3DTilt(); // Make sure this function exists below
    
    // Interactive ripple effect
    this.initHeroRipples(); // Make sure this function exists below
  }

  // Interactive ripple effect for hero section
  initHeroRipples() {
    const hero = document.querySelector('.hero');
    const ripples = document.querySelector('.hero-ripples');
    if (!hero || !ripples) return;
    hero.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.pointerType !== 'touch') return;
      const rect = hero.getBoundingClientRect();
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

  // Floating particles in hero section
  initHeroParticles() {
    const container = document.querySelector('.hero-particles');
    if (!container) return;
    container.innerHTML = '';
    const count = 16;
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

  // 3D tilt effect for hero-content and phone-mockup
  initHero3DTilt() {
    const hero = document.querySelector('.hero');
    const tiltEls = [
      document.querySelector('.hero-content'),
      document.querySelector('.phone-mockup')
    ];
    if (!hero || !tiltEls[0] || !tiltEls[1]) return;
    tiltEls.forEach(el => el?.classList.add('tilt-3d')); // Added null check
    hero.addEventListener('mousemove', e => {
      const rect = hero.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      if (tiltEls[0]) tiltEls[0].style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`;
      if (tiltEls[1]) tiltEls[1].style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 12}deg)`;
    });
    hero.addEventListener('mouseleave', () => {
      tiltEls.forEach(el => { if (el) el.style.transform = ''; });
    });
  }

  // Parallax effect for hero section
  initHeroParallax() {
    const hero = document.querySelector('.hero');
    const layers = document.querySelectorAll('.hero-parallax .parallax-layer');
    if (!hero || !layers.length) return;

    function parallax(e) {
      const rect = hero.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      layers.forEach((layer, i) => {
        const speed = 10 + i * 8;
        layer.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
      });
    }
    hero.addEventListener('mousemove', parallax);
    hero.addEventListener('mouseleave', () => {
      layers.forEach(layer => {
        layer.style.transform = '';
      });
    });
  }

  // YOUR ORIGINAL animateHeroChart FUNCTIONS 
  animateHeroChart() {
    const path = document.getElementById('heroChartPath');
    if (!path) return;
    
    const pathLength = path.getTotalLength();
    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = pathLength;
    
    const animation = path.animate([
      { strokeDashoffset: pathLength },
      { strokeDashoffset: 0 }
    ], {
      duration: 2000,
      easing: 'ease-in-out'
    });
    
    animation.onfinish = () => {
      path.style.strokeDasharray = 'none';
      path.style.strokeDashoffset = '0';
    };

    const area = path.parentElement.querySelector('path[fill^="url"]');
    if (area) {
      area.style.opacity = '0';
      area.animate([
        { opacity: 0 },
        { opacity: 1 }
      ], {
        duration: 1200,
        fill: 'forwards',
        easing: 'ease-in'
      });
      setTimeout(() => { area.style.opacity = '1'; }, 1200);
    }

    let dot = path.parentElement.querySelector('.chart-glow-dot');
    if (!dot) {
      dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('class', 'chart-glow-dot');
      dot.setAttribute('r', '7');
      dot.setAttribute('fill', '#6366f1'); // Use CSS variable later if needed
      dot.setAttribute('filter', 'url(#glow)');
      path.parentElement.appendChild(dot);
    }
    let defs = path.parentElement.querySelector('defs');
    if (defs && !defs.querySelector('#glow')) {
      const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      filter.setAttribute('id', 'glow');
      filter.innerHTML = '<feGaussianBlur stdDeviation="4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>';
      defs.appendChild(filter);
    }
    let start = null;
    function animateDot(ts) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const duration = 2000;
      const progress = Math.min(elapsed / duration, 1);
      const len = pathLength * progress;
      const pt = path.getPointAtLength(len);
      dot.setAttribute('cx', pt.x);
      dot.setAttribute('cy', pt.y);
      dot.style.opacity = '1';
      if (progress < 1) {
        requestAnimationFrame(animateDot);
      } else {
        dot.style.opacity = '0';
      }
    }
    dot.style.opacity = '0';
    requestAnimationFrame(animateDot);

    // Second version from your original file 
    const morphPaths = [
      'M10,80 Q50,60 90,70 T170,50 T250,40',
      'M10,90 Q60,30 120,80 T200,60 T250,90',
      'M10,60 Q80,120 150,40 T250,80',
      'M10,80 Q50,60 90,70 T170,50 T250,40' // Original path
    ];
    let morphIndex = 0;
    const chartSVG = path.closest('svg');
    if (chartSVG) {
        chartSVG.addEventListener('mouseenter', () => {
            morphIndex = (morphIndex + 1) % (morphPaths.length -1); // Don't morph back to original on enter
            path.setAttribute('d', morphPaths[morphIndex]);
        });
        chartSVG.addEventListener('mouseleave', () => {
            path.setAttribute('d', morphPaths[morphPaths.length - 1]); // Always return to original path
        });
    }
  } 

  animateThemeTransition() {
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    setTimeout(() => {
      document.body.style.transition = '';
    }, 300);
  }

  // TOAST NOTIFICATIONS
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.error('Toast container not found!');
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
      <div class="toast-icon">${this.getToastIcon(type)}</div>
      <div class="toast-content">
        <div class="toast-title">${this.getToastTitle(type)}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  getToastIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || 'ℹ';
  }

  getToastTitle(type) {
    const titles = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info'
    };
    return titles[type] || 'Info';
  }
} 


// FORM HANDLING
class AuthForms {
  constructor() {
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.initializeDarkMode();
    this.initializeAccentColor(); 
  }

  setupEventListeners() {
    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Register Form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }

    // Dark Mode Toggle
    document.getElementById('darkModeToggle')?.addEventListener('click', () => this.toggleDarkMode());
    // document.getElementById('closeDemo')?.addEventListener('click', () => this.closeDemo());
  }

  handleLogin(e) {
    e.preventDefault();
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const email = emailInput?.value;
    const password = passwordInput?.value;

    if (!email || !this.validateEmail(email)) {
      this.showToast('Please enter a valid email address', 'error');
      return;
    }

    if (!password || password.length < 6) {
      this.showToast('Password must be at least 6 characters', 'error');
      return;
    }

    // Simulate login - Replace with actual logic
    console.log('Simulating login for:', email);
    this.showToast('Login successful! Redirecting...', 'success');
    // Save dummy auth data
     localStorage.setItem('fintrack_auth', JSON.stringify({
         user: { name: email.split('@')[0], email: email, avatar: email.substring(0,2).toUpperCase() },
         token: 'dummy-token-' + Date.now()
     }));
     sessionStorage.setItem('just_logged_in', 'true'); // For dashboard animation
     setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
  }

  handleRegister(e) {
    e.preventDefault();
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const termsInput = document.getElementById('terms');

    const name = nameInput?.value;
    const email = emailInput?.value;
    const password = passwordInput?.value;
    const confirmPassword = confirmPasswordInput?.value;
    const terms = termsInput?.checked;

    if (!name || name.length < 2) {
      this.showToast('Please enter your full name', 'error');
      return;
    }
    if (!email || !this.validateEmail(email)) {
      this.showToast('Please enter a valid email address', 'error');
      return;
    }
    if (!password || password.length < 6) {
      this.showToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (password !== confirmPassword) {
      this.showToast('Passwords do not match', 'error');
      return;
    }
    if (!terms) {
      this.showToast('Please accept the Terms of Service', 'error');
      return;
    }

    
    console.log('Simulating registration for:', email);
    this.showToast('Registration successful! Redirecting...', 'success');
    // Save dummy auth data
    localStorage.setItem('fintrack_auth', JSON.stringify({
        user: { name: name, email: email, avatar: name.substring(0,2).toUpperCase() },
        token: 'dummy-token-' + Date.now()
    }));
    sessionStorage.setItem('just_logged_in', 'true'); // For dashboard animation
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
  }

  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  // Dark mode methods
  initializeDarkMode() {
    const savedTheme = localStorage.getItem('fintrack_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      this.enableDarkMode();
    } else {
      this.disableDarkMode(); // Explicitly disable if not dark
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

  // ACCENT COLOR LOGIC 
  initializeAccentColor() {
    const savedAccent = localStorage.getItem('fintrack_accent') || '#6366f1'; // Default
    this.applyAccentColor(savedAccent);
     console.log('AuthForms: Accent color initialized:', savedAccent);
  }

  applyAccentColor(color) {
    if (!color || !color.startsWith('#')) {
        console.error("Invalid color format passed to applyAccentColor:", color);
        return;
    }
    try {
      const rgbArray = this.hexToRgb(color);
      if (!rgbArray) throw new Error(`Could not convert hex "${color}" to RGB`);

      const root = document.documentElement;
      root.style.setProperty('--primary', color);
      root.style.setProperty('--primary-rgb', rgbArray.join(', '));
      root.style.setProperty('--primary-dark', this.adjustColor(color, -0.15));
      root.style.setProperty('--primary-light', this.adjustColor(color, 0.30));

    } catch (error) {
        console.error("Error applying accent color:", error);
    }
  }
  
  hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
  }

  adjustColor(color, percent) {
    if (!color.startsWith('#')) return color;
    let R = parseInt(color.substring(1,3),16);
    let G = parseInt(color.substring(3,5),16);
    let B = parseInt(color.substring(5,7),16);
    R = Math.round(R * (1.0 + percent));
    G = Math.round(G * (1.0 + percent));
    B = Math.round(B * (1.0 + percent));
    R = Math.min(255, Math.max(0, R));  
    G = Math.min(255, Math.max(0, G));  
    B = Math.min(255, Math.max(0, B));  
    const RR = R.toString(16).padStart(2, '0');
    const GG = G.toString(16).padStart(2, '0');
    const BB = B.toString(16).padStart(2, '0');
    return `#${RR}${GG}${BB}`;
  }
  

  // Toast methods
  showToast(message, type = 'info') {
    
    
    const container = document.getElementById('toastContainer');
     if (!container) {
        console.error('Toast container not found!');
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${this.getToastIcon(type)}</div>
      <div class="toast-content">
        <div class="toast-title">${this.getToastTitle(type)}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  getToastIcon(type) { 
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    return icons[type] || 'ℹ';
  }

  getToastTitle(type) { 
    const titles = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Info' };
    return titles[type] || 'Info';
  }
} 

// Initialize the appropriate functionality based on the page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('loginForm') || document.getElementById('registerForm')) {
    window.authForms = new AuthForms();
  } else {
    // Assumes it's the index.html page
    window.welcomePage = new WelcomePage(); 
  }
});
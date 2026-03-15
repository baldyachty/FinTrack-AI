// Global utilities object
console.log('Initializing Utils...');
window.Utils = {
  
  _getSavedSettings() {
    const defaultSettings = { theme: 'light', accent_color: '#6366f1' };
    
    // Check for a local override (set by the toggle button)
    const localTheme = localStorage.getItem('fintrack_theme');

    try {
      const authDataString = localStorage.getItem('fintrack_auth');
      if (authDataString) {
        const authData = JSON.parse(authDataString);
        if (authData && authData.user) {
          return {
            // PRIORITY 1: Local override (what you just clicked)
            // PRIORITY 2: Database setting (what you saved in settings)
            // PRIORITY 3: Default
            theme: localTheme || authData.user.theme || defaultSettings.theme,
            accent_color: authData.user.accent_color || defaultSettings.accent_color
          };
        }
      }
      // No auth data? Still respect the local theme choice
      return { 
        ...defaultSettings, 
        theme: localTheme || defaultSettings.theme 
      }; 
    } catch (e) {
      console.error("Error parsing auth data in Utils:", e);
      return defaultSettings;
    }
  },

  // Dark mode functionality
  darkMode: {
    initialize() {
      // Get settings from the new helper function
      const settings = window.Utils._getSavedSettings();
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      console.log(`Utils.darkMode: Initializing with saved theme: ${settings.theme}`);

      // Use saved theme. If no theme saved (e.g. 'light'), check OS preference
      if (settings.theme === 'dark' || (!settings.theme && prefersDark)) {
        this.enable();
      } else {
        this.disable(); // Explicitly set to light mode
      }
    },

    toggle() {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        this.disable();
        return false; // Now in light mode
      } else {
        this.enable();
        return true; // Now in dark mode
      }
    },

    enable() {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('fintrack_theme', 'dark');
    },

    disable() {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('fintrack_theme', 'light');
    }
  },

  //  GLOBAL ACCENT COLOR LOGIC
  accentColor: {
    /**
     * Applies the selected accent color and its variants to the root CSS variables.
     * @param {string} color - The base hex color (e.g., "#6366f1")
     */
    applyAccentColor(color) {
      if (!color || !color.startsWith('#')) {
          console.error("Invalid color format passed to applyAccentColor:", color);
          // Apply a fallback color to prevent visual breakage
          color = '#6366f1'; 
      }
      try {
        const rgbArray = this.hexToRgb(color);
        if (!rgbArray) throw new Error(`Could not convert hex "${color}" to RGB`);

        const root = document.documentElement;
        // Set the CSS variables 
        root.style.setProperty('--primary', color);
        root.style.setProperty('--primary-rgb', rgbArray.join(', '));
        root.style.setProperty('--primary-dark', this.adjustColor(color, -0.15)); // 15% darker
        root.style.setProperty('--primary-light', this.adjustColor(color, 0.30)); // 30% lighter
        
      } catch (error) {
          console.error("Error applying accent color:", error);
          // Apply fallback if helpers fail
          if (color !== '#6366f1') { // Avoid infinite loop
              this.applyAccentColor('#6366f1');
          }
      }
    },

    
    hexToRgb(hex) {
      // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16)
      ] : null; // Return null if match fails
    },

    /** Helper to adjust hex color brightness by a percentage (-1.0 to 1.0) */
    adjustColor(color, percent) {
      if (!color.startsWith('#')) return color; // Return original if not hex

      let R = parseInt(color.substring(1,3),16);
      let G = parseInt(color.substring(3,5),16);
      let B = parseInt(color.substring(5,7),16);

      // Adjust RGB
      R = Math.round(R * (1.0 + percent));
      G = Math.round(G * (1.0 + percent));
      B = Math.round(B * (1.0 + percent));

      // Clamp values between 0 and 255
      R = Math.min(255, Math.max(0, R));
      G = Math.min(255, Math.max(0, G));
      B = Math.min(255, Math.max(0, B));

      // Convert back to hex, ensuring 2 digits per channel
      const RR = R.toString(16).padStart(2, '0');
      const GG = G.toString(16).padStart(2, '0');
      const BB = B.toString(16).padStart(2, '0');

      return `#${RR}${GG}${BB}`;
    },

    /**
     * Initializes the accent color on page load from fintrack_auth.
     */
    initialize() {
      // Get settings from the new helper function
      const settings = window.Utils._getSavedSettings();
      this.applyAccentColor(settings.accent_color);
      console.log('Accent color initialized from auth data:', settings.accent_color);
    }
  },


  // Toast notifications
  toast: {
    show(message, type = 'info') {
      const container = document.getElementById('toastContainer');
      // Check if container exists
      if (!container) {
          console.warn("Toast container not found!");
          // Fallback to alert if no toast container
          alert(`${this.getTitle(type)}: ${message}`);
          return;
      }
      
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;

      toast.innerHTML = `
        <div class="toast-icon">${this.getIcon(type)}</div>
        <div class="toast-content">
          <div class="toast-title">${this.getTitle(type)}</div>
          <div class="toast-message">${message}</div>
        </div>
      `;

      container.appendChild(toast);

      // Trigger animation
      setTimeout(() => toast.classList.add('show'), 10);

      // Remove after duration
      setTimeout(() => {
        toast.classList.remove('show');
        // Remove element from DOM after transition
        toast.addEventListener('transitionend', () => toast.remove());
        // Fallback removal just in case transitionend doesn't fire
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 500); 
      }, 3000);
    },

    getIcon(type) {
      const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
      };
      return icons[type] || 'ℹ';
    },

    getTitle(type) {
      const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info'
      };
      return titles[type] || 'Info';
    }
  },

  // Form validation
  validation: {
    email(email) {
      if (!email) return false;
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(String(email).toLowerCase());
    },

    required(value) {
      return value !== null && value !== undefined && String(value).trim() !== '';
    },

    minLength(value, length) {
      return value && String(value).length >= length;
    }
  }
};
// Function to show the 2FA badge if active
window.Utils.updateSecurityBadge = function() {
    try {
        const authData = JSON.parse(localStorage.getItem('fintrack_auth'));
        const badge = document.getElementById('2faBadge');
        
        if (authData && authData.user && authData.user.two_factor_enabled && badge) {
            badge.style.display = 'inline-block';
        }
    } catch (e) {
        console.error("Error updating security badge:", e);
    }
};

// Run the badge check whenever a page loads
document.addEventListener('DOMContentLoaded', () => {
    if (window.Utils.updateSecurityBadge) {
        window.Utils.updateSecurityBadge();
    }
});

// Ensure Utils is properly initialized
console.log('Utils module initialized successfully');

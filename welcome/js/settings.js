// SETTINGS PAGE FUNCTIONALITY

class SettingsPage {
  constructor() {
    // 1. Dependency Check
    if (!window.Utils) {
      console.error('CRITICAL: Utils.js not loaded!');
      alert('Error loading page components. Please refresh.');
      return;
    }

    // 2. Authentication Check
    this.authData = this.checkAuth();
    if (!this.authData || !this.authData.user || !this.authData.token) { // Check token too
      console.error("Authentication failed or user data missing. Redirecting.");
      window.location.href = 'login.html';
      return;
    }
    this.user = this.authData.user; // User object from authData

    // 3. Initialization
    this.init();
  }

  // INITIALIZATION
  init() {
    console.log('Settings Page Initializing... ✨');
    this.elements = this.cacheDOMElements();
    if (!this.elements) {
      console.error("Initialization failed: Could not cache DOM elements.");
      return;
    }

    this.setupEventListeners();
    this.loadUserData();           // Load name, email, avatar
    this.loadCurrentSettings();    // Load theme, accent color
    this.setupScrollAnimations();
    this.animatePageLoad();
  }

  /** Cache DOM Elements */
  cacheDOMElements() {
    const els = {
      // User elements
      userName: document.getElementById('userName'),
      userEmail: document.getElementById('userEmail'),
      userAvatar: document.getElementById('userAvatar'),

      // Shared elements
      mainHeader: document.getElementById('mainHeader'),
      mainFooter: document.getElementById('mainFooter'),
      darkModeToggle: document.getElementById('darkModeToggle'),
      logoutButton: document.getElementById('logoutButton'),

      // Page-specific elements
      scrollAnimateTargets: document.querySelectorAll('.scroll-animate'),

      // Forms & Inputs
      profileForm: document.getElementById('profileForm'),
      profileName: document.getElementById('profileName'),
      profileEmail: document.getElementById('profileEmail'),
      profilePicPreview: document.getElementById('profilePicPreview'),
      profilePicInput: document.getElementById('profilePicInput'),
      uploadPicBtn: document.getElementById('uploadPicBtn'),
      profileSubmitBtn: document.querySelector('#profileForm button[type="submit"]'), // Button for profile

      passwordForm: document.getElementById('passwordForm'),
      currentPassword: document.getElementById('currentPassword'),
      newPassword: document.getElementById('newPassword'),
      confirmPassword: document.getElementById('confirmPassword'),
      passwordSubmitBtn: document.querySelector('#passwordForm button[type="submit"]'), // Button for password

      themeOptions: document.querySelector('.theme-options'),
      themeLight: document.getElementById('themeLight'),
      themeDark: document.getElementById('themeDark'),

      accentColorOptions: document.getElementById('accentColorOptions'), // Container ID
      colorSwatches: document.querySelectorAll('.color-swatch'), // The buttons

      notificationForm: document.getElementById('notificationForm'),
      // Notification Checkboxes (Ensure IDs exist in your HTML)
      notifySummaryCheckbox: document.getElementById('notifySummary'),
      notifyAlertsCheckbox: document.getElementById('notifyAlerts'),
      notifyUpdatesCheckbox: document.getElementById('notifyUpdates'),
      notificationSubmitBtn: document.querySelector('#notificationForm button[type="submit"]'), //  Button for notifications

      setup2faBtn: document.getElementById('setup2faBtn'),
      exportDataBtn: document.getElementById('exportDataBtn'),
      deleteAccountBtn: document.getElementById('deleteAccountBtn'),

      animatedFormGroups: document.querySelectorAll('.animated-form-group'),
      animatedOptions: document.querySelectorAll('.animated-options'),
      twoFactorModal: document.getElementById('twoFactorModal'),
      close2faModal: document.getElementById('close2faModal'),
      qrcodeContainer: document.getElementById('qrcode'),
      twoFactorVerifyCode: document.getElementById('twoFactorVerifyCode'),
      confirm2faBtn: document.getElementById('confirm2faBtn'),
      twoFactorStatus: document.getElementById('2faStatus'),
      // ADD THESE TO THE els OBJECT
      twoFactorModal: document.getElementById('twoFactorModal'),
      close2faModal: document.getElementById('close2faModal'),
      qrcodeContainer: document.getElementById('qrcode'),
      twoFactorVerifyCode: document.getElementById('twoFactorVerifyCode'),
      confirm2faBtn: document.getElementById('confirm2faBtn'),
      twoFactorStatus: document.getElementById('2faStatus'),
      deleteAccountModal: document.getElementById('deleteAccountModal'),
cancelDeleteAccountBtn: document.getElementById('cancelDeleteAccountBtn'),
confirmDeleteAccountBtn: document.getElementById('confirmDeleteAccountBtn'),
    };

    // Basic Validation
    const requiredElements = ['profileForm', 'passwordForm', 'notificationForm', 'mainHeader', 'mainFooter', 'accentColorOptions'];
    for (const key of requiredElements) {
        if (!els[key]) {
            console.error(`Critical page element missing! Check HTML ID for: ${key}`);
            Utils?.toast?.show("Error loading page content.", "error");
            return null;
        }
    }
    console.log("DOM elements cached successfully.");
    return els;
  }

  // SECURITY & USER DATA
  /** Checks localStorage for valid auth data */
  checkAuth() {
    const authDataString = localStorage.getItem('fintrack_auth');
    if (!authDataString) { console.log('No auth data found.'); return null; }
    try {
      const parsedData = JSON.parse(authDataString);
      // Ensure all expected parts are present (theme/color added by backend now)
      if (parsedData && parsedData.user && parsedData.token && parsedData.user.theme !== undefined && parsedData.user.accent_color !== undefined) {
        console.log("Auth successful for:", parsedData.user.email);
        return parsedData;
      } else {
        console.warn('Auth data structure incomplete or missing settings. Clearing...');
        localStorage.removeItem('fintrack_auth'); // Clear potentially corrupted/outdated data
        return null; // Force redirect
      }
    } catch (e) { console.error('Auth parse error:', e); localStorage.removeItem('fintrack_auth'); return null; }
  }

  /** Populates sidebar and profile form */
  loadUserData() {
    if (!this.user) return;
    // Destructure includes new theme/color, used in loadCurrentSettings
    const { name, email, avatar } = this.user;

    // Sidebar elements
    if (this.elements.userName) this.elements.userName.textContent = name;
    if (this.elements.userEmail) this.elements.userEmail.textContent = email;
    // Use avatar URL if available, otherwise generate initials
    if (this.elements.userAvatar) {
        // Simple initial generation
        this.elements.userAvatar.textContent = name ? name.substring(0, 2).toUpperCase() : '?';
    }

    // Profile form elements
    if (this.elements.profileName) this.elements.profileName.value = name;
    if (this.elements.profileEmail) this.elements.profileEmail.value = email; // Keep email disabled

    // Set profile picture preview
    if (this.elements.profilePicPreview) {
      // Use avatar from user data, fallback to default SVG string
      this.elements.profilePicPreview.src = avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiNFMEUyRTYiLz4KPHBhdGggZD0iTTMyIDMyQzM3LjUyMjggMzIgNDIgMjcuNTIyOCA0MiAyMkM0MiAxNi40NzczIDM3LjUyMjggMTIgMzIgMTJDMTYuNDc3MiAxMiAxMiAxNi40NzczIDEyIDIyQzEyIDI3LjUyMjggMTYuNDc3MiAzMiAzMiAzMloiIGZpbGw9IiNBNkFEQkUiLz4KPHBhdGggZD0iTTQ5LjA3MTYgNDguMzY2OUM0NS4yMDIxIDQzLjUwODYgNDAuMDMzMSA0MCAzMiA0MEMyMy45NjcgNDAgMTguNzQ3OSA0My5vbMDg2IDE0LjkxODUgNDguMzY2OUMxOC40Njc4IDUyLjUxODQgMjQuODY3MSA1NSA1Mi44NzA5QzQxLjEzMjkgNTUgNDYuNTMyMyA1Mi41MTg0IDQ5LjA3MTYgNDguMzY2OVoiIGZpbGw9IiNBNkFEQkUiLz4KPC9zdmc+Cg==';
    }
  }

  // INITIAL SETTINGS & APPEARANCE
  /** Loads saved theme, accent color from this.user */
  loadCurrentSettings() {
    if (!this.user) {
        console.error("Cannot load settings, user data is missing.");
        return;
    }

    // Theme Handling
    const savedTheme = this.user.theme || 'light';
    if (savedTheme === 'dark' && this.elements.themeDark) {
        this.elements.themeDark.checked = true;
        if (!document.documentElement.hasAttribute('data-theme')) Utils.darkMode.enable();
    } else if (this.elements.themeLight) {
        this.elements.themeLight.checked = true;
        if (document.documentElement.hasAttribute('data-theme')) Utils.darkMode.disable();
    }

    // Accent Color Handling
    const savedAccent = this.user.accent_color || '#6366f1';
    Utils.accentColor.applyAccentColor(savedAccent);
    this.elements.colorSwatches?.forEach(swatch => {
      swatch.classList.toggle('active', swatch.dataset.color === savedAccent);
    });

    //  2FA Status & Toggle Logic
    if (this.user.two_factor_enabled) {
        // Update Status Badge
        if (this.elements.twoFactorStatus) {
            this.elements.twoFactorStatus.textContent = 'Enabled';
            this.elements.twoFactorStatus.className = 'feature-status enabled';
        }
        
        // Transform Setup button into Disable button
        if (this.elements.setup2faBtn) {
            this.elements.setup2faBtn.textContent = 'Disable 2FA';
            this.elements.setup2faBtn.disabled = false; // Must be clickable to disable!
            this.elements.setup2faBtn.classList.add('btn-danger'); // Optional: make it red
            
            // Override the listener to show the disable flow
            this.elements.setup2faBtn.onclick = () => this.showDisableModal();
        }
    } else {
        // Default Disabled State
        if (this.elements.twoFactorStatus) {
            this.elements.twoFactorStatus.textContent = 'Disabled';
            this.elements.twoFactorStatus.className = 'feature-status disabled';
        }
        if (this.elements.setup2faBtn) {
            this.elements.setup2faBtn.textContent = 'Setup 2FA';
            this.elements.setup2faBtn.classList.remove('btn-danger');
            this.elements.setup2faBtn.onclick = () => this.handle2faSetup();
        }
    }
    

    // Load Notification States
    if(this.elements.notifySummaryCheckbox) this.elements.notifySummaryCheckbox.checked = this.user.notify_summary || false;
    if(this.elements.notifyAlertsCheckbox) this.elements.notifyAlertsCheckbox.checked = this.user.notify_alerts || false;
    if(this.elements.notifyUpdatesCheckbox) this.elements.notifyUpdatesCheckbox.checked = this.user.notify_updates || false;
}
  // EVENT LISTENERS
  setupEventListeners() {
    // Shared...
    this.elements.darkModeToggle?.addEventListener('click', () => {
        // Determine the theme *before* toggling visually
        const newTheme = document.documentElement.hasAttribute('data-theme') ? 'light' : 'dark';
        this.handleThemeChange(newTheme, true); // Pass true to save
    });
    this.elements.logoutButton?.addEventListener('click', () => this.handleLogout());

    //  Form Submit Listeners 
    this.elements.profileForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        this._handleProfileUpdate(e.target); // Pass form element
    });
    this.elements.passwordForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        this._handlePasswordUpdate(e.target); // Pass form element
    });
    this.elements.notificationForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        this._handleNotificationUpdate(e.target); // Pass form element
    });
    

    // Appearance Radio/Swatch Listeners (Trigger Save)...
    this.elements.themeLight?.addEventListener('change', (e) => {
        if(e.target.checked) this.handleThemeChange('light', true); // Pass true to save
    });
    this.elements.themeDark?.addEventListener('change', (e) => {
        if(e.target.checked) this.handleThemeChange('dark', true); // Pass true to save
    });

    if (this.elements.accentColorOptions) {
        this.elements.accentColorOptions.addEventListener('click', (e) => {
            const swatch = e.target.closest('button.color-swatch');
            if (swatch) {
                this.handleAccentColorChange(swatch, true); // Pass true to save
            }
        });
    } else { console.error("#accentColorOptions not found!"); }

    // Profile Picture...
    this.elements.uploadPicBtn?.addEventListener('click', () => this.elements.profilePicInput?.click());
    this.elements.profilePicInput?.addEventListener('change', (e) => this.handleProfilePicChange(e));

    // Account Actions...
    // Opens the 2FA Setup Modal and generates the QR code
    this.elements.setup2faBtn?.addEventListener('click', () => this.handle2faSetup());
    this.elements.cancelDeleteAccountBtn?.addEventListener('click', () => this.hideDeleteAccountModal());
    this.elements.confirmDeleteAccountBtn?.addEventListener('click', () => this.confirmDeleteAccount());

    // Closes the modal and clears the verification input for a fresh start next time
    this.elements.close2faModal?.addEventListener('click', () => {
        this.elements.twoFactorModal.style.display = 'none';
        if (this.elements.twoFactorVerifyCode) {
            this.elements.twoFactorVerifyCode.value = '';
        }
    });

    // Triggers the 2FA verification handshake with the backend
    this.elements.confirm2faBtn?.addEventListener('click', () => this.handle2faVerify());

    // Existing Export and Delete listeners
    this.elements.exportDataBtn?.addEventListener('click', (e) => this.handleExportData(e.target.closest('button')));
    this.elements.deleteAccountBtn?.addEventListener('click', (e) => this.handleDeleteAccount(e.target.closest('button')));
  }
  // FORM SUBMISSION & BUTTON ANIMATION 

  // Button animation helper
  triggerButtonAnimation(button, successMessage = 'Saved!', isError = false, duration = 1500) {
      if (!button) return;
      const originalTextEl = button.querySelector('.btn-text');
      const confirmIconEl = button.querySelector('.btn-icon-confirm');
      // Ensure elements exist before proceeding
      if (!originalTextEl || !confirmIconEl) {
           console.warn("Button animation elements .btn-text or .btn-icon-confirm missing:", button);
           if (!isError) Utils.toast.show(successMessage, 'success'); // Fallback toast
           // Ensure button is re-enabled even if animation elements are missing
           setTimeout(() => { if(button) button.disabled = false; }, duration); // Check button exists in timeout
           return;
      }

      button.disabled = true; // Disable button during animation
      const originalContent = originalTextEl.textContent; // Store original text

      // Add appropriate class for animation effect
      button.classList.add('is-confirming');
      if (isError) {
          button.classList.add('btn-danger'); // Add danger for red flash
          confirmIconEl.textContent = '✕'; // Error icon
      } else {
          button.classList.remove('btn-danger');
          confirmIconEl.textContent = '✓'; // Success icon
      }

      // Show icon, hide text
      originalTextEl.style.opacity = '0';
      confirmIconEl.style.display = 'inline-block';
      confirmIconEl.style.opacity = '1';

      // Revert after delay
      setTimeout(() => {
          // Check if button still exists in the DOM
          if (!document.body.contains(button)) return;

          button.classList.remove('is-confirming');
          if (isError) button.classList.remove('btn-danger');

          originalTextEl.style.opacity = '1';
          confirmIconEl.style.opacity = '0';
          setTimeout(() => {
              // Check elements again before modifying
              if (confirmIconEl) confirmIconEl.style.display = 'none'; // Hide after fade out
              if (originalTextEl) originalTextEl.textContent = originalContent; // Restore original text
              button.disabled = false; // Re-enable button
          }, 300); // Match fade out duration
      }, duration);
  }


  //  SPECIFIC HANDLERS

  /** Handles theme changes, updates UI, and triggers save */
  handleThemeChange(theme, shouldSave = false) {
      console.log(`Theme change: ${theme}, Save: ${shouldSave}`);
      // Visually apply the theme change
      if (theme === 'dark') {
          Utils.darkMode.enable();
          if(this.elements.themeDark) this.elements.themeDark.checked = true;
      } else {
          Utils.darkMode.disable();
          if(this.elements.themeLight) this.elements.themeLight.checked = true;
      }
      // Trigger API save if needed
      if (shouldSave) this._saveAppearanceSettings();
  }

  /** Handles accent color swatch clicks, updates UI, and triggers save */
  handleAccentColorChange(selectedSwatch, shouldSave = false) {
    const newColor = selectedSwatch.dataset.color;
    if (!newColor || selectedSwatch.classList.contains('active')) return;
    console.log("Accent change:", newColor, "Save:", shouldSave);
    // Visually update active swatch and apply color
    this.elements.colorSwatches?.forEach(swatch => swatch.classList.remove('active'));
    selectedSwatch.classList.add('active');
    Utils.accentColor.applyAccentColor(newColor);
    // Trigger API save if needed
    if (shouldSave) this._saveAppearanceSettings();
  }

  // API SAVING FUNCTIONS 

  /** Helper to get current auth token */
  _getToken() {
      // Use this.authData directly if available and valid
      if (this.authData && this.authData.token) {
          return this.authData.token;
      }
      // Fallback redirect if token somehow missing
      console.error("Auth token is missing in _getToken. Redirecting.");
      window.location.href = 'login.html';
      return null;
  }

   /** Helper to update user data in localStorage and this.user */
  _updateLocalStorageUser(updatedUserData) {
      try {
          // Use this.authData as the source, update it, then save
          if (!this.authData) { throw new Error("Current authData is missing."); }
          // Merge updated fields into the existing user object within authData
          
          const currentUser = this.authData.user || {};
          // Only merge fields that actually exist in updatedUserData
          const fieldsToUpdate = {};
          for (const key in updatedUserData) {
              if (updatedUserData.hasOwnProperty(key)) {
                  fieldsToUpdate[key] = updatedUserData[key];
              }
          }
          this.authData.user = { ...currentUser, ...fieldsToUpdate };

          localStorage.setItem('fintrack_auth', JSON.stringify(this.authData));
          this.user = this.authData.user; // Update the instance's user object
          console.log('localStorage user data updated:', this.user);
          // Update sidebar immediately
          this.loadUserData(); // Reloads name/avatar in sidebar
      } catch (e) {
          console.error("Failed to update localStorage:", e);
          Utils.toast.show('Failed to save session data.', 'error');
      }
  }

  /** Saves theme and accent color via API */
  async _saveAppearanceSettings() {
      const token = this._getToken();
      if (!token) return; // Redirect handled by _getToken

      const selectedTheme = this.elements.themeDark?.checked ? 'dark' : 'light';
      const activeSwatch = this.elements.accentColorOptions?.querySelector('.color-swatch.active');
      const selectedAccent = activeSwatch?.dataset.color || this.user.accent_color;

      console.log('Saving appearance settings:', { theme: selectedTheme, accent_color: selectedAccent });

      // Prevent saving if values haven't changed
      if (selectedTheme === this.user.theme && selectedAccent === this.user.accent_color) {
          console.log("Appearance settings haven't changed.");
          return;
      }

      try {
          const response = await fetch('http://127.0.0.1:5000/api/settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ theme: selectedTheme, accent_color: selectedAccent })
          });
          if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.msg || 'Failed'); }
          const updatedSettings = await response.json(); 
          console.log('Appearance saved:', updatedSettings);
          this._updateLocalStorageUser(updatedSettings); // Update local storage
          Utils.toast.show('Appearance settings saved!', 'success');
      } catch (error) {
          console.error("Error saving appearance:", error);
          Utils.toast.show(`Error: ${error.message}`, 'error');
          this.loadCurrentSettings(); // Revert UI on error
      }
  }

  // Profile Update Handler
  async _handleProfileUpdate(formElement) {
      const token = this._getToken();
      if (!token) return;

      const newName = this.elements.profileName?.value.trim();
      // 1. Get the image source (Base64 string) from the preview image
      const newAvatar = this.elements.profilePicPreview?.src;

      if (!newName || newName.length < 2) { 
          Utils.toast.show('Name >= 2 characters.', 'error'); 
          return; 
      }
      
      

      const button = this.elements.profileSubmitBtn;
      if (!button) { console.error("Profile submit button not found"); return; }
      
      
      this.triggerButtonAnimation(button, 'Saving...', false);

      try {
          const response = await fetch('http://127.0.0.1:5000/api/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ 
                  name: newName,
                  avatar: newAvatar // 2. Send the avatar to the API
              })
          });

          if (!response.ok) { 
              const errorData = await response.json(); 
              throw new Error(errorData.msg || 'Failed'); 
          }

          const updatedUser = await response.json(); 
          this._updateLocalStorageUser(updatedUser); // This updates the sidebar image instantly
          this.triggerButtonAnimation(button, 'Profile Saved!');
          
      } catch (error) {
          console.error("Error updating profile:", error);
          Utils.toast.show(`Error: ${error.message}`, 'error');
          this.triggerButtonAnimation(button, 'Error!', true);
      }
  }
  //  Password Update Handler
  async _handlePasswordUpdate(formElement) {
      const token = this._getToken();
      if (!token) return;

      const currentPassword = this.elements.currentPassword?.value;
      const newPassword = this.elements.newPassword?.value;
      const confirmPassword = this.elements.confirmPassword?.value;

      if (!currentPassword || !newPassword || !confirmPassword) { Utils.toast.show('Fill all password fields.', 'error'); return; }
      if (newPassword.length < 6) { Utils.toast.show('New password >= 6 characters.', 'error'); return; }
      if (newPassword !== confirmPassword) { Utils.toast.show('New passwords mismatch.', 'error'); return; }

      const button = this.elements.passwordSubmitBtn;
       if (!button) { console.error("Password submit button not found"); return; }
      button.disabled = true;

      try {
          const response = await fetch('http://127.0.0.1:5000/api/password', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ currentPassword, newPassword, confirmPassword }) // Explicit keys
          });
          const result = await response.json();
          if (!response.ok) { throw new Error(result.msg || 'Failed'); }

          console.log('Password update success:', result.msg);
          this.triggerButtonAnimation(button, 'Password Updated!');
          formElement.reset(); // Clear fields on success
      } catch (error) {
          console.error("Error updating password:", error);
          Utils.toast.show(`Error: ${error.message}`, 'error'); 
          this.triggerButtonAnimation(button, 'Error!', true);
      }
      
  }

  //  Notification Update Handler (Placeholder API) 
  async _handleNotificationUpdate(formElement) {
      const token = this._getToken();
      if (!token) return;

      // 1. Gather preferences from the checkboxes
      const prefs = {
          notifySummary: this.elements.notifySummaryCheckbox?.checked ?? false,
          notifyAlerts: this.elements.notifyAlertsCheckbox?.checked ?? false,
          notifyUpdates: this.elements.notifyUpdatesCheckbox?.checked ?? false
      };
      
      console.log('Saving notification prefs:', prefs);

      const button = this.elements.notificationSubmitBtn;
      if (!button) { console.error("Notification submit button not found"); return; }
      
      // 
      this.triggerButtonAnimation(button, 'Saving...', false);

      try {
          // 2. Send data to the real API endpoint
          const response = await fetch('http://127.0.0.1:5000/api/settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(prefs)
          });
          
          if (!response.ok) throw new Error('Failed to save preferences');

          // 3. Process the response
          const result = await response.json();
          
          // 4. Update local storage so the checkboxes stay checked on refresh
          
          this._updateLocalStorageUser({
              notify_summary: result.notifySummary,
              notify_alerts: result.notifyAlerts,
              notify_updates: result.notifyUpdates
          });
          
          this.triggerButtonAnimation(button, 'Preferences Saved!');

      } catch (error) {
          console.error("Error saving notifications:", error);
          Utils.toast.show('Error saving preferences.', 'error');
          this.triggerButtonAnimation(button, 'Error', true);
      }
  }

  //  Other Handlers
  handleProfilePicChange(event) {
    const file = event.target.files?.[0]; // Optional chaining
    if (file && this.elements.profilePicPreview) {
      // Basic type validation
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          Utils.toast.show('Invalid file type. Please use JPG, PNG, or WEBP.', 'error');
          return;
      }
      // Basic size validation 
      if (file.size > 2 * 1024 * 1024) {
           Utils.toast.show('File too large. Maximum size is 2MB.', 'error');
           return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result === 'string') { // Type check for safety
             this.elements.profilePicPreview.src = e.target.result;
             this.elements.profilePicPreview.classList.add('pop-in');
             
             
             console.warn("Avatar upload API call not implemented.");
             
             
             // const updatedUser = await response.json(); this._updateLo
             
             this._updateLocalStorageUser({ avatar: e.target.result });
             Utils.toast.show('Profile picture preview updated!', 'success');
             
        } else { Utils.toast.show('Error reading file.', 'error'); }
      };
      reader.onerror = () => { Utils.toast.show('Error reading file.', 'error'); };
      reader.readAsDataURL(file);
    } else if (file) { Utils.toast.show('Could not display preview.', 'error'); }
     // Clear the input value so the same file can be selected again if needed
     if(this.elements.profilePicInput) this.elements.profilePicInput.value = '';
  }

  async handleExportData(btn) {
    if (btn) btn.disabled = true;
    const originalText = btn ? btn.textContent : '';
    if (btn) btn.textContent = 'Preparing...';
    
    Utils.toast.show('Exporting your transactions...', 'info');

    try {
        const token = this._getToken();
        const response = await fetch('http://127.0.0.1:5000/api/export/csv', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Export failed. Please try again.');

        // Convert the response to a Blob 
        const blob = await response.blob();
        
        // Create a temporary link element to trigger the download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Set filename with current date 
        const dateStr = new Date().toISOString().split('T')[0];
        a.download = `fintrack_export_${dateStr}.csv`;
        
        document.body.appendChild(a);
        a.click();
        
        // Clean up the URL and the link element
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        Utils.toast.show('Export complete!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        Utils.toast.show(error.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
  }
  // Handle Account Deletion
  handleDeleteAccount() {
      if (this.elements.deleteAccountModal) {
          this.elements.deleteAccountModal.style.display = 'flex';
      }
  }

  hideDeleteAccountModal() {
      if (this.elements.deleteAccountModal) {
          this.elements.deleteAccountModal.style.display = 'none';
      }
  }

  async confirmDeleteAccount() {
      const token = this._getToken();
      if (!token) return;

      const btn = this.elements.confirmDeleteAccountBtn;
      btn.disabled = true;
      btn.textContent = 'Deleting...';

      try {
          const response = await fetch('http://127.0.0.1:5000/api/account', {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!response.ok) throw new Error('Failed to delete account');

          Utils.toast.show('Account deleted. Goodbye!', 'success');
          
          // Clear session and redirect to landing page
          localStorage.removeItem('fintrack_auth');
          sessionStorage.clear();
          setTimeout(() => {
              window.location.href = 'index.html'; 
          }, 1500);

      } catch (error) {
          console.error('Delete account error:', error);
          Utils.toast.show(error.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Permanently Delete';
      }
  }
  


  // ANIMATION LOGIC
  animatePageLoad() { console.log("Animating header/footer"); if (this.elements.mainHeader) { this.elements.mainHeader.classList.remove('initial-hidden'); this.elements.mainHeader.classList.add('animate-fade-in'); } if (this.elements.mainFooter) { this.elements.mainFooter.classList.remove('initial-hidden'); this.elements.mainFooter.classList.add('animate-fade-in'); } }
  setupScrollAnimations() {  const options = { root: null, threshold: 0.1, rootMargin: '0px 0px -50px 0px' }; const observer = new IntersectionObserver((entries, obs) => { entries.forEach((entry) => { if (entry.isIntersecting) { const target = entry.target; target.classList.add('is-visible'); const groups = target.querySelectorAll('.animated-form-group, .animated-options'); if (groups.length > 0) { groups.forEach((g, i) => { setTimeout(() => { g.classList.add('is-visible'); }, i * 100); }); } obs.unobserve(target); } }); }, options); this.elements.scrollAnimateTargets?.forEach(t => { observer.observe(t); }); }
  async handle2faSetup() {
    const token = this._getToken();
    try {
      const response = await fetch('http://127.0.0.1:5000/api/2fa/setup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      this.elements.qrcodeContainer.innerHTML = '';
      
      // Generate the QR Code visually
      new QRCode(this.elements.qrcodeContainer, {
        text: data.uri,
        width: 200,
        height: 200
      });

      this.elements.twoFactorModal.style.display = 'flex';
    } catch (error) {
      Utils.toast.show('Failed to start 2FA setup.', 'error');
    }
  }

  async handle2faVerify() {
    const token = this._getToken();
    const code = this.elements.twoFactorVerifyCode.value;
    
    try {
      const response = await fetch('http://127.0.0.1:5000/api/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        Utils.toast.show('2FA Enabled Successfully!', 'success');
        this._updateLocalStorageUser({ two_factor_enabled: true });
        
        // DISPLAY RECOVERY CODES
        const codesList = data.recovery_codes.map(c => `<li><code>${c}</code></li>`).join('');
        this.elements.qrcodeContainer.innerHTML = `
          <div style="text-align: left; background: var(--bg-secondary); padding: 15px; border-radius: 8px;">
            <p style="font-weight: bold; margin-bottom: 10px;">Save these Backup Codes:</p>
            <ul style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; list-style: none; padding: 0; font-family: monospace;">
              ${codesList}
            </ul>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 10px;">Each code is one-time use.</p>
          </div>
        `;

        this.elements.twoFactorVerifyCode.style.display = 'none';
        this.elements.twoFactorStatus.textContent = 'Enabled';
        this.elements.twoFactorStatus.className = 'feature-status enabled';
        this.elements.setup2faBtn.disabled = true;
        
        this.elements.confirm2faBtn.textContent = 'I have saved these codes';
        this.elements.confirm2faBtn.onclick = () => location.reload();
      } else {
        Utils.toast.show(data.msg || 'Invalid code.', 'error');
      }
    } catch (error) {
      Utils.toast.show('Verification failed.', 'error');
    }
  }
  showDisableModal() {
    // Reuse existing modal but change context
    this.elements.qrcodeContainer.innerHTML = `
        <div class="disable-2fa-container" style="padding: 20px; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 10px;">⚠️</div>
            <h4 style="color: var(--text-primary); margin-bottom: 10px;">Disable Security?</h4>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
                Please enter a 6-digit code from your authenticator app to confirm you want to disable 2FA.
            </p>
        </div>
    `;
    
    this.elements.twoFactorModal.style.display = 'flex';
    this.elements.twoFactorVerifyCode.style.display = 'block';
    this.elements.twoFactorVerifyCode.value = '';
    
    // Change button text and target function
    this.elements.confirm2faBtn.textContent = 'Confirm Disable';
    this.elements.confirm2faBtn.onclick = () => this.handle2faDisable();
}

async handle2faDisable() {
    const token = this._getToken();
    const code = this.elements.twoFactorVerifyCode.value;
    
    if (!code) return Utils.toast.show('Please enter your code', 'error');

    try {
        const response = await fetch('http://127.0.0.1:5000/api/2fa/disable', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ code })
        });

        if (response.ok) {
            Utils.toast.show('2FA Disabled Successfully', 'success');
            // Update local memory and refresh UI
            this._updateLocalStorageUser({ two_factor_enabled: false });
            location.reload(); 
        } else {
            const data = await response.json();
            Utils.toast.show(data.msg || 'Verification failed', 'error');
        }
    } catch (error) {
        Utils.toast.show('Error disabling 2FA', 'error');
    }
}
  //LOGOUT
  handleLogout() {  localStorage.removeItem('fintrack_auth'); sessionStorage.clear(); Utils.toast.show('Logged out.', 'info'); setTimeout(() => { window.location.href = 'login.html'; }, 1000); }
}

// INITIALIZE THE PAGE
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Utils FIRST if they exist
  if (window.Utils) {
    
    window.Utils.accentColor.initialize();
    window.Utils.darkMode.initialize();
  } else { console.error("CRITICAL: Utils object not found!"); alert("Page failed to load. Please refresh."); return; }
  // THEN initialize the page class
  window.settingsPage = new SettingsPage();
});


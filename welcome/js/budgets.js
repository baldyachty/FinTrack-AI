// BUDGETS PAGE FUNCTIONALITY 




 
class BudgetsPage {
  constructor() {
    // Check for dependencies
    if (!window.Utils) {
      console.error('Error: Utils.js is not loaded!');
      alert('A critical error occurred. Please refresh the page.');
      return;
    }

    // Auth check
    this.authData = this.checkAuth(); // Store full auth object
    if (!this.authData || !this.authData.user || !this.authData.token) {
      window.location.href = 'login.html';
      return;
    }
    this.user = this.authData.user; // Store user part

    // State
    this.allBudgets = []; // Store API data
    this.summaryData = {}; // Store calculated summary
    this.editingBudgetId = null; 
    this.budgetToDeleteId = null; 

    this.init();
  }

  //INITIALIZATION
  init() {
    console.log('Budgets Page Initializing...');

    // Cache DOM elements
    this.elements = {
      // User elements
      userName: document.getElementById('userName'),
      userEmail: document.getElementById('userEmail'),
      userAvatar: document.getElementById('userAvatar'),
      // Page elements
      budgetsGrid: document.getElementById('budgetsGrid'),
      summaryTotal: document.getElementById('summaryTotal'),
      summarySpent: document.getElementById('summarySpent'),
      summaryRemaining: document.getElementById('summaryRemaining'),
      // Shared elements
      mainHeader: document.getElementById('mainHeader'),
      mainFooter: document.getElementById('mainFooter'),
      darkModeToggle: document.getElementById('darkModeToggle'),
      logoutButton: document.getElementById('logoutButton'),
      // Add/Edit Modal elements (reused)
      addBudgetBtn: document.getElementById('addBudgetBtn'),
      modal: document.getElementById('budgetModal'), // Existing modal
      modalForm: document.getElementById('budgetForm'),
      cancelModalBtn: document.getElementById('cancelModalBtn'),
      modalTitle: document.querySelector('#budgetModal .modal-title'), //  Target title
      modalSubmitBtn: document.querySelector('#budgetModal button[type="submit"]'), // Target submit btn
      budgetCategorySelect: document.getElementById('budgetCategory'), 
      budgetAmountInput: document.getElementById('budgetAmount'), 
      
      
      deleteConfirmModal: document.getElementById('deleteConfirmModal'),
      deleteConfirmMessage: document.getElementById('deleteConfirmMessage'),
      cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
      confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
      
    };

    // Check if delete modal elements exist
    if (!this.elements.deleteConfirmModal || !this.elements.cancelDeleteBtn || !this.elements.confirmDeleteBtn) {
        console.warn("Delete confirmation modal elements not found. Delete confirmation will use browser default.");
        // We can proceed but handleBudgetDeleteClick will use confirm()
    }

    this.setupEventListeners();
    this.loadUserData();
    this.loadApiData();

    // Animate header/footer
    this.elements.mainHeader?.classList.add('animate-fade-in');
    this.elements.mainFooter?.classList.add('animate-fade-in');
  }

  // SECURITY & USER DATA 
  checkAuth() { 
    const s = localStorage.getItem('fintrack_auth'); if (!s) { console.log('No auth data'); return null; } try { const d = JSON.parse(s); return (d && d.user && d.token) ? d : null;} catch(e) { console.error('Auth parse error:', e); localStorage.removeItem('fintrack_auth'); return null;}
  }
  loadUserData() {
    if (!this.user) return; 
    const { name, email, avatar } = this.user; 
    this.elements.userName.textContent = name; 
    this.elements.userEmail.textContent = email; 
    this.elements.userAvatar.textContent = name ? name.substring(0, 2).toUpperCase() : '?';
  }

  // EVENT LISTENERS
  setupEventListeners() {
    //  Shared Listeners 
    this.elements.darkModeToggle?.addEventListener('click', () => window.Utils.darkMode.toggle());
    this.elements.logoutButton?.addEventListener('click', () => this.handleLogout());

    //  Add/Edit Modal Listeners
    this.elements.addBudgetBtn?.addEventListener('click', () => this.showModalForAdd()); // <-- Use specific func
    this.elements.cancelModalBtn?.addEventListener('click', () => this.hideModal());
    this.elements.modal?.addEventListener('click', (e) => { if (e.target === this.elements.modal) this.hideModal(); });
    this.elements.modalForm?.addEventListener('submit', (e) => { e.preventDefault(); this.handleBudgetSubmit(); }); // Handles Add/Edit

    //  Budget Card Action Listener
    this.elements.budgetsGrid?.addEventListener('click', (event) => {
        // Find the closest button with the correct class, starting from the click target
        const editButton = event.target.closest('button.edit-budget-btn');
        const deleteButton = event.target.closest('button.delete-budget-btn');

        if (editButton) {
            // Get the budget ID from the button's data attribute
            const budgetId = parseInt(editButton.dataset.id);
            if (!isNaN(budgetId)) { // Check if the ID is a valid number
               this.showModalForEdit(budgetId);
            } else {
               console.error("Invalid budget ID found on edit button:", editButton.dataset.id);
            }
        } else if (deleteButton) {
            // Get the budget ID from the button's data attribute
            const budgetId = parseInt(deleteButton.dataset.id);
             if (!isNaN(budgetId)) { // Check if the ID is a valid number
                this.handleBudgetDeleteClick(budgetId);
            } else {
               console.error("Invalid budget ID found on delete button:", deleteButton.dataset.id);
            }
        }
    });
    

    // Delete Confirmation Modal Listeners 
    // Only add if elements exist
    if(this.elements.cancelDeleteBtn) {
        this.elements.cancelDeleteBtn.addEventListener('click', () => this.hideDeleteConfirmModal());
    }
    if(this.elements.confirmDeleteBtn) {
        this.elements.confirmDeleteBtn.addEventListener('click', () => this.confirmBudgetDelete());
    }
    if(this.elements.deleteConfirmModal) {
        this.elements.deleteConfirmModal.addEventListener('click', (e) => {
            if (e.target === this.elements.deleteConfirmModal) this.hideDeleteConfirmModal();
        });
    }
    
  }

  // ADD/EDIT MODAL & FORM HANDLING 
  
  showModalForAdd() {
    this.editingBudgetId = null; // Ensure we are adding
    this.elements.modalTitle.textContent = 'Create New Budget';
    this.elements.modalSubmitBtn.textContent = 'Create Budget';
    this.elements.modalForm.reset();
    this.elements.budgetCategorySelect.disabled = false; // Enable category selection
    // Ensure amount input is enabled (might be disabled from edit)
    this.elements.budgetAmountInput.disabled = false;
    this.elements.modal.style.display = 'flex';
  }

  //  Show modal pre-filled for editing
  showModalForEdit(budgetId) {
      const budget = this.allBudgets.find(b => b.id === budgetId);
      if (!budget) {
          Utils.toast.show('Could not find budget to edit.', 'error');
          return;
      }

      this.editingBudgetId = budgetId; // Set editing state
      this.elements.modalTitle.textContent = `Edit Budget: ${budget.name}`; // Show category in title
      this.elements.modalSubmitBtn.textContent = 'Update Amount';
      this.elements.modalForm.reset(); // Clear previous state

      // Pre-fill fields
      // Safely set category
      const categoryOption = this.elements.budgetCategorySelect.querySelector(`option[value="${budget.name}"]`);
       if (categoryOption) {
           this.elements.budgetCategorySelect.value = budget.name;
       } else {
           console.warn(`Category "${budget.name}" not found in select options.`);
           // Optionally add it temporarily or handle the error
       }
      this.elements.budgetCategorySelect.disabled = true; // Disable category change when editing
      this.elements.budgetAmountInput.value = budget.total; // Set current total amount
      this.elements.budgetAmountInput.disabled = false; // Ensure amount is editable

      this.elements.modal.style.display = 'flex';
  }

  hideModal() {
      this.editingBudgetId = null; // Clear editing state
      this.elements.budgetCategorySelect.disabled = false; // Re-enable category select
      this.elements.budgetAmountInput.disabled = false; // Ensure amount input is enabled
      this.elements.modal.style.display = 'none';
  }

  // handleBudgetSubmit handles both Add (POST) and Edit (PUT)
  async handleBudgetSubmit() {
    const category = this.elements.budgetCategorySelect.value;
    const amountStr = this.elements.budgetAmountInput.value;
    const amount = parseFloat(amountStr);

    // Basic validation
    if ((this.editingBudgetId === null && !category) || !amountStr || isNaN(amount) || amount <= 0) {
      window.Utils.toast.show('Please select a category (for new budgets) and enter a valid positive amount.', 'error');
      return;
    }

    if (!this.authData || !this.authData.token) { window.location.href = 'login.html'; return; }

    let url = 'http://127.0.0.1:5000/api/budgets';
    let method = 'POST';
    let body = { category: category, amount: amount }; // For POST

    // If editing, change URL, method, and body structure
    if (this.editingBudgetId !== null) {
      url += `/${this.editingBudgetId}`;
      method = 'PUT';
      body = { amount: amount }; // Only send amount for PUT
    }

    // Disable submit button during request
    this.elements.modalSubmitBtn.disabled = true;
    this.elements.modalSubmitBtn.textContent = this.editingBudgetId ? 'Updating...' : 'Creating...';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.authData.token}` },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.msg || `Failed to ${this.editingBudgetId ? 'update' : 'create'} budget`);
      }

      const savedBudget = await response.json(); // API returns created/updated budget

      if (this.editingBudgetId !== null) {
        // Find and update in the local list
        const index = this.allBudgets.findIndex(b => b.id === this.editingBudgetId);
        if (index !== -1) {
          // Preserve 'current' spending if API doesn't return it on update,
          // OR use the one returned by API if it recalculates. API returns it now.
          this.allBudgets[index] = savedBudget;
        }
        Utils.toast.show('Budget updated!', 'success');
      } else {
        // Add new budget to local list
        this.allBudgets.push(savedBudget);
        Utils.toast.show('New budget created!', 'success');
      }

      this.hideModal();
      // Re-fetch ALL data to ensure consistency, especially summary 'spent'
      await this.loadApiData();
      
      // this.calculateSummary(); this.renderSummary(); this.renderBudgets();

    } catch(error) {
      console.error(`Error ${method} budget:`, error);
      window.Utils.toast.show(error.message, 'error');
    } finally {
        // Re-enable submit button
        this.elements.modalSubmitBtn.disabled = false;
        
        // this.elements.modalSubmitBtn.textContent = this.editingBudgetId ? 'Update Amount' : 'Create Budget';
    }
  }

  // API DATA & RENDERING 
  async loadApiData() { /* ... (fetches /api/budgets) ... */
     if (!this.authData || !this.authData.token) { window.location.href = 'login.html'; return; } try { const response = await fetch('http://127.0.0.1:5000/api/budgets', { method: 'GET', headers: { 'Authorization': `Bearer ${this.authData.token}` } }); if (response.status === 401) { localStorage.removeItem('fintrack_auth'); window.location.href = 'login.html'; return; } if (!response.ok) { throw new Error('Failed to fetch'); } const budgets = await response.json(); this.allBudgets = budgets; this.calculateSummary(); this.renderSummary(); this.renderBudgets(); } catch (error) { console.error('Error fetching budgets:', error); Utils.toast.show('Could not load budgets', 'error'); if(this.elements.budgetsGrid) this.elements.budgetsGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: var(--space-8);">Error loading budgets.</p>'; }
  }
  calculateSummary() { 
     const total = this.allBudgets.reduce((sum, b) => sum + b.total, 0); const spent = this.allBudgets.reduce((sum, b) => sum + b.current, 0); this.summaryData = { total: total, spent: spent, remaining: total - spent, };
  }
  renderSummary() { 
    this.animateCountUp(this.elements.summaryTotal, this.summaryData.total); this.animateCountUp(this.elements.summarySpent, this.summaryData.spent); this.animateCountUp(this.elements.summaryRemaining, this.summaryData.remaining, this.summaryData.remaining < 0); this.elements.summaryRemaining?.classList.toggle('spent', this.summaryData.remaining < 0); this.elements.summaryRemaining?.classList.toggle('remaining', this.summaryData.remaining >= 0);
  }
  renderBudgets() { 
    this.elements.budgetsGrid.innerHTML = ''; if (this.allBudgets.length === 0) { this.elements.budgetsGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1 / -1; padding: var(--space-8);">You haven\'t created any budgets yet. Click "Add New Budget" to start!</p>'; return; } this.allBudgets.forEach((budget, index) => { this.addBudgetCard(budget, false, index); });
  }

  //  addBudgetCard includes Edit/Delete buttons
  
  addBudgetCard(budget, isNew = false, index = 0) {
    // Destructure the new 'status' property
    const { id, name, current, total, status } = budget; // Get ID and status

    // Calculate percentage
    const percentage = (total > 0) ? (current / total) * 100 : 0;
    const visualPercentage = Math.min(percentage, 100);

    //  Status Logic 
    // This logic now directly uses the 'status' from the API
    let statusText = 'On Track';
    let statusClass = 'status-green';
    
    if (status === 'at_risk') {
        statusText = 'At Risk';
        statusClass = 'status-orange';
    } else if (status === 'over') {
        statusText = 'Over Budget';
        statusClass = 'status-red';
    }
    

    // Create card element
    const card = document.createElement('div');
    card.className = 'budget-card';
    card.dataset.id = id; // Add data-id to the card itself
    if (isNew) { card.classList.add('new-budget-pop-in'); }
    else { card.style.animationDelay = `${index * 0.1}s`; }

    // Class Toggling
    // Use the 'status' to toggle classes for styling
    card.classList.toggle('over-budget', status === 'over');
    card.classList.toggle('at-risk', status === 'at_risk'); 
    

    const fillId = `fill-${id || name.replace(/\s+/g, '-')}`;

    
    card.innerHTML = `
      <div class="budget-card-header">
        <span class="budget-card-title">${name}</span>
        <span class="budget-status ${statusClass}">${statusText}</span>
      </div>
      <div class="budget-progress-bar">
        <div class="budget-progress-fill" id="${fillId}"></div>
      </div>
      <div class="budget-details">
        <span class="budget-amount-spent">KSh ${current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span class="budget-amount-total">/ KSh ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <div class="budget-card-actions" style="margin-top: var(--space-4); display: flex; justify-content: flex-end; gap: var(--space-2);">
          <button class="btn btn-ghost btn-small edit-budget-btn" data-id="${id}" title="Edit Amount" aria-label="Edit budget ${name}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="pointer-events: none;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn btn-ghost btn-small delete-budget-btn" data-id="${id}" title="Delete Budget" aria-label="Delete budget ${name}" style="color: #ef4444;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="pointer-events: none;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
      </div>
      `;
    

    this.elements.budgetsGrid.appendChild(card);

    // Trigger progress bar fill
    setTimeout(() => {
      const fillElement = document.getElementById(fillId);
      if (fillElement) { fillElement.style.width = `${visualPercentage}%`; }
    }, 50);
  }

  animateCountUp(el, target, isNegative = false) { 
     if (!el) return; let current = 0; const duration = 1000; let startTimestamp = null; if (el.countUpInterval) cancelAnimationFrame(el.countUpInterval); const step = (ts) => { if (!startTimestamp) startTimestamp = ts; const progress = Math.min((ts - startTimestamp) / duration, 1); current = progress * target; el.textContent = `KSh ${isNegative ? '-' : ''}${Math.abs(current).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; if (progress < 1) { el.countUpInterval = requestAnimationFrame(step); } else { el.textContent = `KSh ${isNegative ? '-' : ''}${Math.abs(target).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; } }; el.countUpInterval = requestAnimationFrame(step);
  }

  //  BUDGET DELETE HANDLING 
  handleBudgetDeleteClick(budgetId) {
      const budget = this.allBudgets.find(b => b.id === budgetId);
      if (!budget) return;

      // Use custom modal if available, otherwise fallback to confirm()
      if (this.elements.deleteConfirmModal) {
          this.budgetToDeleteId = budgetId;
          // Safely update message text
          if (this.elements.deleteConfirmMessage) {
            this.elements.deleteConfirmMessage.textContent = `Are you sure you want to permanently delete the budget for "${budget.name}"? This action cannot be undone.`;
          }
          this.elements.deleteConfirmModal.style.display = 'flex';
      } else {
          // Fallback if modal elements weren't found
          if (confirm(`Fallback Confirmation: Delete budget "${budget.name}"?`)) {
              this.deleteBudgetApi(budgetId);
          }
      }
  }

  hideDeleteConfirmModal() {
      // Check if the modal element exists
      if (!this.elements.deleteConfirmModal) return;
      this.budgetToDeleteId = null;
      this.elements.deleteConfirmModal.style.display = 'none';
  }

  confirmBudgetDelete() {
      if (this.budgetToDeleteId !== null) {
          // Optionally add loading state to delete button here
          this.deleteBudgetApi(this.budgetToDeleteId);
      }
      this.hideDeleteConfirmModal(); // Hide modal after confirmation/API call starts
  }

  async deleteBudgetApi(budgetId) {
      if (!this.authData || !this.authData.token) { window.location.href = 'login.html'; return; }
      const url = `http://127.0.0.1:5000/api/budgets/${budgetId}`;

      // Optionally show loading indicator on button or modal

      try {
          const response = await fetch(url, { method: 'DELETE', headers: { 'Authorization': `Bearer ${this.authData.token}` } });
          if (!response.ok) { const err = await response.json(); throw new Error(err.msg || 'Failed to delete budget'); }

          // Remove from local list BEFORE re-rendering
          this.allBudgets = this.allBudgets.filter(b => b.id !== budgetId);

          // Recalculate and re-render everything
          this.calculateSummary();
          this.renderSummary();
          this.renderBudgets(); // Re-render grid without deleted item

          Utils.toast.show('Budget deleted!', 'success');
      } catch (error) {
          console.error('Error deleting budget:', error);
          Utils.toast.show(error.message, 'error');
      } finally {
          // Remove loading indicator if added
      }
  }
  

  // LOGOUT
  handleLogout() { 
     localStorage.removeItem('fintrack_auth'); sessionStorage.clear(); window.Utils.toast.show('Logged out', 'info'); setTimeout(() => { window.location.href = 'login.html'; }, 1000);
  }
}

// INITIALIZE THE PAGE
document.addEventListener('DOMContentLoaded', () => { 
  if (window.Utils) { window.Utils.accentColor.initialize(); window.Utils.darkMode.initialize(); } window.budgetsPage = new BudgetsPage();
});

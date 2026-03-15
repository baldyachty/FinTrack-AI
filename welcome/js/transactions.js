// ===== TRANSACTIONS PAGE FUNCTIONALITY =====


 
 
 
class TransactionsPage {
  constructor() {
    // Check for dependencies
    if (!window.Utils) {
      console.error('Error: Utils.js is not loaded!');
      alert('A critical error occurred. Please refresh the page.');
      return;
    }

    // Auth check
    this.authData = this.checkAuth();
    if (!this.authData || !this.authData.user || !this.authData.token) {
      window.location.href = 'login.html';
      return;
    }
    this.user = this.authData.user;

    this.allTransactions = []; // Store API data
    this.editingTransactionId = null;
    this.transactionToDeleteId = null; //  Store ID for delete confirmation
    this.init();
  }

  // INITIALIZATION
  init() {
    console.log('Transactions Page Initializing...');

    // Cache DOM elements
    this.elements = {
      userName: document.getElementById('userName'),
      userEmail: document.getElementById('userEmail'),
      userAvatar: document.getElementById('userAvatar'),
      tableBody: document.getElementById('transactionsTableBody'),
      noResults: document.getElementById('noResults'),
      filterSearch: document.getElementById('filterSearch'),
      filterType: document.getElementById('filterType'),
      filterCategory: document.getElementById('filterCategory'),
      filterReset: document.getElementById('filterReset'),
      mainHeader: document.getElementById('mainHeader'),
      mainFooter: document.getElementById('mainFooter'),
      darkModeToggle: document.getElementById('darkModeToggle'),
      logoutButton: document.getElementById('logoutButton'),
      addTransactionBtn: document.getElementById('addTransactionBtn'),
      // Add/Edit Modal
      modal: document.getElementById('transactionModal'),
      modalForm: document.getElementById('transactionForm'),
      cancelModalBtn: document.getElementById('cancelModalBtn'),
      modalTitle: document.querySelector('#transactionModal .modal-title'),
      modalSubmitBtn: document.querySelector('#transactionModal button[type="submit"]'),
      transactionTypeSelect: document.getElementById('transactionType'),
      transactionNameInput: document.getElementById('transactionName'),
      transactionAmountInput: document.getElementById('transactionAmount'),
      transactionCategorySelect: document.getElementById('transactionCategory'),
      transactionDateInput: document.getElementById('transactionDate'),
      //  Delete Confirmation Modal Elements
      deleteConfirmModal: document.getElementById('deleteConfirmModal'),
      deleteConfirmMessage: document.getElementById('deleteConfirmMessage'),
      cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
      confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
      resolveConfirmModal: document.getElementById('resolveConfirmModal'),
      resolveConfirmMessage: document.getElementById('resolveConfirmMessage'),
      cancelResolveBtn: document.getElementById('cancelResolveBtn'),
      confirmResolveBtn: document.getElementById('confirmResolveBtn'),
      
    };

    // Check if delete modal elements exist before setting up listeners
    if (!this.elements.deleteConfirmModal || !this.elements.cancelDeleteBtn || !this.elements.confirmDeleteBtn) {
        console.error("Delete confirmation modal elements not found in HTML!");
        // Optionally disable delete functionality if modal is missing
    }

    this.setupEventListeners();
    this.loadUserData();
    this.loadApiTransactions();

    // Animate header/footer
    this.elements.mainHeader?.classList.add('animate-fade-in');
    this.elements.mainFooter?.classList.add('animate-fade-in');
  }

  //  SECURITY & USER DATA
  checkAuth() { 
    const authDataString = localStorage.getItem('fintrack_auth'); if (!authDataString) { console.log('No auth data'); return null; } try { const parsedData = JSON.parse(authDataString); if(parsedData && parsedData.user && parsedData.token) { return parsedData; } else { throw new Error('Invalid auth'); } } catch (e) { console.error('Auth parse error:', e); localStorage.removeItem('fintrack_auth'); return null; }
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
    // Shared Listeners
    this.elements.darkModeToggle?.addEventListener('click', () => window.Utils.darkMode.toggle());
    this.elements.logoutButton?.addEventListener('click', () => this.handleLogout());

    //Add/Edit Modal Listeners
    this.elements.addTransactionBtn?.addEventListener('click', () => this.showModalForAdd());
    this.elements.cancelModalBtn?.addEventListener('click', () => this.hideModal());
    this.elements.modal?.addEventListener('click', (e) => { if (e.target === this.elements.modal) this.hideModal(); });
    this.elements.modalForm?.addEventListener('submit', (e) => { e.preventDefault(); this.handleTransactionSubmit(); });
    this.elements.transactionTypeSelect?.addEventListener('change', (e) => this.updateCategoryOptions(e.target.value));
    this.elements.transactionNameInput?.addEventListener('blur', (e) => this.predictCategory(e.target.value));
    // Filter Listeners
    this.elements.filterSearch?.addEventListener('input', () => this.applyFilters());
    this.elements.filterType?.addEventListener('change', () => this.applyFilters());
    this.elements.filterCategory?.addEventListener('change', () => this.applyFilters());
    this.elements.filterReset?.addEventListener('click', () => this.resetFilters());

    // Table Action Button Listener
    this.elements.tableBody?.addEventListener('click', (event) => {
      const editButton = event.target.closest('button.edit-btn');
      const deleteButton = event.target.closest('button.delete-btn');
      const resolveButton = event.target.closest('button.resolve-btn');
      if (editButton) { this.showModalForEdit(parseInt(editButton.dataset.id)); }
      else if (deleteButton) { this.handleDeleteClick(parseInt(deleteButton.dataset.id)); }
      else if (resolveButton) { this.handleResolveClick(parseInt(resolveButton.dataset.id)); }
    });

    //  Delete Confirmation Modal Listener
    // Only add these listeners if the elements were found
    if (this.elements.cancelDeleteBtn) {
        this.elements.cancelDeleteBtn.addEventListener('click', () => this.hideDeleteConfirmModal());
    }
    if (this.elements.confirmDeleteBtn) {
        this.elements.confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());
    }
    if (this.elements.deleteConfirmModal) {
        this.elements.deleteConfirmModal.addEventListener('click', (e) => {
            if (e.target === this.elements.deleteConfirmModal) this.hideDeleteConfirmModal();
        });
    }
    if (this.elements.cancelResolveBtn) {
        this.elements.cancelResolveBtn.addEventListener('click', () => this.hideResolveConfirmModal());
    }
    if (this.elements.confirmResolveBtn) {
        this.elements.confirmResolveBtn.addEventListener('click', () => this.confirmResolve());
    }
    if (this.elements.resolveConfirmModal) {
        this.elements.resolveConfirmModal.addEventListener('click', (e) => {
            if (e.target === this.elements.resolveConfirmModal) this.hideResolveConfirmModal();
        });
    }
    
  }

  // ADD/EDIT MODAL & FORM HANDLING 
  showModalForAdd() { 
    this.editingTransactionId = null; this.elements.modalTitle.textContent = 'Add New Transaction'; this.elements.modalSubmitBtn.textContent = 'Save Transaction'; this.elements.modalForm.reset(); this.elements.transactionDateInput.value = new Date().toISOString().split('T')[0]; this.updateCategoryOptions('expense'); this.elements.modal.style.display = 'flex';
  }
  showModalForEdit(transactionId) { 
    const transaction = this.allTransactions.find(tx => tx.id === transactionId); if (!transaction) { console.error(`Tx ID ${transactionId} not found.`); Utils.toast.show('Error finding transaction.', 'error'); return; } this.editingTransactionId = transactionId; this.elements.modalTitle.textContent = 'Edit Transaction'; this.elements.modalSubmitBtn.textContent = 'Update Transaction'; this.elements.transactionTypeSelect.value = transaction.type; this.updateCategoryOptions(transaction.type); this.elements.transactionNameInput.value = transaction.name; this.elements.transactionAmountInput.value = transaction.amount; this.elements.transactionCategorySelect.value = transaction.category; this.elements.transactionDateInput.value = transaction.date; this.elements.modal.style.display = 'flex';
  }
  hideModal() { 
    this.editingTransactionId = null; this.elements.modal.style.display = 'none';
  }
  updateCategoryOptions(type) { 
     const categories = { expense: [ { value: 'food', text: 'Food' }, { value: 'transport', text: 'Transport' }, { value: 'rent', text: 'Rent' }, { value: 'shopping', text: 'Shopping' }, { value: 'utilities', text: 'Utilities' }, { value: 'other', text: 'Other' }], income: [ { value: 'salary', text: 'Salary' }, { value: 'freelance', text: 'Freelance' }, { value: 'investment', text: 'Investment' }, { value: 'other', text: 'Other' }] }; const options = categories[type] || []; this.elements.transactionCategorySelect.innerHTML = ''; options.forEach(opt => { const el = document.createElement('option'); el.value = opt.value; el.textContent = opt.text; this.elements.transactionCategorySelect.appendChild(el); });
  }
  async predictCategory(description) {
    // Don't predict for empty or very short descriptions
    if (!description || description.trim().length < 3) return;
    
    console.log(`Predicting category for: "${description}"...`);

    try {
        const response = await fetch('http://127.0.0.1:5000/api/predict/category', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authData.token}`
            },
            body: JSON.stringify({ description: description })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.category) {
                // Check if the returned category exists in the current dropdown options
                // (This prevents errors if the category doesn't match the current Type)
                const option = this.elements.transactionCategorySelect.querySelector(`option[value="${data.category}"]`);
                
                if (option) {
                    this.elements.transactionCategorySelect.value = data.category;
                    console.log(`Auto-categorized to: ${data.category}`);
                    
                    // Optional: Visual feedback (flash the dropdown)
                    this.elements.transactionCategorySelect.style.transition = "background-color 0.3s";
                    this.elements.transactionCategorySelect.style.backgroundColor = "rgba(99, 102, 241, 0.1)"; // Light primary color
                    setTimeout(() => {
                        this.elements.transactionCategorySelect.style.backgroundColor = "";
                    }, 500);
                    
                    window.Utils.toast.show(`Auto-selected: ${data.category}`, 'info');
                } else {
                    console.log(`Predicted category "${data.category}" not valid for current transaction type.`);
                }
            }
        }
    } catch (error) {
        console.error("Error predicting category:", error);
    }
  }
  async handleTransactionSubmit() {
     const transactionData = { name: this.elements.transactionNameInput.value.trim(), amount: parseFloat(this.elements.transactionAmountInput.value), category: this.elements.transactionCategorySelect.value, date: this.elements.transactionDateInput.value, type: this.elements.transactionTypeSelect.value }; 
     if (!transactionData.name || isNaN(transactionData.amount) || !transactionData.category || !transactionData.date || !transactionData.type) { Utils.toast.show('Please fill fields correctly.', 'error'); return; } 
     if (!this.authData || !this.authData.token) { window.location.href = 'login.html'; return; } 
     
     let url = 'http://127.0.0.1:5000/api/transactions'; 
     let method = 'POST'; 
     if (this.editingTransactionId !== null) { 
         url += `/${this.editingTransactionId}`; 
         method = 'PUT'; 
     } 
     
     try { 
         const response = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.authData.token}` }, body: JSON.stringify(transactionData) }); 
         if (!response.ok) { const err = await response.json(); throw new Error(err.msg || `Failed to ${this.editingTransactionId ? 'update' : 'save'} tx`); } 
         
         const savedTransaction = await response.json(); 

         //  Anomaly Check
         if (this.editingTransactionId !== null) { 
             // This is an UPDATE
             const index = this.allTransactions.findIndex(tx => tx.id === this.editingTransactionId); 
             if (index !== -1) { this.allTransactions[index] = savedTransaction; } 
             Utils.toast.show('Updated!', 'success'); 
         } else { 
             // This is a NEW transaction
             this.allTransactions.unshift(savedTransaction); 
             
             // Check the anomaly flag
             if (savedTransaction.is_anomaly) {
                 // Show a special warning toast
                 Utils.toast.show('Unusual transaction detected. Please review it.', 'warning');
             } else {
                 // Show the normal success toast
                 Utils.toast.show('Saved!', 'success'); 
             }
         } 
         

         this.hideModal(); 
         this.applyFilters(); 
     } catch (error) { 
         console.error(`Error ${method}:`, error); 
         window.Utils.toast.show(error.message, 'error'); 
     }
  }

  //API DATA & RENDERING
  async loadApiTransactions() { 
    if (!this.authData || !this.authData.token) { console.error("No auth token"); window.location.href = 'login.html'; return; } try { const response = await fetch('http://127.0.0.1:5000/api/transactions', { method: 'GET', headers: { 'Authorization': `Bearer ${this.authData.token}` } }); if (response.status === 401) { localStorage.removeItem('fintrack_auth'); window.location.href = 'login.html'; return; } if (!response.ok) { throw new Error('Failed to fetch'); } const transactions = await response.json(); this.allTransactions = transactions; this.renderTransactionList(this.allTransactions); } catch (error) { console.error('Error fetching:', error); window.Utils.toast.show('Could not load', 'error'); }
  }
  renderTransactionList(transactions) {
     this.elements.tableBody.innerHTML = ''; 
     this.elements.noResults.style.display = transactions.length === 0 ? 'block' : 'none'; 
     
     transactions.forEach(tx => { 
         const isExpense = tx.type === 'expense'; 
         const amount = parseFloat(tx.amount); 
         const row = document.createElement('tr'); 
         row.dataset.id = tx.id; 

        // Anomaly Icon Logic ---
        // It is now a <button> 
        const anomalyIcon = tx.is_anomaly 
          ? `<button class="btn btn-ghost resolve-btn" data-id="${tx.id}" title="Resolve Anomaly: Mark as valid" 
                     style="color: #f59e0b; padding: 0; margin-left: 8px; cursor: pointer; display: inline-flex;
                            vertical-align: middle; border: none; background: transparent;">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                 <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                 <line x1="12" y1="9" x2="12" y2="13"></line>
                 <line x1="12" y1="17" x2="12.01" y2="17"></line>
               </svg>
             </button>`
          : ''; // If not, show nothing
        

        // The icon is added right after tx.name
        row.innerHTML = `
          <td>${tx.date}</td>
          <td>${tx.name} ${anomalyIcon}</td>
          <td class="category">${tx.category}</td>
          <td class="amount ${isExpense ? 'expense' : 'income'}">${isExpense ? '-' : '+'}KSh ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td><span class="type-tag ${isExpense ? 'expense' : 'income'}">${tx.type}</span></td>
          <td class="actions">
            <button class="btn btn-ghost edit-btn" data-id="${tx.id}" aria-label="Edit ${tx.name}" title="Edit"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="pointer-events: none;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
            <button class="btn btn-ghost delete-btn" data-id="${tx.id}" aria-label="Delete ${tx.name}" title="Delete"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="pointer-events: none;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
          </td>
        `;
         
         this.elements.tableBody.appendChild(row); 
     });
  }

  // FILTERING LOGIC
  applyFilters() { 
     const searchTerm = this.elements.filterSearch?.value.toLowerCase() || ''; const type = this.elements.filterType?.value || 'all'; const category = this.elements.filterCategory?.value || 'all'; const filtered = this.allTransactions.filter(tx => { const nameMatch = tx.name.toLowerCase().includes(searchTerm); const typeMatch = (type === 'all') || (tx.type === type); const categoryMatch = (category === 'all') || (tx.category === category); return nameMatch && typeMatch && categoryMatch; }); this.renderTransactionList(filtered);
  }
  resetFilters() { 
    if(this.elements.filterSearch) this.elements.filterSearch.value = ''; if(this.elements.filterType) this.elements.filterType.value = 'all'; if(this.elements.filterCategory) this.elements.filterCategory.value = 'all'; this.renderTransactionList(this.allTransactions);
  }

  // DELETE HANDLING
  handleDeleteClick(transactionId) {
      // Check if the modal element exists
      if (!this.elements.deleteConfirmModal) {
          console.error("Delete confirmation modal not found. Falling back to default confirm.");
          // Fallback to default confirm if modal is missing
          const transaction = this.allTransactions.find(tx => tx.id === transactionId);
          if (transaction && confirm(`Fallback: Delete "${transaction.name}"?`)) {
              this.deleteTransactionApi(transactionId);
          }
          return;
      }

      const transaction = this.allTransactions.find(tx => tx.id === transactionId);
      if (!transaction) return;

      // Store the ID and show the custom modal
      this.transactionToDeleteId = transactionId;
      // Update message text safely
      if (this.elements.deleteConfirmMessage) {
        this.elements.deleteConfirmMessage.textContent = `Are you sure you want to permanently delete "${transaction.name}"? This action cannot be undone.`;
      }
      this.elements.deleteConfirmModal.style.display = 'flex';
  }

  hideDeleteConfirmModal() {
      // Check if the modal element exists
      if (!this.elements.deleteConfirmModal) return;
      this.transactionToDeleteId = null; // Clear the stored ID
      this.elements.deleteConfirmModal.style.display = 'none';
  }

  confirmDelete() {
      if (this.transactionToDeleteId !== null) {
          // Add loading state to button maybe?
          this.deleteTransactionApi(this.transactionToDeleteId);
      }
      this.hideDeleteConfirmModal(); // Hide modal after confirmation/API call starts
  }

  async deleteTransactionApi(transactionId) {
      if (!this.authData || !this.authData.token) { window.location.href = 'login.html'; return; }
      const url = `http://127.0.0.1:5000/api/transactions/${transactionId}`;
      try {
          const response = await fetch(url, { method: 'DELETE', headers: { 'Authorization': `Bearer ${this.authData.token}` } });
          if (!response.ok) { const err = await response.json(); throw new Error(err.msg || 'Failed to delete'); }
          // Remove from local list
          this.allTransactions = this.allTransactions.filter(tx => tx.id !== transactionId);
          // Re-render
          this.applyFilters();
          Utils.toast.show('Transaction deleted!', 'success');
      } catch (error) { console.error('Error deleting:', error); Utils.toast.show(error.message, 'error'); }
  }
  handleResolveClick(transactionId) {
      if (!this.elements.resolveConfirmModal) {
          console.error("Resolve confirmation modal not found.");
          // Fallback if modal is missing for some reason
          if (confirm("Mark this transaction as valid?")) {
              this.resolveAnomalyApi(transactionId);
          }
          return;
      }

      const transaction = this.allTransactions.find(tx => tx.id === transactionId);
      if (!transaction) return;

      // Store the ID and show the custom modal
      this.transactionToResolveId = transactionId; 
      if (this.elements.resolveConfirmMessage) {
        this.elements.resolveConfirmMessage.textContent = `Are you sure the transaction "${transaction.name}" for KSh ${transaction.amount} was valid? This will remove the warning flag.`;
      }
      this.elements.resolveConfirmModal.style.display = 'flex';
  }

  hideResolveConfirmModal() {
      if (!this.elements.resolveConfirmModal) return;
      this.transactionToResolveId = null; // Clear the stored ID
      this.elements.resolveConfirmModal.style.display = 'none';
  }

  confirmResolve() {
      if (this.transactionToResolveId !== null) {
          this.resolveAnomalyApi(this.transactionToResolveId);
      }
      this.hideResolveConfirmModal(); // Hide modal after confirmation
  }

  async resolveAnomalyApi(transactionId) {
      if (!this.authData || !this.authData.token) { window.location.href = 'login.html'; return; }
      
      const url = `http://127.0.0.1:5000/api/transactions/${transactionId}/resolve`;
      
      try {
          const response = await fetch(url, { 
              method: 'PUT', 
              headers: { 'Authorization': `Bearer ${this.authData.token}` } 
          });
          
          if (!response.ok) { const err = await response.json(); throw new Error(err.msg || 'Failed to resolve'); }

          const updatedTransaction = await response.json();

          // Update the transaction in our local list
          const index = this.allTransactions.findIndex(tx => tx.id === transactionId);
          if (index !== -1) {
              this.allTransactions[index] = updatedTransaction;
          }
          
          // Re-render the list to make the icon disappear
          this.applyFilters();
          Utils.toast.show('Anomaly resolved!', 'success');

      } catch (error) { 
          console.error('Error resolving anomaly:', error); 
          Utils.toast.show(error.message, 'error'); 
      }
  }
  

  // LOGOUT
  handleLogout() { 
     localStorage.removeItem('fintrack_auth'); sessionStorage.clear(); window.Utils.toast.show('Logged out', 'info'); setTimeout(() => { window.location.href = 'login.html'; }, 1000);
  }
}

// INITIALIZE THE PAGE
document.addEventListener('DOMContentLoaded', () => {
  if (window.Utils) { window.Utils.accentColor.initialize(); window.Utils.darkMode.initialize(); } window.transactionsPage = new TransactionsPage();
});
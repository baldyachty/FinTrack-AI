//  DASHBOARD PAGE FUNCTIONALITY 



class DashboardPage {
  constructor() {
    // Check for dependencies
    if (!window.Utils || !window.Chart) {
      console.error('Error: Utils.js or Chart.js is not loaded!');
      alert('A critical error occurred. Please refresh the page.');
      return;
    }

    // Auth check is the first thing we do
    this.authData = this.checkAuth(); 
    if (!this.authData || !this.authData.user || !this.authData.token) {
      // If auth check fails, redirect immediately.
      window.location.href = 'login.html';
      return;
    }
    this.user = this.authData.user; //  Store just the user part for convenience

    // If auth is successful, proceed with initialization
    this.init();
  }

  // INITIALIZATION
  init() {
    console.log('Dashboard Initializing...');

    // Cache DOM elements
    this.elements = {
      mainHeader: document.getElementById('mainHeader'),
      mainFooter: document.getElementById('mainFooter'),
      welcomeTitle: document.getElementById('welcomeTitle'),
      userName: document.getElementById('userName'),
      userEmail: document.getElementById('userEmail'),
      userAvatar: document.getElementById('userAvatar'),
      darkModeToggle: document.getElementById('darkModeToggle'),
      logoutButton: document.getElementById('logoutButton'),

      // Modal elements
      addTransactionBtn: document.getElementById('addTransactionBtn'),
      modal: document.getElementById('transactionModal'),
      modalForm: document.getElementById('transactionForm'),
      cancelModalBtn: document.getElementById('cancelModalBtn'),
      transactionTypeSelect: document.getElementById('transactionType'),
      transactionCategorySelect: document.getElementById('transactionCategory'),
      transactionNameInput: document.getElementById('transactionName'),
      transactionDateInput: document.getElementById('transactionDate'),

      //  Card content elements 
      totalBalanceValue: document.querySelector('.card-balance .card-value'), // Target the balance value
      monthlySpendingSubtitle: document.querySelector('.card-balance .card-subtitle'), // Target subtitle
      spendingChartCanvas: document.getElementById('spendingChart'),
      transactionList: document.getElementById('transactionList'),
      budgetList: document.getElementById('budgetList'),
      smartTipsList: document.getElementById('smartTipsList'),

      // Quick Add form elements
      quickAddForm: document.getElementById('quickAddForm'),
      quickAddName: document.getElementById('quickAddName'),
      quickAddAmount: document.getElementById('quickAddAmount'),

      // Goal list element
      goalList: document.getElementById('goalList'),
      
    };

    this.setupEventListeners();
    this.loadUserData();
    this.loadApiData(); // NOW FETCHES ALL DATA
    this.showWelcomeAnimation();
  }

  //  SECURITY & USER DATA 
  checkAuth() {
    const authDataString = localStorage.getItem('fintrack_auth');
    if (!authDataString) { console.log('No auth data found.'); return null; }
    try {
      const parsedData = JSON.parse(authDataString);
      if (parsedData && parsedData.user && parsedData.token) {
          return parsedData; // Return the full object
      } else { throw new Error('Invalid auth structure'); }
    } catch (e) { console.error('Auth parse error:', e); localStorage.removeItem('fintrack_auth'); return null; }
  }

  loadUserData() {
    if (!this.user) return;
    const { name, email, avatar } = this.user; // Use destructured user object
    const firstName = name.split(' ')[0];
    this.elements.welcomeTitle.textContent = `Welcome back, ${firstName}!`;
    this.elements.userName.textContent = name;
    this.elements.userEmail.textContent = email;
    this.elements.userAvatar.textContent = name ? name.substring(0, 2).toUpperCase() : '?';
  }

  //  EVENT LISTENERS
  setupEventListeners() {
    this.elements.darkModeToggle?.addEventListener('click', () => window.Utils.darkMode.toggle());
    this.elements.logoutButton?.addEventListener('click', () => this.handleLogout());
    this.elements.addTransactionBtn?.addEventListener('click', () => this.showModal());
    this.elements.cancelModalBtn?.addEventListener('click', () => this.hideModal());
    this.elements.modal?.addEventListener('click', (e) => { if (e.target === this.elements.modal) this.hideModal(); });
    this.elements.modalForm?.addEventListener('submit', (e) => { e.preventDefault(); this.handleTransactionSubmit(); });
    this.elements.quickAddForm?.addEventListener('submit', (e) => { e.preventDefault(); this.handleQuickAddSubmit(); });
    this.elements.transactionTypeSelect?.addEventListener('change', (e) => this.updateCategoryOptions(e.target.value));
    this.elements.transactionNameInput?.addEventListener('blur', (e) => this.predictCategory(e.target.value));
  }

  // MODAL & FORM HANDLING
  showModal() { 
    this.elements.transactionDateInput.value = new Date().toISOString().split('T')[0];
    this.elements.modalForm.reset();
    this.updateCategoryOptions('expense');
    this.elements.modal.style.display = 'flex';
  }
  hideModal() { 
    this.elements.modal.style.display = 'none';
  }
  updateCategoryOptions(type) { 
    const categories = { expense: [ { value: 'food', text: 'Food' },  { value: 'other', text: 'Other' }], income: [ { value: 'salary', text: 'Salary' }, /* ... */ { value: 'other', text: 'Other' }] };
    const options = categories[type] || [];
    this.elements.transactionCategorySelect.innerHTML = ''; options.forEach(opt => { const el = document.createElement('option'); el.value = opt.value; el.textContent = opt.text; this.elements.transactionCategorySelect.appendChild(el); });
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
                const option = this.elements.transactionCategorySelect.querySelector(`option[value="${data.category}"]`);
                
                if (option) {
                    this.elements.transactionCategorySelect.value = data.category;
                    console.log(`Auto-categorized to: ${data.category}`);
                    
                    //  Visual feedback (flash the dropdown)
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

  // Submit handlers now re-fetch data after saving
  async handleTransactionSubmit() {
    const formData = new FormData(this.elements.modalForm);
    const transaction = Object.fromEntries(formData.entries());
    
    // We pass the full object to saveTransaction
    const saved = await this.saveTransaction(transaction); 
    
    if (saved) {
      this.hideModal();
      
      //  New Anomaly Check 
      // The 'saved' object is the full transaction response
      if (saved.is_anomaly) {
        // Show a special warning toast
        Utils.toast.show('Unusual transaction detected. Please review.', 'warning');
      } else {
        // Show the normal success toast
        Utils.toast.show('Transaction saved! Updating dashboard...', 'success');
      }
      
      
      await this.loadApiData(); // Re-fetch all data
    }
  }

  async handleQuickAddSubmit() {
    const name = this.elements.quickAddName.value;
    const amount = this.elements.quickAddAmount.value;
    if (!name || !amount) { window.Utils.toast.show('Please fill in both fields', 'error'); return; }
    const transaction = { name: name, amount: amount, type: 'expense', category: 'other', date: new Date().toISOString().split('T')[0], };
    const saved = await this.saveTransaction(transaction); // Use helper
    if (saved) {
      this.elements.quickAddForm.reset();
      window.Utils.toast.show('Expense added! Updating dashboard...', 'success');
      await this.loadApiData(); // Re-fetch all data
    }
  }

  // HELPER FUNCTION TO SAVE TRANSACTION 
  async saveTransaction(transactionData) { 
     if (!this.authData || !this.authData.token) { window.location.href = 'login.html'; return null; }
     try { const response = await fetch('http://127.0.0.1:5000/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.authData.token}` }, body: JSON.stringify({ name: transactionData.name, amount: transactionData.amount, category: transactionData.category, date: transactionData.date, type: transactionData.type }) }); if (!response.ok) { const err = await response.json(); throw new Error(err.msg || 'Failed to save transaction'); } return await response.json(); } catch (error) { console.error('Error saving transaction:', error); window.Utils.toast.show(error.message, 'error'); return null; }
  }


  //  API DATA LOADING & RENDERING 
  // Fetches all data needed for the dashboard
  async loadApiData() {
    console.log("Fetching dashboard data...");
    if (!this.authData || !this.authData.token) { window.location.href = 'login.html'; return; }

    // Display loading states or keep existing data while fetching
    

    try {
      // Fetch analytics (for balance, chart) and budgets and transactions in parallel
      const [analyticsResponse, budgetsResponse, transactionsResponse] = await Promise.all([
        fetch('http://127.0.0.1:5000/api/analytics', { headers: { 'Authorization': `Bearer ${this.authData.token}` } }),
        fetch('http://127.0.0.1:5000/api/budgets', { headers: { 'Authorization': `Bearer ${this.authData.token}` } }),
        fetch('http://127.0.0.1:5000/api/transactions', { headers: { 'Authorization': `Bearer ${this.authData.token}` } }) // Fetch transactions too
      ]);

      // Check all responses for authentication errors first
      if (analyticsResponse.status === 401 || budgetsResponse.status === 401 || transactionsResponse.status === 401) {
        console.error("Authentication error detected. Redirecting to login.");
        localStorage.removeItem('fintrack_auth');
        window.location.href = 'login.html';
        return; // Stop further processing
      }
      // Check for other errors
      if (!analyticsResponse.ok || !budgetsResponse.ok || !transactionsResponse.ok) {
        console.error("Failed to fetch dashboard data:", {
            analyticsStatus: analyticsResponse.status,
            budgetsStatus: budgetsResponse.status,
            transactionsStatus: transactionsResponse.status
        });
        throw new Error('Failed to fetch dashboard data');
      }

      const analyticsData = await analyticsResponse.json();
      const budgetsData = await budgetsResponse.json();
      const transactionsData = await transactionsResponse.json();

      console.log("Dashboard data received:", { analyticsData, budgetsData, transactionsData });

      //  Render components with the fetched data
      this.renderTotalBalance(analyticsData.stats);
      this.renderSpendingChart(analyticsData.charts.categoryDonut); // Use donut data for dashboard chart
      this.renderTransactionList(transactionsData); // Pass fetched transactions
      this.renderBudgetList(budgetsData); // Pass fetched budgets
      this.renderSmartTips(analyticsData, budgetsData); // Pass data for dynamic tips

    } catch (error) {
      console.error('Error fetching/processing dashboard data:', error);
      Utils.toast.show('Could not load dashboard data.', 'error');
      // Show error states in cards
      if (this.elements.totalBalanceValue) this.elements.totalBalanceValue.textContent = 'Error';
      if (this.elements.transactionList) this.elements.transactionList.innerHTML = '<li>Error loading</li>';
      if (this.elements.budgetList) this.elements.budgetList.innerHTML = '<li>Error loading</li>';
    }
  }

  //  RENDER FUNCTIONS

  renderTotalBalance(statsData) {
    if (!this.elements.totalBalanceValue || !statsData) return;
    const balance = statsData.totalIncome - statsData.totalSpent;
    // Animate the balance count-up
    this.animateCountUp(this.elements.totalBalanceValue, balance, balance < 0, 'KSh ');

    // Update subtitle (optional, maybe show total spent this month?)
    if (this.elements.monthlySpendingSubtitle) {
        this.elements.monthlySpendingSubtitle.textContent = `Total Spending: KSh ${statsData.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  renderSpendingChart(categoryData) {
    // Uses the categoryDonut data from the analytics endpoint
    if (!this.elements.spendingChartCanvas || !categoryData) return;

    const ctx = this.elements.spendingChartCanvas.getContext('2d');
    if (window.mySpendingChart) { window.mySpendingChart.destroy(); }

    // Use a fixed color palette or generate dynamically if needed
    const backgroundColors = ['var(--primary)', '#06b6d4', '#ec4899', '#f59e0b', '#64748b', '#22c55e', '#8b5cf6'];

    window.mySpendingChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categoryData.labels,
        datasets: [{
          label: 'Spending',
          data: categoryData.values,
          backgroundColor: categoryData.labels.map((_, i) => backgroundColors[i % backgroundColors.length]),
          borderColor: 'var(--bg-primary)',
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: { 
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { family: "'Inter', sans-serif" }, color: 'var(--text-secondary)' } } },
        cutout: '70%'
      }
    });
  }

  renderTransactionList(transactions) {
    // Renders the top 5 transactions passed from loadApiData
    if (!this.elements.transactionList) return;
    this.elements.transactionList.innerHTML = ''; // Clear existing
    const recentTransactions = transactions.slice(0, 5); // Ensure only top 5
    if (recentTransactions.length === 0) {
        this.elements.transactionList.innerHTML = '<li class="transaction-item"><div class="info"><span class="name">No transactions yet.</span></div></li>';
    } else {
        // Render in the fetched order (newest first)
        recentTransactions.forEach(tx => this.addTransactionToList(tx, false)); // false = append
    }
  }

  renderBudgetList(budgets) {
    // Renders budgets passed from loadApiData
    if (!this.elements.budgetList) return;
    this.elements.budgetList.innerHTML = ''; // Clear existing
     if (budgets.length === 0) {
        this.elements.budgetList.innerHTML = '<li class="budget-item"><div class="info"><span class="name">No budgets created yet.</span></div></li>';
    } else {
        // Show top budgets (e.g., first 4)
        const topBudgets = budgets.slice(0, 4);
        topBudgets.forEach(budget => this.addBudgetItem(this.elements.budgetList, budget));
    }
  }

  renderFinancialGoal() { /* ... (keep mock data or remove if not implementing) ... */
     // Remove this function or fetch real goal data if you implement goals
  }

  
  //  renderSmartTips (Now driven by API)
  renderSmartTips(analyticsData, budgets) {
      if (!this.elements.smartTipsList) return;
      this.elements.smartTipsList.innerHTML = ''; // Clear existing 

      // Get the tips from the analyticsData object
      const tips = analyticsData.smart_tips || []; // Use tips from API, or empty list

      if (tips.length === 0) {
          // Show a default message if API returns no tips
          this.elements.smartTipsList.innerHTML = '<li>Add more transactions to see smart tips!</li>';
          return;
      }

      // Display the tips
      tips.forEach(tip => {
          const li = document.createElement('li');
          li.textContent = tip; // Set the text from the API
          this.elements.smartTipsList.appendChild(li);
      });
  }


  // Re-usable Helpers

  addTransactionToList(tx, prepend = false) { 
      if (!this.elements.transactionList) return; const isExpense = tx.type === 'expense'; const amount = parseFloat(tx.amount); const item = document.createElement('li'); item.className = 'transaction-item'; item.innerHTML = `<div class="info"><span class="name">${tx.name}</span><span class="date">${tx.date}</span></div><span class="amount ${isExpense ? 'expense' : 'income'}">${isExpense ? '-' : '+'}KSh ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`; if (prepend) { this.elements.transactionList.prepend(item); } else { this.elements.transactionList.appendChild(item); }
  }

  addBudgetItem(listElement, itemData) { 
     if (!listElement) return; const { name, current, total } = itemData; const percentage = total > 0 ? (current / total) * 100 : 0; const isOver = current > total; const item = document.createElement('li'); item.className = `budget-item ${isOver ? 'over' : ''}`; item.innerHTML = `<div class="info"><span class="name">${name}</span><span class="details">KSh ${current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of KSh ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><div class="progress-bar"><div class="progress"></div></div></div><span class="amount ${isOver ? 'expense' : ''}">${isOver ? 'Over' : `${Math.round(percentage)}%`}</span>`; listElement.appendChild(item); const progressBar = item.querySelector('.progress'); if(progressBar) setTimeout(() => progressBar.style.width = `${Math.min(percentage, 100)}%`, 50);
  }

  //  Animate Count Up Helper (Consistent Formatting)
  animateCountUp(el, target, isNegative = false, prefix = '') {
      if (!el) return;
      el.classList.add('animate-count-up'); // Ensure animation class is present

      let current = 0;
      // Use requestAnimationFrame for smoother animation
      const duration = 1000; // Animation duration in ms
      let startTimestamp = null;

      const step = (timestamp) => {
          if (!startTimestamp) startTimestamp = timestamp;
          const progress = Math.min((timestamp - startTimestamp) / duration, 1);
          current = progress * target; // Linear interpolation

          // Format consistently with 2 decimal places
          el.textContent = `${prefix}${isNegative ? '-' : ''}${Math.abs(current).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

          if (progress < 1) {
              window.requestAnimationFrame(step);
          } else {
              // Ensure final value is exact
              el.textContent = `${prefix}${isNegative ? '-' : ''}${Math.abs(target).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
      };
      window.requestAnimationFrame(step);
  }

  // LOGOUT & ANIMATIONS
  handleLogout() { 
     localStorage.removeItem('fintrack_auth'); sessionStorage.clear(); window.Utils.toast.show('You have been logged out.', 'info'); setTimeout(() => { window.location.href = 'login.html'; }, 1000);
  }
  showWelcomeAnimation() { 
      const cards = document.querySelectorAll('.card'); const header = this.elements.mainHeader; const footer = this.elements.mainFooter;
      if (sessionStorage.getItem('just_logged_in')) { console.log('First login animation'); if(header) header.classList.add('animate-fade-in'); if(footer) footer.classList.add('animate-fade-in'); sessionStorage.removeItem('just_logged_in'); } else { if(header) header.style.opacity = '1'; if(footer) footer.style.opacity = '1'; cards.forEach(c => { c.style.opacity = '1'; c.style.transform = 'translateY(0)'; }); const countUpEl = this.elements.totalBalanceValue; if(countUpEl) { countUpEl.classList.add('animate-count-up'); countUpEl.style.opacity = '1'; } }
  }
}

// INITIALIZE THE PAGE
document.addEventListener('DOMContentLoaded', () => {
  if (window.Utils) {
    window.Utils.accentColor.initialize();
    window.Utils.darkMode.initialize();
  }
  window.dashboardPage = new DashboardPage();
});
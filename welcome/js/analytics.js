


class AnalyticsPage {
  constructor() {
    // Check for dependencies
    if (!window.Utils || !window.Chart) {
      console.error('Error: Utils.js or Chart.js is not loaded!');
      alert('A critical error occurred. Please refresh the page.');
      return;
    }
    
    
    this.authData = this.checkAuth(); 
    if (!this.authData || !this.authData.user || !this.authData.token) {
      window.location.href = 'login.html';
      return;
    }
    this.user = this.authData.user; 

    this.charts = {}; 
    this.analyticsData = null; 
    this.init();
  }

  //INITIALIZATION
  init() {
    console.log('Analytics Page Initializing...');
    
    // Cache DOM elements 
    this.elements = {
      // User elements
      userName: document.getElementById('userName'),
      userEmail: document.getElementById('userEmail'),
      userAvatar: document.getElementById('userAvatar'),
      
      // Shared elements
      mainHeader: document.getElementById('mainHeader'),
      mainFooter: document.getElementById('mainFooter'), 
      darkModeToggle: document.getElementById('darkModeToggle'),
      logoutButton: document.getElementById('logoutButton'),
      downloadReportBtn: document.getElementById('downloadReportBtn'),
      
      // Modal elements
      modal: document.getElementById('transactionModal'),
      modalForm: document.getElementById('transactionForm'),
      cancelModalBtn: document.getElementById('cancelModalBtn'),
      transactionTypeSelect: document.getElementById('transactionType'),
      transactionCategorySelect: document.getElementById('transactionCategory'),
      transactionDateInput: document.getElementById('transactionDate'),
      
      // Page-specific elements
      // Stats
      statTotalIncome: document.getElementById('statTotalIncome'),
      statTotalSpent: document.getElementById('statTotalSpent'),
      statNetSavings: document.getElementById('statNetSavings'),
      statAvgDaily: document.getElementById('statAvgDaily'),

      // Main Chart
      mainChartCard: document.getElementById('mainChartCard'), 
      mainChartSkeleton: document.getElementById('mainChartSkeleton'),
      mainChartLoader: document.getElementById('mainChartLoader'),
      mainLineChart: document.getElementById('mainLineChart'),
      timeToggle: document.getElementById('timeToggle'),
      
      // Small Charts Grid & Targets for scroll animation
      analyticsGrid: document.getElementById('analyticsGrid'),
      scrollAnimateTargets: document.querySelectorAll('.scroll-animate'),
      
      // Chart Canvases
      categoryDonutChart: document.getElementById('categoryDonutChart'),
      dailyBarChart: document.getElementById('dailyBarChart'),
      budgetRadarChart: document.getElementById('budgetRadarChart'),
      incomePieChart: document.getElementById('incomePieChart'), 
      
      // Donut text
      donutCenterText: document.getElementById('donutCenterText'),
    };

    // Verify critical elements exist
    if (!this.elements.mainLineChart || !this.elements.categoryDonutChart || 
        !this.elements.dailyBarChart || !this.elements.budgetRadarChart || 
        !this.elements.incomePieChart) {
      console.error("One or more chart canvas elements not found!");
      return;
    }

    this.setupEventListeners();
    this.loadUserData();
    this.setupScrollAnimations();
    this.setupParallaxEffect(); 
    this.loadPageContent(); 
  }

  //SECURITY & USER DATA 
  checkAuth() {
    const authDataString = localStorage.getItem('fintrack_auth');
    if (!authDataString) {
      console.log('No auth data found. Redirecting to login.');
      return null;
    }
    try {
      
      const parsedData = JSON.parse(authDataString);
      if (parsedData && parsedData.user && parsedData.token) {
        return parsedData;
      } else {
        console.warn('Auth data incomplete. Clearing.');
        localStorage.removeItem('fintrack_auth');
        return null;
      }
    } catch (e) {
      console.error('Error parsing auth data:', e);
      localStorage.removeItem('fintrack_auth');
      return null;
    }
  }

  loadUserData() {
    if (!this.user) return;
    const { name, email, avatar } = this.user;
    if(this.elements.userName) this.elements.userName.textContent = name;
    if(this.elements.userEmail) this.elements.userEmail.textContent = email;
    
    
    
    if(this.elements.userAvatar) {
        this.elements.userAvatar.textContent = name ? name.substring(0, 2).toUpperCase() : '?';
    }
    
  }

  // EVENT LISTENERS
  setupEventListeners() {
    // Shared Listeners
    this.elements.darkModeToggle?.addEventListener('click', () => Utils.darkMode.toggle());
    this.elements.logoutButton?.addEventListener('click', () => this.handleLogout());
   this.elements.downloadReportBtn?.addEventListener('click', () => this.handleDownloadReport());

    
    // this.elements.modalForm?.addEventListener('submit', (e) => { e.preventDefault(); this.handleTransactionSubmit(); });
    // this.elements.cancelModalBtn?.addEventListener('click', () => this.hideModal());
    // this.elements.modal?.addEventListener('click', (e) => { if (e.target === this.elements.modal) this.hideModal(); });
    // this.elements.transactionTypeSelect?.addEventListener('change', (e) => this.updateCategoryOptions(e.target.value));
    
    // Chart Toggles
    this.elements.timeToggle?.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (!button || button.classList.contains('active')) return;
      if(this.elements.timeToggle) { // Check if timeToggle exists
          this.elements.timeToggle.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
      }
      button.classList.add('active');
      this.updateMainChart(button.dataset.time); 
    });
  }

  //MODAL & FORM HANDLING 
  showModal() { /* ... keep if needed ... */ }
  hideModal() { /* ... keep if needed ... */ }
  updateCategoryOptions(type) { /* ... keep if needed ... */ }
  async handleTransactionSubmit() { 
      // If you add transactions here, you'll need to re-fetch analytics data
      // this.hideModal(); 
      Utils.toast.show('Transaction saved! Refreshing analytics...', 'success');
      // await this.loadPageContent(); // Re-fetch all data
  }

  // DATA LOADING & RENDERING

  // UPDATED loadPageContent to fetch from API
  async loadPageContent() {

    //  TEMPORARY SEEDER CODE
        // We will run this one time and then delete it.
        try {
            console.log("--- RUNNING DATA SEEDER ---");
            const seedResponse = await fetch('http://127.0.0.1:5000/api/debug/seed-data', {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${this.authData.token}` // This adds the security token!
                }
            });
            const seedResult = await seedResponse.json();
            console.log("SEEDER RESULT:", seedResult.msg);
            Utils.toast.show(seedResult.msg, 'success');
        } catch (err) {
            console.error("SEEDER FAILED:", err);
            Utils.toast.show('Seeder failed to run.', 'error');
        }
        // TEMPORARY SEEDER CODE
    // Animate header and footer

    this.elements.mainHeader?.classList.add('animate-fade-in');
    this.elements.mainFooter?.classList.add('animate-fade-in'); 
    
    // Show skeletons immediately 
    console.log("Fetching analytics data...");

    if (!this.authData || !this.authData.token) {
        console.error("Authentication token missing.");
        Utils.toast.show('Authentication error. Please log in again.', 'error');
        // Redirect or handle appropriately
        return;
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/api/analytics', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authData.token}`
        }
      });

      if (response.status === 401) {
         localStorage.removeItem('fintrack_auth');
         window.location.href = 'login.html';
         return;
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.analyticsData = await response.json(); 
      console.log("Analytics data received:", this.analyticsData);

      // Render content using the fetched data
      
      // 1. Render Stats
      this.renderStats(); 

      // 2. Render Main Chart
      if (this.elements.mainChartSkeleton) this.elements.mainChartSkeleton.style.display = 'none';
      if (this.elements.mainLineChart) this.elements.mainLineChart.style.display = 'block';
      this.renderMainChart('monthly'); 
      
      
      

    } catch (error) {
      console.error("Error fetching analytics data:", error);
      Utils.toast.show('Could not load analytics data.', 'error');
      // Maybe show error messages in the cards instead of skeletons
      if(this.elements.statTotalIncome) this.elements.statTotalIncome.textContent = 'Error'; 
      if(this.elements.statTotalSpent) this.elements.statTotalSpent.textContent = 'Error';
      if(this.elements.statNetSavings) this.elements.statNetSavings.textContent = 'Error';
      if(this.elements.statAvgDaily) this.elements.statAvgDaily.textContent = 'Error';
    }
  }


  async fetchForecastData() {
    if (!this.authData || !this.authData.token) {
        console.error("Authentication token missing, cannot fetch forecast.");
        return null;
    }

    try {
        console.log("--- Fetching forecast data... ---");
        const response = await fetch('http://127.0.0.1:5000/api/forecast/balance', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.authData.token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const forecast = await response.json();
        
        if (forecast.status === 'ok') {
            console.log("--- Forecast data received ---", forecast.data);
            return forecast.data; // Return the list of {date, balance}
        } else {
            console.warn("Forecast API returned status:", forecast.status);
            if (forecast.status === 'insufficient_data') {
                Utils.toast.show('Add more transactions to build your forecast.', 'info');
            }
            return null;
        }

    } catch (error) {
        console.error("Error fetching forecast data:", error);
        Utils.toast.show('Could not load balance forecast.', 'error');
        return null;
    }
  }
  //  Intersection Observer and Parallax
  setupScrollAnimations() { 
       
      const options = { root: null, threshold: 0.2, rootMargin: '0px 0px -50px 0px' };
      const observer = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
              if (entry.isIntersecting) {
                  const target = entry.target;
                  target.classList.add('is-visible'); 
                  const chartId = target.dataset.chartId; 
                  // Check if renderSmallChart exists before calling
                  if(typeof this.renderSmallChart === 'function') {
                      setTimeout(() => { this.renderSmallChart(chartId); }, 200); 
                  }
                  observer.unobserve(target); 
              }
          });
      }, options);
      if(this.elements.scrollAnimateTargets) { // Add check
          this.elements.scrollAnimateTargets.forEach(target => { observer.observe(target); });
      }
  }
  setupParallaxEffect() { 
      
      const parallaxTargets = this.elements.scrollAnimateTargets;
      if (!parallaxTargets) return; // Add check
      const parallaxFactor = 0.2; 
      window.addEventListener('scroll', () => {
         const scrollY = window.scrollY;
         parallaxTargets.forEach(target => {
             if (target) { // Check if target is not null
                 const rect = target.getBoundingClientRect();
                 if (rect.top < window.innerHeight && rect.bottom > 0) {
                     const elementTop = target.offsetTop || 0; // Fallback for offsetTop
                     const offset = (scrollY - elementTop) * parallaxFactor;
                     target.style.transform = `translateY(${offset}px)`;
                 }
             }
         });
      }, { passive: true });
  }

  //Render Small Charts 
  renderSmallChart(chartId) {
    if (!this.analyticsData) { // Don't try to render if data hasn't loaded
        console.warn(`Analytics data not ready, skipping render for ${chartId}`);
        return; 
    }
      
    let skeleton, canvas;
    const card = document.querySelector(`.scroll-animate[data-chart-id="${chartId}"]`);
    if (!card) return;
    skeleton = card.querySelector('.skeleton');
    canvas = card.querySelector('canvas'); 

    if (!canvas) { console.error(`Canvas ${chartId} not found!`); return; }
    
    console.log(`Rendering small chart: ${chartId}`);

    // Render the correct chart
    switch (chartId) {
      case 'categoryDonutChart':
        this.renderCategoryDonut(); // Uses this.analyticsData.charts.categoryDonut
        if (this.elements.donutCenterText) { // Check if element exists
            this.elements.donutCenterText.style.display = 'flex'; 
            setTimeout(() => {
                if (this.elements.donutCenterText) this.elements.donutCenterText.classList.add('is-visible');
            }, 100);
        }
        break;
      case 'dailyBarChart':
        this.renderDailyBar(); // Uses this.analyticsData.charts.dailyBar
        break;
      case 'budgetRadarChart':
        this.renderRadarChart(); // Uses this.analyticsData.charts.budgetRadar
        break;
      case 'incomePieChart':
        this.renderIncomePie(); // Uses this.analyticsData.charts.incomePie
        break;
      default:
        console.warn(`Unknown chart ID for rendering: ${chartId}`);
        return; 
    }
    
    // Hide skeleton, show canvas
    if (skeleton) skeleton.style.display = 'none';
    canvas.style.display = 'block';
  }

  // CHART RENDERING FUNCTIONS
  
  //  1. Stats Bar
  renderStats() {
    if (!this.analyticsData || !this.analyticsData.stats) {
        console.warn("Stats data missing, skipping render.");
        return;
    }
    const stats = this.analyticsData.stats;
    
    // Use data from API
    this.animateCountUp(this.elements.statTotalIncome, stats.totalIncome, false, 'KSh ');
    this.animateCountUp(this.elements.statTotalSpent, stats.totalSpent, false, 'KSh ');
    this.animateCountUp(this.elements.statNetSavings, stats.netSavings, stats.netSavings < 0, 'KSh ');
    this.animateCountUp(this.elements.statAvgDaily, stats.avgDaily, false, 'KSh ');
  }

  //  2. Main Line Chart
  async renderMainChart(timescale = 'monthly') {
      if (!this.analyticsData || !this.analyticsData.charts || !this.analyticsData.charts.mainLine) {
          console.warn("Main chart data not available.");
          return;
      }
      
      const chartData = this.analyticsData.charts.mainLine[timescale]; 
      
      if (!this.elements.mainLineChart) {
           console.error("Main line chart canvas element missing.");
           return;
      }
      const ctx = this.elements.mainLineChart.getContext('2d');
      if (!ctx) {
           console.error("Failed to get 2D context for main line chart.");
           return;
      }

      if (this.charts.mainLine) { this.charts.mainLine.destroy(); } // Clear old chart

      if (!chartData || !chartData.labels || chartData.labels.length === 0) {
          console.warn(`No data for timescale: ${timescale}`);
          ctx.clearRect(0, 0, this.elements.mainLineChart.width, this.elements.mainLineChart.height);
          ctx.textAlign = 'center';
          ctx.fillStyle = 'var(--text-secondary, #64748b)';
          ctx.font = "16px 'Inter', sans-serif";
          ctx.fillText(`No ${timescale} data yet`, this.elements.mainLineChart.width / 2, this.elements.mainLineChart.height / 2);
          return; 
      }
      
      // New Dual-Axis & Forecast Logic
      
      // 1. Create the base datasets for Income and Expense
      let datasets = [ 
          { 
              label: 'Income', 
              data: chartData.income, 
              borderColor: '#22c55e', 
              backgroundColor: 'rgba(34, 197, 94, 0.1)', 
              fill: true, tension: 0.4, 
              pointBackgroundColor: '#22c55e',
              yAxisID: 'y_flow' //  Assign to the LEFT axis
          }, 
          { 
              label: 'Expense', 
              data: chartData.expense, 
              borderColor: '#ef4444', 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              fill: true, tension: 0.4, 
              pointBackgroundColor: '#ef4444',
              yAxisID: 'y_flow' // Assign to the LEFT axis
          } 
      ];
      
      let allLabels = [...chartData.labels]; // Start with the existing monthly labels
      
      // 2. We only show the forecast on the "Monthly" view
      if (timescale === 'monthly') {
          const forecastData = await this.fetchForecastData();
          
          if (forecastData && forecastData.length > 0) {
              const forecastLabels = forecastData.map(d => d.date); // e.g., "2025-12"
              const forecastBalances = forecastData.map(d => d.balance);

              // Add 'null' values for the past to make the line start correctly
              const nulls = Array(allLabels.length).fill(null);
              
              datasets.push({
                  label: 'Forecasted Balance',
                  data: [...nulls, ...forecastBalances], // Combine nulls + future data
                  borderColor: '#06b6d4', // Cyan color
                  backgroundColor: 'rgba(6, 182, 212, 0.1)',
                  fill: true,
                  tension: 0.4,
                  borderDash: [5, 5], // This makes the line dotted!
                  pointRadius: 0,
                  yAxisID: 'y_balance' // Assign to the NEW RIGHT axis
              });

              // Add the new forecast labels to the chart's X-axis
              allLabels.push(...forecastLabels);
          }
      }
      
      // 3. Define the chart options with TWO Y-AXES
      const chartOptions = {
          responsive: true, maintainAspectRatio: false, 
          interaction: { intersect: false, mode: 'index' },
          plugins: { legend: { position: 'top', labels: { color: 'var(--text-primary, #0f172a)' } } },
          scales: { 
              x: { ticks: { color: 'var(--text-secondary, #64748b)' } },
              
              // LEFT Y-AXIS (for Income/Expense)
              'y_flow': { 
                  type: 'linear',
                  position: 'left',
                  beginAtZero: true, 
                  ticks: { color: 'var(--text-secondary, #64748b)' },
                  grid: { drawOnChartArea: true } // Main grid
              },
              
              // RIGHT Y-AXIS (for Balance)
              'y_balance': {
                  type: 'linear',
                  position: 'right',
                  beginAtZero: false, // Balance doesn't have to start at 0
                  ticks: { color: '#06b6d4' }, // Match forecast line color
                  grid: { drawOnChartArea: false } // No grid lines for this axis
              }
          } 
      };
      // Dual-Axis & Forecast Logic

      
      this.charts.mainLine = new Chart(ctx, {
          type: 'line', 
          data: { 
              labels: allLabels, // Use the combined labels
              datasets: datasets // Use the combined datasets
          }, 
          options: chartOptions // Use the new dual-axis options
      });
  }
  
  // updateMainChart uses stored data
  updateMainChart(timescale) {
      if (!this.analyticsData) return; // Don't redraw if no data
      
      if(this.elements.mainChartLoader) this.elements.mainChartLoader.classList.add('is-visible'); 
      if(this.elements.mainLineChart) this.elements.mainLineChart.style.opacity = '0.3'; 
      
      setTimeout(() => {
          this.renderMainChart(timescale); // Re-render using stored data
          if(this.elements.mainChartLoader) this.elements.mainChartLoader.classList.remove('is-visible'); 
          if(this.elements.mainLineChart) this.elements.mainLineChart.style.opacity = '1'; 
      }, 500); // Shorter delay
  }

  //  3. Category Donut Chart 
  renderCategoryDonut() {
      if (!this.analyticsData || !this.analyticsData.charts || !this.analyticsData.charts.categoryDonut) return;
      if (!this.elements.categoryDonutChart) { console.error("Donut chart canvas missing."); return; }

      const chartInfo = this.analyticsData.charts.categoryDonut;
      const data = { labels: chartInfo.labels, values: chartInfo.values };
      const total = data.values.reduce((a, b) => a + b, 0);

      const centerLabel = this.elements.donutCenterText?.querySelector('.label');
      const centerValue = this.elements.donutCenterText?.querySelector('.value');

      if (centerValue) centerValue.textContent = `KSh ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (centerLabel) centerLabel.textContent = 'Total Spent'; 

      const backgroundColors = ['#6366f1', '#06b6d4', '#ec4899', '#f59e0b', '#64748b', '#22c55e', '#8b5cf6'];
      
      if (this.charts.categoryDonut) { this.charts.categoryDonut.destroy(); }
      
      const ctx = this.elements.categoryDonutChart.getContext('2d');
      if (!ctx) { console.error("Failed to get 2D context for donut chart."); return; }

      // Handle no data case for donut
      if (data.values.length === 0) {
          ctx.clearRect(0, 0, this.elements.categoryDonutChart.width, this.elements.categoryDonutChart.height);
          ctx.textAlign = 'center';
          ctx.fillStyle = 'var(--text-secondary, #64748b)';
          ctx.font = "16px 'Inter', sans-serif";
          ctx.fillText("No spending data yet", this.elements.categoryDonutChart.width / 2, this.elements.categoryDonutChart.height / 2);
          if (centerLabel) centerLabel.textContent = 'Total Spent';
          if (centerValue) centerValue.textContent = 'KSh 0.00';
          return;
      }
      
      this.charts.categoryDonut = new Chart(ctx, { // Pass context
          type: 'doughnut', 
          data: { 
              labels: data.labels, 
              datasets: [{ 
                  data: data.values, 
                  backgroundColor: data.labels.map((_, i) => backgroundColors[i % backgroundColors.length]), 
                  borderWidth: 0, 
                  hoverOffset: 8 
              }] 
          }, 
          options: { 
              responsive: true, maintainAspectRatio: false, cutout: '80%', 
              plugins: { 
                  legend: { display: false }, 
                  tooltip: { 
                      enabled: false, 
                      external: (context) => { 
                           if (!centerLabel || !centerValue) return; 
                           const tooltip = context.tooltip; 
                           if (tooltip.opacity === 0) { 
                               centerLabel.textContent = 'Total Spent'; 
                               centerValue.textContent = `KSh ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; 
                               return; 
                           } 
                           const index = tooltip.dataPoints[0].dataIndex; 
                           if(data.labels[index]) centerLabel.textContent = data.labels[index]; 
                           centerValue.textContent = `KSh ${(data.values[index] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; 
                      } 
                  } 
              } 
          }
      });
  }
  
  //  4. Daily Bar Chart 
  renderDailyBar() {
      if (!this.analyticsData || !this.analyticsData.charts || !this.analyticsData.charts.dailyBar) return;
      if (!this.elements.dailyBarChart) { console.error("Daily bar chart canvas missing."); return; }

      const chartInfo = this.analyticsData.charts.dailyBar;
      
      if (this.charts.dailyBar) { this.charts.dailyBar.destroy(); }
      
      const ctx = this.elements.dailyBarChart.getContext('2d');
      if (!ctx) { console.error("Failed to get 2D context for daily bar chart."); return; }

      this.charts.dailyBar = new Chart(ctx, { // Pass context
          type: 'bar', 
          data: { 
              labels: chartInfo.labels, 
              datasets: [{ 
                  label: 'Spending', 
                  data: chartInfo.values, 
                  backgroundColor: 'rgba(var(--primary-rgb), 0.7)', // Use CSS var
                  borderRadius: 4, 
                  hoverBackgroundColor: 'rgba(var(--primary-rgb), 1)', // Use CSS var
              }] 
          }, 
          options: { 
              responsive: true, maintainAspectRatio: false, 
              plugins: { legend: { display: false } }, 
              scales: { y: { beginAtZero: true, ticks: { color: 'var(--text-secondary, #64748b)' } }, x: { ticks: { color: 'var(--text-secondary, #64748b)' } } } 
          }
      });
  }
  
  // 5. Budget Radar Chart 
  renderRadarChart() {
      if (!this.analyticsData || !this.analyticsData.charts || !this.analyticsData.charts.budgetRadar) return;
      if (!this.elements.budgetRadarChart) { console.error("Budget radar chart canvas missing."); return; }

      const chartInfo = this.analyticsData.charts.budgetRadar;

      if (this.charts.budgetRadar) { this.charts.budgetRadar.destroy(); }
      
      const ctx = this.elements.budgetRadarChart.getContext('2d');
      if (!ctx) { console.error("Failed to get 2D context for budget radar chart."); return; }


      // Handle no data case for radar
      if (!chartInfo.labels || chartInfo.labels.length === 0) {
          ctx.clearRect(0, 0, this.elements.budgetRadarChart.width, this.elements.budgetRadarChart.height);
          ctx.textAlign = 'center';
          ctx.fillStyle = 'var(--text-secondary, #64748b)';
          ctx.font = "16px 'Inter', sans-serif";
          ctx.fillText("No budgets created yet", this.elements.budgetRadarChart.width / 2, this.elements.budgetRadarChart.height / 2);
          return;
      }
      
      this.charts.budgetRadar = new Chart(ctx, { // Pass context
          type: 'radar', 
          data: { 
              labels: chartInfo.labels, 
              datasets: [ 
                  { 
                      label: 'Budgeted', 
                      data: chartInfo.budgeted, 
                      backgroundColor: 'rgba(6, 182, 212, 0.2)', 
                      borderColor: '#06b6d4', 
                      pointBackgroundColor: '#06b6d4', 
                  }, 
                  { 
                      label: 'Spent', 
                      data: chartInfo.spent, 
                      backgroundColor: 'rgba(236, 72, 153, 0.2)', 
                      borderColor: '#ec4899', 
                      pointBackgroundColor: '#ec4899', 
                  } 
              ] 
          }, 
          options: { 
              responsive: true, maintainAspectRatio: false, 
              plugins: { legend: { position: 'bottom', labels: { color: 'var(--text-primary, #0f172a)' } } }, 
              scales: { 
                  r: { 
                      angleLines: { color: 'rgba(var(--text-primary-rgb, 15, 23, 42), 0.1)' }, 
                      grid: { color: 'rgba(var(--text-primary-rgb, 15, 23, 42), 0.1)' }, 
                      pointLabels: { font: { size: 12, family: "'Inter', sans-serif" }, color: 'rgba(var(--text-primary-rgb, 15, 23, 42), 0.7)' }, 
                      ticks: { display: false,backdropColor: 'rgba(var(--bg-primary-rgb, 255, 255, 255), 1)', color: 'rgba(var(--text-primary-rgb, 15, 23, 42), 0.5)' } 
                  } 
              } 
          }
      });
  }

  //  6. Income Pie Chart
  renderIncomePie() {
      if (!this.analyticsData || !this.analyticsData.charts || !this.analyticsData.charts.incomePie) return;
      if (!this.elements.incomePieChart) { console.error("Income pie chart canvas missing."); return; }

      const chartInfo = this.analyticsData.charts.incomePie;
      
      const backgroundColors = ['#22c55e', '#10b981', '#14b8a6', '#f59e0b', '#64748b'];

      if (this.charts.incomePie) { this.charts.incomePie.destroy(); }
      
      const ctx = this.elements.incomePieChart.getContext('2d');
      if (!ctx) { console.error("Failed to get 2D context for income pie chart."); return; }


      // Handle no data case for pie
      if (!chartInfo.values || chartInfo.values.length === 0) {
          ctx.clearRect(0, 0, this.elements.incomePieChart.width, this.elements.incomePieChart.height);
          ctx.textAlign = 'center';
          ctx.fillStyle = 'var(--text-secondary, #64748b)';
          ctx.font = "16px 'Inter', sans-serif";
          ctx.fillText("No income data yet", this.elements.incomePieChart.width / 2, this.elements.incomePieChart.height / 2);
          return;
      }
      
      this.charts.incomePie = new Chart(ctx, { // Pass context
          type: 'pie',
          data: {
              labels: chartInfo.labels,
              datasets: [{
                  data: chartInfo.values,
                  backgroundColor: chartInfo.labels.map((_, i) => backgroundColors[i % backgroundColors.length]),
                  hoverOffset: 8,
                  borderWidth: 0,
              }]
          },
          options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'right', labels: { color: 'var(--text-primary, #0f172a)' } } }
          }
      });
  }


  // ANIMATION HELPER 
  animateCountUp(el, target, isNegative = false, prefix = '') {
      if (!el) return; // Guard clause
      const skeleton = el.querySelector('.skeleton');
      if (skeleton) skeleton.style.display = 'none'; // Hide skeleton if exists
      el.classList.add('show-value'); // Trigger potential CSS animation
      
      let current = 0;
      // Use requestAnimationFrame for smoother animation
      const duration = 1200; // ms
      let startTimestamp = null;

      // Clear previous animation frame request
      if (el.countUpInterval) {
          cancelAnimationFrame(el.countUpInterval);
      }
      
      const step = (timestamp) => {
          if (!startTimestamp) startTimestamp = timestamp;
          const progress = Math.min((timestamp - startTimestamp) / duration, 1);
          current = progress * target; // Linear interpolation

          // Format with 2 decimal places for currency
          el.textContent = `${prefix}${isNegative ? '-' : ''}${Math.abs(current).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

          if (progress < 1) {
              el.countUpInterval = requestAnimationFrame(step);
          } else {
              // Ensure final value is exact and formatted
              el.textContent = `${prefix}${isNegative ? '-' : ''}${Math.abs(target).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              el.countUpInterval = null; // Clear reference
          }
      };
      
      el.countUpInterval = requestAnimationFrame(step); // Start the animation
  }
  async handleDownloadReport() {
      if (!this.authData || !this.authData.token) {
          window.Utils.toast.show('Please log in to download reports.', 'error');
          return;
      }

      window.Utils.toast.show('Generating report...', 'info');

      try {
          const response = await fetch('http://127.0.0.1:5000/api/export/csv', {
              method: 'GET',
              headers: { 
                  'Authorization': `Bearer ${this.authData.token}` 
              }
          });
          
          if (!response.ok) throw new Error('Export failed');
          
          // Convert response to blob and trigger download
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = 'fintrack_report.csv'; // The filename
          document.body.appendChild(a);
          a.click();
          
          // Cleanup
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          window.Utils.toast.show('Report downloaded successfully!', 'success');
      } catch (e) {
          console.error("Download error:", e);
          window.Utils.toast.show('Failed to download report.', 'error');
      }
  }


  // LOGOUT
  handleLogout() {
    localStorage.removeItem('fintrack_auth');
    sessionStorage.clear();
    Utils.toast.show('You have been logged out.', 'info');
    setTimeout(() => { window.location.href = 'login.html'; }, 1000);
  }
}

//INITIALIZE THE PAGE
document.addEventListener('DOMContentLoaded', () => {
  if (window.Utils) { 
    window.Utils.accentColor.initialize(); 
    window.Utils.darkMode.initialize(); 
  } else {
      console.error("Utils not loaded, cannot initialize page.");
      // Don't initialize the page if Utils is missing
      return; 
  }
  window.analyticsPage = new AnalyticsPage();
});


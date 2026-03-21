window.Layout = {
  renderMain(content) {
    return `
      <div class="pos-container">
        ${this.renderSidebar()}
        <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;transition:margin 0.3s;min-width:0;height:100%;${window.sidebarCollapsed ? 'margin-left:70px' : 'margin-left:256px'}">
          ${this.renderHeader()}
          <main style="flex:1;overflow-y:auto;overflow-x:hidden;padding:24px;">
            <div style="max-width:1280px;margin:0 auto;min-width:0;width:100%;">
              ${content}
            </div>
          </main>
        </div>
      </div>
    `;
  },
  renderSidebar() {
    const lowStockCount = window.state.rawMaterials?.filter(m => m.stock <= (m.minStock || 5)).length || 0;
    return `
      <aside class="sidebar fixed left-0 top-0 h-full transition-all duration-300 z-30 ${window.sidebarCollapsed ? 'w-[70px]' : 'w-64'}">
        <div class="sidebar-header">
          <div class="flex items-center justify-between w-full">
            <span class="brand whitespace-nowrap overflow-hidden transition-all duration-300 ${window.sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}">
              GARIS WAKTU
            </span>
            <button onclick="window.toggleSidebar()" class="toggle-sidebar">
              <i class="fas fa-${window.sidebarCollapsed ? 'chevron-right' : 'chevron-left'} nav-icon"></i>
            </button>
          </div>
        </div>
        <nav class="p-3">
          ${this.navItem('Kasir', 'cash-register', 'kasir', window.state.currentSession ? '<span class="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-auto"></span>' : '')}
          ${this.navItem('Riwayat', 'history', 'history', `<span class="nav-badge">${window.state.transactions.length}</span>`)}

          <button onclick="window.bukaModalPengeluaran()" class="w-full flex items-center gap-3 p-3 rounded-lg transition-all nav-item" title="${window.sidebarCollapsed ? 'Pengeluaran' : ''}">
            <i class="fas fa-money-bill-wave w-5" style="color:var(--danger)"></i>
            <span class="text-sm font-medium whitespace-nowrap ${window.sidebarCollapsed ? 'hidden' : ''}">Pengeluaran</span>
            ${(window.state.pengeluaran?.filter(p => p.sessionId === window.state.currentSession?.id).length || 0) > 0 ? '<span class="nav-badge" id="badge-pengeluaran">' + window.state.pengeluaran.filter(p => p.sessionId === window.state.currentSession?.id).length + '</span>' : '<span class="nav-badge" id="badge-pengeluaran" style="display:none">0</span>'}
          </button>
          ${this.navItem('Bahan', 'boxes', 'bahanManager', lowStockCount > 0 ? `<span class="nav-badge warning">${lowStockCount}</span>` : '')}
          ${this.navItem('Menu', 'utensils', 'menuManager')}
          ${this.navItem('Pengaturan', 'cog', 'settings')}
        </nav>
        <div class="sidebar-footer absolute bottom-0 left-0 right-0">
          <button onclick="window.toggleDarkMode()" class="nav-item ${window.sidebarCollapsed ? 'justify-center' : ''}">
            <i class="fas fa-${document.documentElement.classList.contains('dark') ? 'sun' : 'moon'} nav-icon"></i>
            <span class="nav-label ${window.sidebarCollapsed ? 'hidden' : ''}">${document.documentElement.classList.contains('dark') ? 'Mode Terang' : 'Mode Gelap'}</span>
          </button>
          <button onclick="window.connectPrinter()" class="nav-item ${window.sidebarCollapsed ? 'justify-center' : ''}" id="printer-nav-btn">
            <div style="position:relative;display:inline-flex;">
              <i class="fas fa-print nav-icon"></i>
              <span id="printer-status-dot" style="position:absolute;top:-3px;right:-4px;width:8px;height:8px;border-radius:50%;background:${window.printerConnected ? '#22c55e' : '#ef4444'};border:1.5px solid var(--neu-bg);flex-shrink:0;"></span>
            </div>
            <span class="nav-label ${window.sidebarCollapsed ? 'hidden' : ''}">${window.printerConnected ? 'Printer (On)' : 'Printer'}</span>
          </button>
          <button onclick="window.logout()" class="nav-item logout mt-1 ${window.sidebarCollapsed ? 'justify-center' : ''}">
            <i class="fas fa-sign-out-alt nav-icon text-danger"></i>
            <span class="nav-label text-danger ${window.sidebarCollapsed ? 'hidden' : ''}">Logout</span>
          </button>
        </div>
      </aside>
    `;
  },
  navItem(label, icon, view, badge = '') {
    const isActive = window.state.currentView ===
      (view === 'Kasir' ? 'kasir' :
        view === 'History' ? 'history' :
          view === 'BahanManager' ? 'bahanManager' :
            view === 'MenuManager' ? 'menuManager' :
              view === 'Settings' ? 'settings' : view);

    let functionName;
    if (label === 'Kasir') functionName = 'renderKasir';
    else if (label === 'Riwayat') functionName = 'renderHistory';
    else if (label === 'Bahan') functionName = 'renderBahanManager';
    else if (label === 'Menu') functionName = 'renderMenuManager';
    else if (label === 'Pengaturan') functionName = 'renderSettings';
    else functionName = `render${label}`;

    return `
      <button onclick="window.${functionName}()" class="w-full flex items-center gap-3 p-3 rounded-lg transition-all ${isActive ? 'nav-item active' : ''}" title="${window.sidebarCollapsed ? label : ''}">
        <i class="fas fa-${icon} w-5"></i>
        <span class="text-sm font-medium whitespace-nowrap ${window.sidebarCollapsed ? 'hidden' : ''}">${label}</span>
        ${badge}
      </button>
    `;
  },
  renderHeader() {
    return `
      <header class="smart-header px-6 py-3 flex items-center justify-between">
        <h1 class="text-lg font-semibold">
          ${this.getPageTitle()}
        </h1>
        ${window.state.currentSession ? `
          <div class="header-session-info">
            <div class="header-shift-badge">
              <span class="header-shift-dot"></span>
              <span>Shift ${window.state.currentSession.shift}</span>
            </div>
            <span class="header-email">
              ${window.state.user?.email}
            </span>
          </div>
        ` : `
          <button onclick="const b=this;Utils.setButtonLoading(b,true);window.bukaShift().finally(()=>Utils.setButtonLoading(b,false))" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2">
            <i class="fas fa-play"></i>
            Buka Shift
          </button>
        `}
      </header>
    `;
  },
  getPageTitle() {
    const titles = {
      kasir: 'Kasir',
      history: 'Riwayat Transaksi',
      bahanManager: 'Manajemen Bahan',
      menuManager: 'Manajemen Menu',
      openCategory: 'Daftar Menu',
      settings: 'Pengaturan'
    };
    return titles[window.state.currentView] || 'GARIS WAKTU';
  }
};
window.toggleDarkMode = function() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('darkMode', isDark);
  if (typeof updateThemeColor === 'function') updateThemeColor();
  const currentView = window.state?.currentView;
  if (currentView === 'kasir') window.renderKasir?.();
  else if (currentView === 'history') window.renderHistory?.();
  else if (currentView === 'bahanManager') window.renderBahanManager?.();
  else if (currentView === 'menuManager') window.renderMenuManager?.();
  else if (currentView === 'settings') window.renderSettings?.();
};
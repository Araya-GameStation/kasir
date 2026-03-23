window.Layout = {
  renderMain(content) {
    return `
      <div class="pos-container">
        ${this.renderSidebar()}
        <div class="main-content-area ${window.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
          ${this.renderHeader()}
          <main class="main-scroll">
            <div class="main-inner">
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
      <aside class="sidebar ${window.sidebarCollapsed ? 'collapsed' : ''}">
        <div class="sidebar-header">
          <div class="sidebar-header-inner">
            <span class="brand ${window.sidebarCollapsed ? 'brand-hidden' : ''}">
              GARIS WAKTU
            </span>
            <button onclick="window.toggleSidebar()" class="toggle-sidebar">
              <i class="fas fa-${window.sidebarCollapsed ? 'chevron-right' : 'chevron-left'} nav-icon"></i>
            </button>
          </div>
        </div>
        <nav class="sidebar-nav">
          ${this.navItem('Kasir', 'cash-register', 'kasir', window.state.currentSession ? '<span class="nav-active-dot"></span>' : '')}
          ${this.navItem('Riwayat', 'history', 'history', `<span class="nav-badge">${window.state.transactions.length}</span>`)}

          <button onclick="window.bukaModalPengeluaran()" class="nav-item" title="${window.sidebarCollapsed ? 'Pengeluaran' : ''}">
            <i class="fas fa-money-bill-wave nav-icon icon-danger"></i>
            <span class="nav-label ${window.sidebarCollapsed ? 'hidden' : ''}">Pengeluaran</span>
            ${(window.state.pengeluaran?.filter(p => p.sessionId === window.state.currentSession?.id).length || 0) > 0 ? '<span class="nav-badge" id="badge-pengeluaran">' + window.state.pengeluaran.filter(p => p.sessionId === window.state.currentSession?.id).length + '</span>' : '<span class="nav-badge hidden-badge" id="badge-pengeluaran">0</span>'}
          </button>
          ${this.navItem('Bahan', 'boxes', 'bahanManager', lowStockCount > 0 ? `<span class="nav-badge warning">${lowStockCount}</span>` : '')}
          ${this.navItem('Menu', 'utensils', 'menuManager')}
          ${this.navItem('Pengaturan', 'cog', 'settings')}
        </nav>
        <div class="sidebar-footer">
          <button onclick="window.toggleDarkMode()" class="nav-item ${window.sidebarCollapsed ? 'nav-item-centered' : ''}">
            <i class="fas fa-${document.documentElement.classList.contains('dark') ? 'sun' : 'moon'} nav-icon"></i>
            <span class="nav-label ${window.sidebarCollapsed ? 'hidden' : ''}">${document.documentElement.classList.contains('dark') ? 'Mode Terang' : 'Mode Gelap'}</span>
          </button>
          <button onclick="window.connectPrinter()" class="nav-item ${window.sidebarCollapsed ? 'nav-item-centered' : ''}" id="printer-nav-btn">
            <div class="printer-dot-wrapper">
              <i class="fas fa-print nav-icon"></i>
              <span id="printer-status-dot" class="printer-status-dot ${window.printerConnected ? 'online' : ''}"></span>
            </div>
            <span class="nav-label ${window.sidebarCollapsed ? 'hidden' : ''}">${window.printerConnected ? 'Printer (On)' : 'Printer'}</span>
          </button>
          <button onclick="window.logout()" class="nav-item logout nav-item-mt ${window.sidebarCollapsed ? 'nav-item-centered' : ''}">
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

    const viewMap = {
        'Kasir': 'kasir', 'Riwayat': 'history',
        'Bahan': 'bahanManager', 'Menu': 'menuManager', 'Pengaturan': 'settings'
    };
    const targetView = viewMap[label] || label;

    return `
      <button onclick="window.navigateTo('${targetView}')" class="nav-item ${isActive ? 'active' : ''}" title="${window.sidebarCollapsed ? label : ''}">
        <i class="fas fa-${icon} nav-icon"></i>
        <span class="nav-label ${window.sidebarCollapsed ? 'hidden' : ''}">${label}</span>
        ${badge}
      </button>
    `;
  },
  renderHeader() {
    return `
      <header class="smart-header header-bar">
        <h1 class="header-title">
          ${this.getPageTitle()}
        </h1>
        ${window.state.currentSession ? `
          <div class="header-session-info">
            <div class="header-shift-badge">
              <span class="header-shift-dot"></span>
              <span>Shift ${window.state.currentSession.shift}</span>
            </div>
            <button onclick="window.tutupShift()" class="btn-tutup-shift" id="btn-tutup-shift" title="Tutup Shift">
              <i class="fas fa-power-off"></i>
              <span>Tutup Shift</span>
            </button>
            <span class="header-email">
              ${window.state.user?.email}
            </span>
          </div>
        ` : `
          <button onclick="const b=this;Utils.setButtonLoading(b,true);window.bukaShift().finally(()=>Utils.setButtonLoading(b,false))" class="btn-buka-shift">
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
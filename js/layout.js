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
    const lowStockCount = (window.state.rawMaterials || []).filter(m => m.stock <= (m.minStock || 5)).length;
    const openBillCount = (window.state.openBills || []).length;
    const pengeluaranCount = (window.state.pengeluaran || []).filter(p => p.sessionId === window.state.currentSession?.id).length;

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
          ${this.navItem('Kasir', 'cash-register', 'kasir',
            window.state.currentSession ? '<span class="nav-active-dot"></span>' : ''
          )}

          ${this.navItem('Open Bill', 'receipt', 'openBill',
            openBillCount > 0
              ? `<span class="nav-badge warning" id="open-bill-badge">${openBillCount}</span>`
              : `<span class="nav-badge hidden-badge" id="open-bill-badge"></span>`
          )}

          ${this.navItem('Riwayat', 'history', 'history',
            `<span class="nav-badge">${(window.state.transactions || []).length}</span>`
          )}

          ${this.navItem('Laporan', 'chart-bar', 'laporan')}

          <button onclick="window.bukaModalPengeluaran()" class="nav-item" title="${window.sidebarCollapsed ? 'Pengeluaran' : ''}">
            <i class="fas fa-money-bill-wave nav-icon icon-danger"></i>
            <span class="nav-label ${window.sidebarCollapsed ? 'hidden' : ''}">Pengeluaran</span>
            ${pengeluaranCount > 0
              ? `<span class="nav-badge" id="badge-pengeluaran">${pengeluaranCount}</span>`
              : `<span class="nav-badge hidden-badge" id="badge-pengeluaran">0</span>`
            }
          </button>

          ${this.navItem('Bahan', 'boxes', 'bahanManager',
            lowStockCount > 0 ? `<span class="nav-badge warning">${lowStockCount}</span>` : ''
          )}

          ${this.navItem('Menu', 'utensils', 'menuManager')}

          ${this.navItem('Modifier', 'sliders-h', 'modifierManager')}

          ${this.navItem('Pengaturan', 'cog', 'settings')}
        </nav>

        <div class="sidebar-footer">
          <button onclick="window.toggleDarkMode()" class="nav-item ${window.sidebarCollapsed ? 'nav-item-centered' : ''}">
            <i class="fas fa-${document.documentElement.classList.contains('dark') ? 'sun' : 'moon'} nav-icon"></i>
            <span class="nav-label ${window.sidebarCollapsed ? 'hidden' : ''}">
              ${document.documentElement.classList.contains('dark') ? 'Mode Terang' : 'Mode Gelap'}
            </span>
          </button>

          <button onclick="window.connectPrinter()" class="nav-item ${window.sidebarCollapsed ? 'nav-item-centered' : ''}" id="printer-nav-btn">
            <div class="printer-dot-wrapper">
              <i class="fas fa-print nav-icon"></i>
              <span id="printer-status-dot" class="printer-status-dot ${window.printerConnected ? 'online' : ''}"></span>
            </div>
            <span class="nav-label ${window.sidebarCollapsed ? 'hidden' : ''}">
              ${window.printerConnected ? 'Printer (On)' : 'Printer'}
            </span>
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
    const viewMap = {
      'Kasir': 'kasir',
      'Open Bill': 'openBill',
      'Riwayat': 'history',
      'Laporan': 'laporan',
      'Bahan': 'bahanManager',
      'Menu': 'menuManager',
      'Modifier': 'modifierManager',
      'Pengaturan': 'settings'
    };
    const targetView = viewMap[label] || view;
    const isActive = window.state.currentView === targetView;

    if (targetView === 'openBill') {
      return `
        <button onclick="window.showOpenBillList()" class="nav-item ${isActive ? 'active' : ''}" title="${window.sidebarCollapsed ? label : ''}">
          <i class="fas fa-${icon} nav-icon"></i>
          <span class="nav-label ${window.sidebarCollapsed ? 'hidden' : ''}">${label}</span>
          ${badge}
        </button>
      `;
    }

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
        <h1 class="header-title">${this.getPageTitle()}</h1>
        ${window.state.currentSession ? `
          <div class="header-session-info">
            <span class="header-email">
              <i class="fas fa-user-circle me-1"></i> ${window.state.currentSession?.kasir || window.state.user?.email}
            </span>
            <div class="header-shift-badge">
              <span class="header-shift-dot"></span>
              <span>Shift ${window.state.currentSession.shift}</span>
            </div>
            <button onclick="window.tutupShift()" class="btn-tutup-shift" id="btn-tutup-shift" title="Tutup Shift">
              <i class="fas fa-power-off"></i>
              <span>Tutup Shift</span>
            </button>
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
      openBill: 'Open Bill',
      history: 'Riwayat Transaksi',
      laporan: 'Laporan',
      bahanManager: 'Manajemen Bahan',
      menuManager: 'Manajemen Menu',
      openCategory: 'Daftar Menu',
      modifierManager: 'Modifier & Add-on',
      settings: 'Pengaturan'
    };
    return titles[window.state.currentView] || 'GARIS WAKTU';
  }
};

window.showOpenBillList = function() {
  const openBills = state.openBills || [];

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'modal-open-bill-list';

  const rows = openBills.length === 0
    ? `<div class="empty-state"><i class="fas fa-receipt"></i><p>Tidak ada open bill aktif</p></div>`
    : openBills.map(ob => {
        const waktu = ob.createdAt?.seconds
          ? new Date(ob.createdAt.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : '-';
        return `
          <div class="open-bill-list-item" onclick="window._loadOpenBillFromList('${ob.id}')">
            <div class="open-bill-list-left">
              <div class="open-bill-list-meja">
                <i class="fas fa-chair"></i> ${ob.mejaNomor} - ${ob.mejaNama}
              </div>
              <div class="open-bill-list-meta">
                ${ob.items?.length || 0} item · ${waktu}
              </div>
            </div>
            <div class="open-bill-list-right">
              <div class="open-bill-list-total">Rp ${Utils.formatRupiah(ob.total || 0)}</div>
              <div class="open-bill-list-actions">
                <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();window._goPayOpenBill('${ob.id}')">
                  <i class="fas fa-credit-card"></i> Bayar
                </button>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();window._cancelOpenBill('${ob.id}')">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

  modal.innerHTML = `
    <div class="modal modal-wide">
      <div class="modal-header">
        <h3><i class="fas fa-receipt"></i> Daftar Open Bill</h3>
        <button class="btn-icon-sm" onclick="document.getElementById('modal-open-bill-list').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body open-bill-list-body">
        ${rows}
      </div>
    </div>
  `;

  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
};

window._loadOpenBillFromList = function(obId) {
  const ob = (state.openBills || []).find(o => o.id === obId);
  if (!ob) return;
  document.getElementById('modal-open-bill-list')?.remove();
  window._loadOpenBill(ob, { id: ob.mejaId, nomor: ob.mejaNomor, nama: ob.mejaNama });
  state.currentView = 'kasir';
  window.renderKasir?.();
};

window._goPayOpenBill = function(obId) {
  const ob = (state.openBills || []).find(o => o.id === obId);
  if (!ob) return;
  document.getElementById('modal-open-bill-list')?.remove();
  window._loadOpenBill(ob, { id: ob.mejaId, nomor: ob.mejaNomor, nama: ob.mejaNama });
  state.currentView = 'kasir';
  window.renderKasir?.();
  setTimeout(() => window.showPaymentModal(), 150);
};

window._cancelOpenBill = async function(obId) {
  const result = await Swal.fire({
    title: 'Batalkan Open Bill?',
    text: 'Pesanan yang belum dibayar akan dihapus.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, batalkan',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc3545'
  });
  if (!result.isConfirmed) return;
  await dbCloud.collection('openBills').doc(obId).update({ status: 'cancelled', cancelledAt: new Date() });
  Utils.showToast('Open bill dibatalkan', 'success');
  document.getElementById('modal-open-bill-list')?.remove();
};

window.toggleDarkMode = function() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('darkMode', isDark);
  if (typeof updateThemeColor === 'function') updateThemeColor();
  const v = window.state?.currentView;
  if (v === 'kasir') window.renderKasir?.();
  else if (v === 'history') window.renderHistory?.();
  else if (v === 'laporan') window.renderLaporan?.();
  else if (v === 'bahanManager') window.renderBahanManager?.();
  else if (v === 'menuManager') window.renderMenuManager?.();
  else if (v === 'modifierManager') window.renderModifierManager?.();
  else if (v === 'settings') window.renderSettings?.();
};

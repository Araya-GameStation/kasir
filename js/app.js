function hitungStokProduk(produk) {
  if (!produk.resep || produk.resep.length === 0) {
    return produk.useStock ? produk.stock : null;
  }
  
  let maxPorsi = Infinity;
  
  for (const bahan of produk.resep) {
    const bahanData = state.rawMaterials.find(b => b.id === bahan.bahanId);
    if (!bahanData) {
      return 0;
    }
    
    const porsiDariBahan = Math.floor(bahanData.stock / bahan.qty);
    maxPorsi = Math.min(maxPorsi, porsiDariBahan);
  }
  
  return maxPorsi;
}

async function updateAllProductStocks() {
  const batch = dbCloud.batch();
  let updatedCount = 0;
  
  for (const produk of state.menus) {
    if (produk.resep && produk.resep.length > 0 && !produk.useStock) {
      const stokBaru = hitungStokProduk(produk);
      
      if (produk.stokOtomatis !== stokBaru) {
        batch.update(dbCloud.collection("menus").doc(produk.id), {
          stokOtomatis: stokBaru,
          stock: stokBaru
        });
        updatedCount++;
      }
    }
  }
  
  if (updatedCount > 0) {
    await batch.commit();
  }
}

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
  safeRender();
}

function getSidebarHTML() {
  const lowStockCount = state.rawMaterials?.filter(m => m.stock <= (m.minStock || 5)).length || 0;
  
  return `
    <aside class="sidebar ${sidebarCollapsed ? 'collapsed' : ''}">
      <div class="sidebar-header">
        <span class="brand">GARIS WAKTU</span>
        <button class="toggle-sidebar" onclick="toggleSidebar()">
          <i class="fas ${sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}"></i>
        </button>
      </div>
      
      <nav class="sidebar-nav">
        <div class="nav-item ${state.currentView === 'kasir' ? 'active' : ''}" onclick="renderKasir()">
          <i class="fas fa-cash-register nav-icon"></i>
          <span class="nav-label">Kasir</span>
          ${state.currentSession ? '<span class="indicator-glow"></span>' : ''}
        </div>
        
        <div class="nav-item ${state.currentView === 'history' ? 'active' : ''}" onclick="renderHistory()">
          <i class="fas fa-history nav-icon"></i>
          <span class="nav-label">Riwayat</span>
          ${state.currentSession ? `<span class="nav-badge">${state.transactions.length}</span>` : ''}
        </div>
        
        <div class="nav-item ${state.currentView === 'bahanManager' ? 'active' : ''}" onclick="renderBahanManager()">
          <i class="fas fa-boxes nav-icon"></i>
          <span class="nav-label">Bahan</span>
          ${lowStockCount > 0 ? `<span class="nav-badge warning">${lowStockCount}</span>` : ''}
        </div>
        
        <div class="nav-item ${state.currentView === 'menuManager' || state.currentView === 'openCategory' ? 'active' : ''}" onclick="renderMenuManager()">
          <i class="fas fa-utensils nav-icon"></i>
          <span class="nav-label">Menu</span>
        </div>
        
        <div class="nav-item ${state.currentView === 'settings' ? 'active' : ''}" onclick="renderSettings()">
          <i class="fas fa-cog nav-icon"></i>
          <span class="nav-label">Pengaturan</span>
        </div>
      </nav>
      
      <div class="sidebar-footer">
        <div class="nav-item" onclick="connectPrinter()">
          <i class="fas fa-print nav-icon"></i>
          <span class="nav-label">Printer</span>
        </div>
        <div class="nav-item" onclick="logout()">
          <i class="fas fa-sign-out-alt nav-icon"></i>
          <span class="nav-label">Logout</span>
        </div>
      </div>
    </aside>
  `;
}

function startRealtimeCategories() {
  dbCloud.collection("categories").onSnapshot(async snap => {
    state.categories = [];
    snap.forEach(doc => state.categories.push({ id: doc.id, ...doc.data() }));
    if (!state.categories.find(c => c.system)) {
      await dbCloud.collection("categories").add({ name: "LAINNYA", system: true });
    }
    safeRender();
  });
}

function startRealtimeMenus() {
  dbCloud.collection("menus").onSnapshot(snap => {
    state.menus = [];
    snap.forEach(doc => state.menus.push({ id: doc.id, ...doc.data() }));
    safeRender();
  });
}

function startRealtimeTransactions() {
  dbCloud.collection("transactions").orderBy("date", "desc").onSnapshot(snap => {
    state.allTransactions = [];
    snap.forEach(doc => state.allTransactions.push({ id: doc.id, ...doc.data() }));
    
    if (state.currentSession) {
      state.transactions = state.allTransactions.filter(t => t.sessionId === state.currentSession.id);
    } else {
      state.transactions = [];
    }
    
    if (state.currentView === "history") renderHistory();
  });
}

function startRealtimeRawMaterials() {
  dbCloud.collection("raw_materials").onSnapshot(async snap => {
    const beforeCount = state.rawMaterials.length;
    
    state.rawMaterials = [];
    snap.forEach(doc => state.rawMaterials.push({ id: doc.id, ...doc.data() }));
    
    const adaPerubahan = beforeCount !== state.rawMaterials.length || 
      snap.docChanges().some(change => 
        change.type === 'modified' && 
        change.doc.data().stock !== change.doc.data()._previousStock
      );
    
    if (adaPerubahan && typeof window.updateAllProductStocks === 'function') {
      await window.updateAllProductStocks();
    }
    
    checkLowStockAlert();
    if (state.currentView === "bahanManager") renderBahanManager();
    if (state.currentView === "kasir") renderKasir();
  });
}

function startRealtimeStockMutations() {
  dbCloud.collection("stock_mutations")
    .orderBy("createdAt", "desc")
    .limit(100)
    .onSnapshot(snap => {
      state.stockMutations = [];
      snap.forEach(doc => state.stockMutations.push({ id: doc.id, ...doc.data() }));
    });
}

function startRealtimeTables() {
  dbCloud.collection("tables").onSnapshot(snap => {
    state.tables = [];
    snap.forEach(doc => state.tables.push({ id: doc.id, ...doc.data() }));
    safeRender();
  });
}

function checkLowStockAlert() {
  const lowStock = state.rawMaterials.filter(m => m.stock <= (m.minStock || 5));
  if (lowStock.length > 0 && state.currentView !== 'bahanManager') {
    const lastAlert = localStorage.getItem('lastLowStockAlert');
    const now = Date.now();
    if (!lastAlert || (now - parseInt(lastAlert)) > 3600000) {
      showToast(`${lowStock.length} bahan menipis`, 'warning');
      localStorage.setItem('lastLowStockAlert', now.toString());
    }
  }
}

function safeRender() {
  if (state.currentView === "kasir") renderKasir();
  else if (state.currentView === "history") renderHistory();
  else if (state.currentView === "menuManager") renderMenuManager();
  else if (state.currentView === "openCategory") openCategory(state.currentCategoryId);
  else if (state.currentView === "bahanManager") renderBahanManager();
  else if (state.currentView === "settings") renderSettings();
}

window.toggleSidebar = toggleSidebar;
window.getSidebarHTML = getSidebarHTML;
window.startRealtimeCategories = startRealtimeCategories;
window.startRealtimeMenus = startRealtimeMenus;
window.startRealtimeTransactions = startRealtimeTransactions;
window.startRealtimeRawMaterials = startRealtimeRawMaterials;
window.startRealtimeStockMutations = startRealtimeStockMutations;
window.startRealtimeTables = startRealtimeTables;
window.safeRender = safeRender;
window.hitungStokProduk = hitungStokProduk;
window.updateAllProductStocks = updateAllProductStocks;
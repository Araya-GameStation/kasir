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

function renderKasir() {
  state.currentView = "kasir";
  if (!state.currentSession) {
    renderNoSession();
    return;
  }
  
  const sortedCategories = [
    ...state.categories.filter(c => !c.system).sort((a, b) => a.name.localeCompare(b.name)),
    ...state.categories.filter(c => c.system)
  ];
  const categoryNames = ["ALL", ...sortedCategories.map(c => c.name)];
  const filteredMenus = (state.selectedCategory === "ALL" ? state.menus : state.menus.filter(m => {
    const cat = state.categories.find(c => c.id === m.categoryId);
    return cat && cat.name === state.selectedCategory;
  })).sort((a, b) => a.name.localeCompare(b.name));

  app.innerHTML = `
    <div class="pos-container">
      ${getSidebarHTML()}
      
      <main class="main-content smart-layout">
        <div class="smart-header">
          <div class="session-header">
            <div>
              <span class="session-badge">
                <i class="fas fa-clock"></i> SHIFT ${state.currentSession.shift}
              </span>
              <span><i class="fas fa-user"></i> ${state.currentSession.kasir}</span>
            </div>
            <button class="btn btn-secondary" onclick="tutupShift()">
              <i class="fas fa-sign-out-alt"></i> Tutup
            </button>
          </div>
          
          <div class="category-header">
            ${categoryNames.map(c => `
              <button class="category-btn ${state.selectedCategory === c ? 'active' : ''}" 
                      onclick="selectCategory('${c}')">${c}</button>
            `).join('')}
          </div>
        </div>
        
        <div class="smart-scroll">
          <div class="menu-grid">
            ${filteredMenus.map(m => {
              const stockOk = cekKetersediaanBahan(m);
              const stokOtomatis = m.resep ? hitungStokProduk(m) : null;
              const stokTersedia = stokOtomatis !== null ? stokOtomatis : (m.useStock ? m.stock : null);
              
              return `
                <div class="card ${!stockOk.ok ? 'product-disabled' : ''}" onclick="addToCart('${m.id}')">
                  <div class="card-title">${m.name}</div>
                  <div class="card-price">Rp ${formatRupiah(m.price)}</div>
                  ${!stockOk.ok ? 
                    `<div class="card-stock text-danger">
                      <i class="fas fa-exclamation-circle"></i> 
                      ${stockOk.kurang}
                    </div>` : 
                    stokTersedia !== null ? 
                    `<div class="card-stock">
                      <i class="fas ${m.resep ? 'fa-cubes' : 'fa-box'}"></i> 
                      Stok: ${stokTersedia} ${m.resep ? 'porsi' : ''}
                    </div>` : 
                    `<div class="card-stock text-muted">
                      <i class="fas fa-infinity"></i>
                    </div>`
                  }
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </main>
      
      <aside class="checkout-panel">
        <div class="panel-header">
          <span><i class="fas fa-shopping-cart"></i> Pesanan</span>
          <span class="badge bg-primary">${state.cart.length}</span>
        </div>
        
        <div class="panel-scroll">
          ${state.cart.length === 0 ? `
            <div class="empty-state">
              <i class="fas fa-shopping-basket"></i>
              <p>Belum ada pesanan</p>
            </div>
          ` : state.cart.map(i => `
            <div class="cart-item">
              <div>
                <div class="cart-item-name">${i.name}</div>
                <div class="cart-item-price">Rp ${formatRupiah(i.price)} x ${i.qty}</div>
              </div>
              <div class="cart-item-total">Rp ${formatRupiah(i.price * i.qty)}</div>
              <div class="qty-control">
                <button class="qty-btn" onclick="changeQty('${i.id}',-1)"><i class="fas fa-minus"></i></button>
                <span>${i.qty}</span>
                <button class="qty-btn" onclick="changeQty('${i.id}',1)"><i class="fas fa-plus"></i></button>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="panel-footer">
          <div class="table-info">
            <div><i class="fas fa-chair"></i> ${state.selectedTable ? `${state.selectedTable.nomor} - ${state.selectedTable.nama}` : 'Pilih meja'}</div>
            <button class="btn btn-secondary btn-sm" onclick="pilihMeja()">Ganti</button>
          </div>

          <div class="total-row">
            <span>Total</span>
            <span class="total-amount">Rp ${formatRupiah(getTotal())}</span>
          </div>

          <div class="method-info">
            <span>Metode</span>
            <span class="method-badge">
              ${state.selectedPaymentMethod === 'tunai' ? 'CASH' : 
                state.selectedPaymentMethod === 'qris' ? 'QRIS' : 'CASH + QRIS'}
            </span>
          </div>

          <button class="btn btn-primary btn-block btn-large" 
                  onclick="showPaymentModal()" ${!state.selectedTable ? 'disabled' : ''}>
            <i class="fas fa-credit-card"></i> BAYAR (Rp ${formatRupiah(getTotal())})
          </button>
        </div>
      </aside>
    </div>
  `;
}

function renderNoSession() {
  app.innerHTML = `
    <div class="pos-container">
      ${getSidebarHTML()}
      <main class="main-content flex-center">
        <div class="empty-state large">
          <i class="fas fa-lock"></i>
          <h2>Tidak Ada Shift Aktif</h2>
          <p>Buka shift untuk memulai transaksi</p>
          <button class="btn btn-primary" onclick="bukaShift()">BUKA SHIFT</button>
        </div>
      </main>
    </div>
  `;
}

function selectCategory(c) {
  state.selectedCategory = c;
  renderKasir();
}

function cekKetersediaanBahan(menu, qty = 1) {
  if (!menu.resep || menu.resep.length === 0) return { ok: true };
  
  for (const bahan of menu.resep) {
    const bahanData = state.rawMaterials.find(b => b.id === bahan.bahanId);
    if (!bahanData) {
      return { ok: false, kurang: `Bahan ${bahan.nama} tidak ditemukan` };
    }
    
    if (bahanData.stock < (bahan.qty * qty)) {
      return { 
        ok: false, 
        kurang: `${bahan.nama} (butuh ${bahan.qty * qty} ${bahan.satuan})` 
      };
    }
  }
  return { ok: true };
}

async function addToCart(id) {
  const item = state.menus.find(m => m.id === id);
  if (!item) return;
  
  const stokOtomatis = item.resep ? hitungStokProduk(item) : null;
  const stokTersedia = stokOtomatis !== null ? stokOtomatis : (item.useStock ? item.stock : Infinity);
  
  const stockOk = cekKetersediaanBahan(item);
  if (!stockOk.ok) {
    showToast(`${stockOk.kurang} tidak cukup!`, 'error');
    return;
  }
  
  if (stokTersedia < 1) {
    showToast(`Stok ${item.name} habis!`, 'error');
    return;
  }
  
  const exist = state.cart.find(c => c.id === id);
  if (exist) {
    if (stokTersedia < (exist.qty + 1)) {
      showToast(`Stok ${item.name} tidak cukup!`, 'error');
      return;
    }
    exist.qty++;
  } else {
    state.cart.push({ ...item, qty: 1 });
  }
  renderKasir();
}

function changeQty(id, d) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;
  
  const menu = state.menus.find(m => m.id === id);
  
  const stokOtomatis = menu.resep ? hitungStokProduk(menu) : null;
  const stokTersedia = stokOtomatis !== null ? stokOtomatis : (menu.useStock ? menu.stock : Infinity);
  
  if (d > 0) {
    const stockOk = cekKetersediaanBahan(menu, item.qty + d);
    if (!stockOk.ok) {
      showToast(`${stockOk.kurang} tidak cukup!`, 'error');
      return;
    }
    
    if (stokTersedia < (item.qty + d)) {
      showToast(`Stok ${menu.name} tidak cukup!`, 'error');
      return;
    }
  }
  
  item.qty += d;
  if (item.qty <= 0) state.cart = state.cart.filter(i => i.id !== id);
  renderKasir();
}

function getTotal() {
  return state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
}

function setPaymentMethod(method) {
  state.selectedPaymentMethod = method;
  if (method === 'tunai') { state.cashAmount = 0; state.qrisAmount = 0; }
  else if (method === 'qris') { state.cashAmount = 0; state.qrisAmount = getTotal(); }
  else { state.cashAmount = 0; state.qrisAmount = 0; }
  renderKasir();
}

window.updateCashAmount = function(value) {
  const cash = parseInt(value.replace(/\./g, '')) || 0;
  const total = getTotal();
  if (state.selectedPaymentMethod === 'tunai') {
    state.cashAmount = cash;
  } else if (state.selectedPaymentMethod === 'mixed') {
    if (cash >= total) { state.cashAmount = total; state.qrisAmount = 0; }
    else { state.cashAmount = cash; state.qrisAmount = total - cash; }
  }
};

window.updateQrisAmount = function(value) {
  const qris = parseInt(value.replace(/\./g, '')) || 0;
  const total = getTotal();
  if (qris > total) { state.qrisAmount = total; state.cashAmount = 0; }
  else { state.qrisAmount = qris; state.cashAmount = total - qris; }
};

window.quickCash = function(amount) {
  if (state.selectedPaymentMethod === 'mixed') {
    const total = getTotal();
    if (amount >= total) { state.cashAmount = total; state.qrisAmount = 0; }
    else { state.cashAmount = amount; state.qrisAmount = total - amount; }
  } else {
    state.cashAmount = amount;
  }
};

window.quickQris = function(amount) {
  const total = getTotal();
  if (amount >= total) { state.qrisAmount = total; state.cashAmount = 0; }
  else if (amount < 0) { state.qrisAmount = 0; state.cashAmount = total; }
  else { state.qrisAmount = amount; state.cashAmount = total - amount; }
};

async function pilihMeja() {
  const tables = state.tables.filter(t => t.aktif !== false);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h3><i class="fas fa-chair"></i> Pilih Meja</h3>
      <div class="table-grid">
        ${tables.map(meja => `
          <button class="table-btn" data-id="${meja.id}" data-nomor="${meja.nomor}" data-nama="${meja.nama}">
            <div class="table-number">${meja.nomor}</div>
            <div class="table-name">${meja.nama}</div>
          </button>
        `).join('')}
        <button class="table-btn" data-id="takeaway" data-nomor="TA" data-nama="Take Away">
          <div class="table-number">TA</div>
          <div class="table-name">Take Away</div>
        </button>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Batal</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  modal.querySelectorAll('.table-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const nomor = btn.dataset.nomor;
      const nama = btn.dataset.nama;
      
      if (id === 'takeaway') {
        state.selectedTable = { id: 'takeaway', nomor: 'TA', nama: 'Take Away' };
      } else {
        state.selectedTable = { id, nomor, nama };
      }
      
      showToast(`Meja ${nomor} - ${nama} dipilih`, 'success');
      modal.remove();
      renderKasir();
    });
  });
}

async function bayar() {
  if (!state.currentSession) { bukaShift(); return; }
  if (!state.selectedTable) { showToast("Pilih meja!", 'warning'); return; }
  if (state.cart.length === 0) { showToast("Keranjang kosong!", 'error'); return; }
  
  const total = getTotal();
  let cashAmount = 0, qrisAmount = 0, paid = 0;
  
  if (state.selectedPaymentMethod === 'tunai') {
    cashAmount = state.cashAmount || 0;
    paid = cashAmount;
    if (cashAmount < total) { showToast("Uang cash kurang!", 'error'); return; }
  } else if (state.selectedPaymentMethod === 'qris') {
    qrisAmount = total; paid = total;
  } else {
    cashAmount = state.cashAmount || 0;
    qrisAmount = state.qrisAmount || 0;
    paid = cashAmount + qrisAmount;
    if (paid < total) { showToast("Pembayaran kurang!", 'error'); return; }
  }
  
  try {
    for (const item of state.cart) {
      const produk = state.menus.find(m => m.id === item.id);
      
      if (produk.resep) {
        for (const bahan of produk.resep) {
          const bahanData = state.rawMaterials.find(b => b.id === bahan.bahanId);
          if (!bahanData || bahanData.stock < (bahan.qty * item.qty)) {
            throw new Error(`Stok ${bahan.nama} tidak cukup`);
          }
        }
      }
      
      if (produk.useStock && produk.stock < item.qty) {
        throw new Error(`Stok ${produk.name} tidak cukup`);
      }
    }
    
    const trxData = {
      items: state.cart, total, paid, change: paid - total,
      cashAmount, qrisAmount, metodeBayar: state.selectedPaymentMethod,
      sessionId: state.currentSession.id,
      mejaId: state.selectedTable.id, mejaNama: state.selectedTable.nama, mejaNomor: state.selectedTable.nomor,
      kasir: state.user.email, date: new Date()
    };
    
    const trxRef = await dbCloud.collection("transactions").add(trxData);
    const trxId = trxRef.id;
    const batch = dbCloud.batch();
    
    for (const item of state.cart) {
      const produk = state.menus.find(m => m.id === item.id);
      
      if (produk.useStock) {
        batch.update(dbCloud.collection("menus").doc(item.id), { 
          stock: firebase.firestore.FieldValue.increment(-item.qty) 
        });
      }
      
      if (produk.resep) {
        for (const bahan of produk.resep) {
          batch.update(dbCloud.collection("raw_materials").doc(bahan.bahanId), { 
            stock: firebase.firestore.FieldValue.increment(-(bahan.qty * item.qty)) 
          });
          
          batch.set(dbCloud.collection("stock_mutations").doc(), {
            type: "out", source: "sale", bahanId: bahan.bahanId, namaBahan: bahan.nama,
            qty: bahan.qty * item.qty, satuan: bahan.satuan || 'pcs',
            produkId: item.id, namaProduk: produk.name, transactionId: trxId,
            userId: state.user.email, createdAt: new Date()
          });
        }
      }
    }
    
    await batch.commit();
    trxData.id = trxId;
    if (typeof window.printStruk === 'function') await window.printStruk(trxData);
    
    state.cart = []; 
    state.selectedTable = null; 
    state.cashAmount = 0; 
    state.qrisAmount = 0; 
    state.selectedPaymentMethod = 'tunai';
    
    showToast("Transaksi berhasil!");
    renderKasir();
  } catch (err) {
    console.error('Transaksi error:', err);
    showToast("" + err.message, 'error');
  }
}

async function showPaymentModal() {
  const total = getTotal();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'payment-modal';
  
  modal.innerHTML = `
    <div class="modal">
      <h3><i class="fas fa-credit-card"></i> Pembayaran</h3>
      
      <div class="total-display" style="font-size: 32px; font-weight: 700; color: var(--primary); text-align: center; margin-bottom: 20px;">
        Rp ${formatRupiah(total)}
      </div>
      
      <div class="payment-grid">
        <button class="payment-option ${state.selectedPaymentMethod === 'tunai' ? 'active' : ''}" 
                onclick="selectPaymentMethod('tunai')">
          <i class="fas fa-money-bill-wave"></i>
          <span>CASH</span>
        </button>
        <button class="payment-option ${state.selectedPaymentMethod === 'qris' ? 'active' : ''}" 
                onclick="selectPaymentMethod('qris')">
          <i class="fas fa-qrcode"></i>
          <span>QRIS</span>
        </button>
        <button class="payment-option ${state.selectedPaymentMethod === 'mixed' ? 'active' : ''}" 
                onclick="selectPaymentMethod('mixed')">
          <i class="fas fa-random"></i>
          <span>CAMPUR</span>
        </button>
      </div>
      
      <div id="modalPaymentContent">
        ${renderModalPaymentContent()}
      </div>
      
      <div class="modal-actions">
        <button class="btn btn-secondary" id="cancelPaymentBtn">Batal</button>
        <button class="btn btn-primary" id="processPaymentBtn">Proses</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  window.selectPaymentMethod = function(method) {
    state.selectedPaymentMethod = method;
    if (method === 'tunai') { 
      state.cashAmount = 0; 
      state.qrisAmount = 0; 
    } else if (method === 'qris') { 
      state.cashAmount = 0; 
      state.qrisAmount = total; 
    } else { 
      state.cashAmount = 0; 
      state.qrisAmount = 0; 
    }
    
    const contentDiv = document.getElementById('modalPaymentContent');
    if (contentDiv) {
      contentDiv.innerHTML = renderModalPaymentContent();
    }
    
    document.querySelectorAll('.payment-option').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelectorAll('.payment-option')[method === 'tunai' ? 0 : method === 'qris' ? 1 : 2].classList.add('active');
  };
  
  document.getElementById('cancelPaymentBtn').addEventListener('click', function() {
    document.body.removeChild(modal);
  });
  
  document.getElementById('processPaymentBtn').addEventListener('click', async function() {
    await bayar();
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
  });
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

function renderModalPaymentContent() {
  const total = getTotal();
  
  if (state.selectedPaymentMethod === 'tunai') {
    return `
      <div>
        <label class="form-label">Nominal Cash</label>
        <input type="text" class="form-input" placeholder="Masukkan nominal" 
               oninput="updateCashAmount(this.value); document.getElementById('modalPaymentContent').innerHTML = window.renderModalPaymentContent()"
               value="${state.cashAmount ? formatRupiah(state.cashAmount) : ''}">
        <div class="quick-buttons">
          <button class="btn btn-secondary" onclick="quickCash(50000); document.getElementById('modalPaymentContent').innerHTML = window.renderModalPaymentContent()">50K</button>
          <button class="btn btn-secondary" onclick="quickCash(100000); document.getElementById('modalPaymentContent').innerHTML = window.renderModalPaymentContent()">100K</button>
          <button class="btn btn-secondary" onclick="quickCash(${total}); document.getElementById('modalPaymentContent').innerHTML = window.renderModalPaymentContent()">LUNAS</button>
        </div>
        ${state.cashAmount > 0 ? `
          <div class="change-info ${state.cashAmount >= total ? 'success' : 'warning'}">
            <span>${state.cashAmount >= total ? 'Kembalian' : 'Kekurangan'}</span>
            <span>Rp ${formatRupiah(Math.abs(state.cashAmount - total))}</span>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  if (state.selectedPaymentMethod === 'qris') {
    return `
      <div class="qris-display">
        <i class="fas fa-qrcode"></i>
        <div class="qris-amount">Rp ${formatRupiah(total)}</div>
        <p>Scan QRIS</p>
      </div>
    `;
  }
  
  if (state.selectedPaymentMethod === 'mixed') {
    return `
      <div>
        <div class="form-group">
          <label class="form-label">Cash</label>
          <div style="display: flex; gap: 8px;">
            <input type="text" class="form-input" style="flex: 2;" placeholder="Nominal" 
                   oninput="updateCashAmount(this.value); document.getElementById('modalPaymentContent').innerHTML = window.renderModalPaymentContent()"
                   value="${state.cashAmount ? formatRupiah(state.cashAmount) : ''}">
            <button class="btn btn-secondary" style="flex: 1;" onclick="quickCash(50000); document.getElementById('modalPaymentContent').innerHTML = window.renderModalPaymentContent()">50K</button>
            <button class="btn btn-secondary" style="flex: 1;" onclick="quickCash(100000); document.getElementById('modalPaymentContent').innerHTML = window.renderModalPaymentContent()">100K</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">QRIS</label>
          <div style="display: flex; gap: 8px;">
            <input type="text" class="form-input" style="flex: 2;" placeholder="Nominal" 
                   oninput="updateQrisAmount(this.value); document.getElementById('modalPaymentContent').innerHTML = window.renderModalPaymentContent()"
                   value="${state.qrisAmount ? formatRupiah(state.qrisAmount) : ''}">
            <button class="btn btn-secondary" style="flex: 1;" onclick="quickQris(50000); document.getElementById('modalPaymentContent').innerHTML = window.renderModalPaymentContent()">50K</button>
            <button class="btn btn-secondary" style="flex: 1;" onclick="quickQris(100000); document.getElementById('modalPaymentContent').innerHTML = window.renderModalPaymentContent()">100K</button>
          </div>
        </div>
        <div class="payment-summary">
          <div><span>Total</span><span>Rp ${formatRupiah(total)}</span></div>
          <div><span>Cash</span><span>Rp ${formatRupiah(state.cashAmount || 0)}</span></div>
          <div><span>QRIS</span><span>Rp ${formatRupiah(state.qrisAmount || 0)}</span></div>
          <div class="total"><span>Dibayar</span><span>Rp ${formatRupiah((state.cashAmount||0)+(state.qrisAmount||0))}</span></div>
          <div class="${(state.cashAmount||0)+(state.qrisAmount||0) >= total ? 'success' : 'warning'}">
            <span>${(state.cashAmount||0)+(state.qrisAmount||0) >= total ? 'Kembalian' : 'Kekurangan'}</span>
            <span>Rp ${formatRupiah(Math.abs((state.cashAmount||0)+(state.qrisAmount||0) - total))}</span>
          </div>
        </div>
      </div>
    `;
  }
}

window.renderKasir = renderKasir;
window.selectCategory = selectCategory;
window.addToCart = addToCart;
window.changeQty = changeQty;
window.getTotal = getTotal;
window.setPaymentMethod = setPaymentMethod;
window.pilihMeja = pilihMeja;
window.bayar = bayar;
window.showPaymentModal = showPaymentModal;
window.renderModalPaymentContent = renderModalPaymentContent;
window.hitungStokProduk = hitungStokProduk;
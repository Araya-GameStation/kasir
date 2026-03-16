function renderBahanManager() {
  state.currentView = "bahanManager";
  const lowStockMaterials = state.rawMaterials.filter(b => b.stock <= (b.minStock || 5));
  
  app.innerHTML = `
    <div class="pos-container">
      ${getSidebarHTML()}
      <main class="main-content smart-layout">
        <div class="smart-header">
          <div class="header-row">
            <h2><i class="fas fa-boxes"></i> Bahan Baku</h2>
            <div class="badge-group">
              <span class="badge bg-soft">Total: ${state.rawMaterials.length}</span>
              <span class="badge bg-warning-soft">Menipis: ${lowStockMaterials.length}</span>
            </div>
          </div>
          
          ${lowStockMaterials.length > 0 ? `
            <div class="alert-warning">
              <i class="fas fa-exclamation-triangle"></i>
              Stok menipis: ${lowStockMaterials.slice(0,5).map(b => `${b.name} (${b.stock} ${b.satuan})`).join(', ')}
              ${lowStockMaterials.length > 5 ? ` +${lowStockMaterials.length-5} lainnya` : ''}
            </div>
          ` : ''}
          
          <button class="btn btn-primary" onclick="showAddBahanModal()">
            <i class="fas fa-plus"></i> Tambah Bahan
          </button>
        </div>
        
        <div class="smart-scroll">
          <div class="bahan-grid">
            ${state.rawMaterials.map(b => `
              <div class="bahan-card">
                <div class="bahan-header">
                  <div>
                    <div class="bahan-name">${b.name}</div>
                    <div class="bahan-supplier">${b.supplier || '-'}</div>
                  </div>
                  <div class="bahan-stock ${b.stock <= (b.minStock || 5) ? 'low' : ''}">
                    ${b.stock} <span class="bahan-unit">${b.satuan || 'pcs'}</span>
                  </div>
                </div>
                
                <div class="bahan-minstock">
                  <i class="fas fa-flag"></i> Min: ${b.minStock || 5} ${b.satuan || 'pcs'}
                </div>
                
                <div class="bahan-actions">
                  <button class="btn btn-secondary btn-sm" onclick="tambahStokBahan('${b.id}')">
                    <i class="fas fa-plus-circle"></i> Stok
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="kurangiStokBahanManual('${b.id}')">
                    <i class="fas fa-minus-circle"></i>
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="editBahan('${b.id}')">
                    <i class="fas fa-edit"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </main>
    </div>
  `;
}

async function showAddBahanModal() {
  const result = await showModal({
    title: '➕ Tambah Bahan Baru',
    content: `
      <div class="form-group">
        <label class="form-label">Nama Bahan <span class="text-danger">*</span></label>
        <input type="text" id="bahanName" class="form-input" placeholder="Contoh: Tepung Terigu" autofocus>
      </div>
      
      <div class="form-group">
        <label class="form-label">Satuan</label>
        <select id="bahanSatuan" class="form-select">
          <option value="kg">Kilogram (kg)</option>
          <option value="gram">Gram (g)</option>
          <option value="liter">Liter (L)</option>
          <option value="ml">Mililiter (ml)</option>
          <option value="pcs">Pcs</option>
          <option value="bungkus">Bungkus</option>
        </select>
      </div>
      
      <div class="form-group">
        <label class="form-label">Stok Awal</label>
        <input type="number" id="bahanStock" class="form-input" value="0" min="0" step="0.1">
      </div>
      
      <div class="form-group">
        <label class="form-label">Minimal Stok</label>
        <input type="number" id="bahanMinStock" class="form-input" value="5" min="1">
      </div>
      
      <div class="form-group">
        <label class="form-label">Supplier (opsional)</label>
        <input type="text" id="bahanSupplier" class="form-input" placeholder="Nama supplier">
      </div>
    `,
    buttons: [
      { 
        text: 'Batal', 
        action: 'cancel', 
        class: 'btn-secondary'
      },
      { 
        text: 'Simpan', 
        action: 'save', 
        class: 'btn-primary',
        onClick: () => {
          window._bahanName = document.getElementById('bahanName')?.value;
          window._bahanSatuan = document.getElementById('bahanSatuan')?.value;
          window._bahanStock = document.getElementById('bahanStock')?.value;
          window._bahanMinStock = document.getElementById('bahanMinStock')?.value;
          window._bahanSupplier = document.getElementById('bahanSupplier')?.value;
        }
      }
    ]
  });
  
  if (result !== 'save') return;
  
  const name = window._bahanName?.trim();
  if (!name) {
    showToast("Nama harus diisi", 'error');
    return;
  }
  
  try {
    await dbCloud.collection("raw_materials").add({
      name: name,
      satuan: window._bahanSatuan || 'kg',
      stock: parseFloat(window._bahanStock) || 0,
      minStock: parseInt(window._bahanMinStock) || 5,
      supplier: window._bahanSupplier || null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    showToast("Bahan ditambahkan");
    
    delete window._bahanName;
    delete window._bahanSatuan;
    delete window._bahanStock;
    delete window._bahanMinStock;
    delete window._bahanSupplier;
    
  } catch (error) {
    console.error('Error tambah bahan:', error);
    showToast("Gagal: " + error.message, 'error');
  }
}

async function tambahStokBahan(id) {
  const bahan = state.rawMaterials.find(b => b.id === id);
  if (!bahan) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'tambah-stok-modal';
  modal.innerHTML = `
    <div class="modal modal-sm">
      <h3><i class="fas fa-plus-circle"></i> Tambah Stok ${bahan.name}</h3>
      
      <div class="info-box" style="margin:20px 0; padding:15px; background:#f1f5f9; border-radius:8px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Stok Saat Ini:</span>
          <span style="font-weight:700; font-size:18px;">${bahan.stock} ${bahan.satuan}</span>
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">Jumlah Tambah <span class="text-danger">*</span></label>
        <input type="number" id="tambahQty" class="form-input" min="0.1" step="0.1" placeholder="0" autofocus>
      </div>
      
      <div class="form-group">
        <label class="form-label">Keterangan (opsional)</label>
        <input type="text" id="tambahNotes" class="form-input" placeholder="Contoh: Pembelian dari supplier">
      </div>
      
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeTambahStokModal()">Batal</button>
        <button class="btn btn-primary" onclick="prosesTambahStok('${id}')">
          <i class="fas fa-save"></i> Tambah
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  setTimeout(() => {
    const input = document.getElementById('tambahQty');
    if (input) input.focus();
  }, 200);
  
  window.closeTambahStokModal = function() {
    const modal = document.getElementById('tambah-stok-modal');
    if (modal) {
      modal.style.animation = 'fadeOut 0.2s ease forwards';
      setTimeout(() => {
        if (modal.parentNode) modal.remove();
      }, 200);
    }
  };
  
  window.prosesTambahStok = async function(bahanId) {
    try {
      const qtyInput = document.getElementById('tambahQty');
      const notesInput = document.getElementById('tambahNotes');
      
      if (!qtyInput) {
        showToast("Terjadi kesalahan", 'error');
        return;
      }
      
      const qty = parseFloat(qtyInput.value);
      
      if (isNaN(qty) || qty <= 0) {
        showToast("Jumlah harus diisi dengan angka positif", 'error');
        qtyInput.focus();
        return;
      }
      
      const notes = notesInput?.value?.trim() || 'Tambah manual';
      
      showToast("⏳ Menyimpan...", 'warning');
      
      const bahanRef = dbCloud.collection("raw_materials").doc(bahanId);
      await bahanRef.update({
        stock: firebase.firestore.FieldValue.increment(qty)
      });
      
      await dbCloud.collection("stock_mutations").add({
        type: "in",
        source: "manual",
        bahanId: bahanId,
        namaBahan: bahan.name,
        qty: qty,
        satuan: bahan.satuan,
        notes: notes,
        userId: state.user?.email || 'unknown',
        createdAt: new Date()
      });
      
      showToast(`Stok ${bahan.name} +${qty} ${bahan.satuan}`);
      
      if (typeof window.updateAllProductStocks === 'function') {
        await window.updateAllProductStocks();
      }
      
      closeTambahStokModal();
      renderBahanManager();
      
    } catch (error) {
      console.error('Error tambah stok:', error);
      
      if (error.code === 'permission-denied') {
        showToast("Tidak punya izin. Periksa Firestore Rules", 'error');
      } else {
        showToast("Gagal: " + error.message, 'error');
      }
    }
  };
}

async function kurangiStokBahanManual(id) {
  const bahan = state.rawMaterials.find(b => b.id === id);
  if (!bahan) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'kurang-stok-modal';
  modal.innerHTML = `
    <div class="modal modal-sm">
      <h3><i class="fas fa-minus-circle"></i> Kurangi Stok ${bahan.name}</h3>
      
      <div class="info-box" style="margin:20px 0; padding:15px; background:#f1f5f9; border-radius:8px;">
        <div style="display:flex; justify-content:space-between;">
          <span>Stok Saat Ini:</span>
          <span style="font-weight:700; font-size:18px;">${bahan.stock} ${bahan.satuan}</span>
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">Jumlah Kurang <span class="text-danger">*</span></label>
        <input type="number" id="kurangQty" class="form-input" min="0.1" step="0.1" placeholder="0" autofocus>
      </div>
      
      <div class="form-group">
        <label class="form-label">Keterangan (opsional)</label>
        <input type="text" id="kurangNotes" class="form-input" placeholder="Contoh: Rusak/Expired">
      </div>
      
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeKurangStokModal()">Batal</button>
        <button class="btn btn-primary" onclick="prosesKurangStok('${id}')">
          <i class="fas fa-check"></i> Kurangi
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  setTimeout(() => {
    const input = document.getElementById('kurangQty');
    if (input) input.focus();
  }, 200);
  
  window.closeKurangStokModal = function() {
    const modal = document.getElementById('kurang-stok-modal');
    if (modal) {
      modal.style.animation = 'fadeOut 0.2s ease forwards';
      setTimeout(() => {
        if (modal.parentNode) modal.remove();
      }, 200);
    }
  };
  
  window.prosesKurangStok = async function(bahanId) {
    try {
      const qtyInput = document.getElementById('kurangQty');
      const notesInput = document.getElementById('kurangNotes');
      
      if (!qtyInput) {
        showToast("Terjadi kesalahan", 'error');
        return;
      }
      
      const qty = parseFloat(qtyInput.value);
      if (isNaN(qty) || qty <= 0) {
        showToast("Jumlah harus diisi dengan angka positif", 'error');
        qtyInput.focus();
        return;
      }
      
      if (qty > bahan.stock) {
        showToast(`Stok tidak cukup! (tersisa ${bahan.stock} ${bahan.satuan})`, 'error');
        return;
      }
      
      const notes = notesInput?.value?.trim() || 'Pengurangan manual';
      
      showToast("⏳ Menyimpan...", 'warning');
      
      await dbCloud.collection("raw_materials").doc(bahanId).update({
        stock: firebase.firestore.FieldValue.increment(-qty)
      });
      
      await dbCloud.collection("stock_mutations").add({
        type: "out",
        source: "manual",
        bahanId: bahanId,
        namaBahan: bahan.name,
        qty: qty,
        satuan: bahan.satuan,
        notes: notes,
        userId: state.user?.email || 'unknown',
        createdAt: new Date()
      });
      
      showToast(`Stok ${bahan.name} -${qty} ${bahan.satuan}`);
      
      if (typeof window.updateAllProductStocks === 'function') {
        await window.updateAllProductStocks();
      }
      
      closeKurangStokModal();
      renderBahanManager();
      
    } catch (error) {
      console.error('Error kurangi stok:', error);
      showToast("Gagal: " + error.message, 'error');
    }
  };
}

async function editBahan(id) {
  const bahan = state.rawMaterials.find(b => b.id === id);
  if (!bahan) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'edit-bahan-modal';
  modal.innerHTML = `
    <div class="modal modal-lg">
      <h3><i class="fas fa-edit"></i> Edit ${bahan.name}</h3>
      
      <div class="form-group">
        <label class="form-label">Nama Bahan</label>
        <input type="text" id="editBahanName" class="form-input" value="${bahan.name}">
      </div>
      
      <div class="form-group">
        <label class="form-label">Satuan</label>
        <select id="editBahanSatuan" class="form-select">
          <option value="kg" ${bahan.satuan === 'kg' ? 'selected' : ''}>Kilogram (kg)</option>
          <option value="gram" ${bahan.satuan === 'gram' ? 'selected' : ''}>Gram (g)</option>
          <option value="liter" ${bahan.satuan === 'liter' ? 'selected' : ''}>Liter (L)</option>
          <option value="ml" ${bahan.satuan === 'ml' ? 'selected' : ''}>Mililiter (ml)</option>
          <option value="pcs" ${bahan.satuan === 'pcs' ? 'selected' : ''}>Pcs</option>
          <option value="bungkus" ${bahan.satuan === 'bungkus' ? 'selected' : ''}>Bungkus</option>
        </select>
      </div>
      
      <div class="form-group">
        <label class="form-label">Minimal Stok</label>
        <input type="number" id="editBahanMinStock" class="form-input" value="${bahan.minStock || 5}">
      </div>
      
      <div class="form-group">
        <label class="form-label">Supplier</label>
        <input type="text" id="editBahanSupplier" class="form-input" value="${bahan.supplier || ''}">
      </div>
      
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeEditBahanModal()">Batal</button>
        <button class="btn btn-primary" onclick="prosesEditBahan('${id}')">
          <i class="fas fa-save"></i> Simpan
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  window.closeEditBahanModal = function() {
    const modal = document.getElementById('edit-bahan-modal');
    if (modal) {
      modal.style.animation = 'fadeOut 0.2s ease forwards';
      setTimeout(() => {
        if (modal.parentNode) modal.remove();
      }, 200);
    }
  };
  
  window.prosesEditBahan = async function(bahanId) {
    try {
      const name = document.getElementById('editBahanName')?.value;
      if (!name) {
        showToast("Nama harus diisi", 'error');
        return;
      }
      
      showToast("⏳ Menyimpan...", 'warning');
      
      await dbCloud.collection("raw_materials").doc(bahanId).update({
        name: name,
        satuan: document.getElementById('editBahanSatuan').value,
        minStock: parseInt(document.getElementById('editBahanMinStock').value) || 5,
        supplier: document.getElementById('editBahanSupplier').value || null,
        updatedAt: new Date()
      });
      
      showToast("Bahan diupdate");
      
      if (typeof window.updateAllProductStocks === 'function') {
        await window.updateAllProductStocks();
      }
      
      closeEditBahanModal();
      renderBahanManager();
      
    } catch (error) {
      console.error('Error edit bahan:', error);
      showToast("Gagal: " + error.message, 'error');
    }
  };
}

async function hapusBahan(id) {
  if (!await showConfirm("Yakin hapus bahan ini?")) return;
  
  const digunakan = state.menus.some(m => m.resep?.some(r => r.bahanId === id));
  
  if (digunakan) {
    showToast("Bahan masih digunakan di resep!", 'error');
    return;
  }
  
  try {
    await dbCloud.collection("raw_materials").doc(id).delete();
    showToast("Bahan dihapus");
    
    if (typeof window.updateAllProductStocks === 'function') {
      await window.updateAllProductStocks();
    }
    
    renderBahanManager();
  } catch (error) {
    console.error('Error hapus bahan:', error);
    showToast("Gagal: " + error.message, 'error');
  }
}

window.renderBahanManager = renderBahanManager;
window.showAddBahanModal = showAddBahanModal;
window.tambahStokBahan = tambahStokBahan;
window.kurangiStokBahanManual = kurangiStokBahanManual;
window.editBahan = editBahan;
window.hapusBahan = hapusBahan;
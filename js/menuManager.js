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
    if (produk.resep && produk.resep.length > 0) {
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

function hitungTotalPorsi(resep) {
  if (!resep || resep.length === 0) return Infinity;
  
  let maxPorsi = Infinity;
  
  for (const bahan of resep) {
    const bahanData = state.rawMaterials.find(b => b.id === bahan.bahanId);
    if (bahanData) {
      const porsi = Math.floor(bahanData.stock / bahan.qty);
      maxPorsi = Math.min(maxPorsi, porsi);
    } else {
      return 0;
    }
  }
  
  return maxPorsi;
}

function renderMenuManager() {
  state.currentView = "menuManager";
  const sortedCategories = [
    ...state.categories.filter(c => !c.system).sort((a, b) => a.name.localeCompare(b.name)),
    ...state.categories.filter(c => c.system)
  ];
  
  app.innerHTML = `
    <div class="pos-container">
      ${getSidebarHTML()}
      <main class="main-content smart-layout">
        <div class="smart-header">
          <div class="menu-manager-header">
            <h2><i class="fas fa-utensils"></i> Kelola Kategori & Menu</h2>
            <button class="btn btn-primary" onclick="showAddCategoryModal()">
              <i class="fas fa-plus"></i> Tambah Kategori
            </button>
          </div>
        </div>
        <div class="smart-scroll">
          <div class="category-grid">
            ${sortedCategories.map(c => `
              <div class="category-card">
                <div class="category-header">
                  <h3>${c.name}</h3>
                  ${c.system ? '<span class="badge-system">System</span>' : ''}
                </div>
                <div class="category-actions">
                  <button class="btn btn-primary" onclick="openCategory('${c.id}')">
                    <i class="fas fa-folder-open"></i> Buka Menu
                  </button>
                  ${!c.system ? `
                    <button class="btn btn-danger" onclick="deleteCategory('${c.id}')">
                      <i class="fas fa-trash"></i>
                    </button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </main>
    </div>
  `;
}

async function showAddCategoryModal() {
  const name = await showPrompt('Nama Kategori Baru');
  if (!name) return;
  
  try {
    await dbCloud.collection("categories").add({ 
      name, 
      system: false, 
      createdAt: new Date() 
    });
    showToast("Kategori ditambahkan");
  } catch (error) {
    showToast("Gagal: " + error.message, 'error');
  }
}

async function deleteCategory(id) {
  if (!await showConfirm("Hapus kategori? Menu akan dipindahkan ke Lainnya.")) return;
  
  try {
    const lainnya = state.categories.find(c => c.system);
    for (const m of state.menus.filter(m => m.categoryId === id)) {
      await dbCloud.collection("menus").doc(m.id).update({ categoryId: lainnya.id });
    }
    await dbCloud.collection("categories").doc(id).delete();
    showToast("Kategori dihapus");
  } catch (error) {
    showToast("Gagal: " + error.message, 'error');
  }
}

function openCategory(id) {
  state.currentView = "openCategory";
  state.currentCategoryId = id;
  const category = state.categories.find(c => c.id === id);
  if (!category) return;
  
  const menus = state.menus.filter(m => m.categoryId === id);
  
  app.innerHTML = `
    <div class="pos-container">
      ${getSidebarHTML()}
      <main class="main-content smart-layout">
        <div class="smart-header">
          <div class="header-row">
            <h2><i class="fas fa-folder-open"></i> ${category.name}</h2>
            <button class="btn btn-secondary" onclick="renderMenuManager()">
              <i class="fas fa-arrow-left"></i> Kembali
            </button>
          </div>
          
          <button class="btn btn-primary" onclick="showAddMenuModal('${id}')">
            <i class="fas fa-plus"></i> Tambah Menu
          </button>
          
          <div class="selection-bar">
            <button class="btn btn-secondary" onclick="toggleSelectAllMenu('${id}')">
              ${state.selectedMenus.size === menus.length ? 'Batal Pilih' : 'Pilih Semua'}
            </button>
            <button class="btn btn-danger" onclick="deleteSelectedMenus('${id}')" 
                    ${state.selectedMenus.size === 0 ? 'disabled' : ''}>
              <i class="fas fa-trash"></i> Hapus ${state.selectedMenus.size > 0 ? `(${state.selectedMenus.size})` : ''}
            </button>
          </div>
        </div>
        
        <div class="smart-scroll">
          <div class="menu-grid">
            ${menus.length === 0 ? 
              '<p class="text-center text-muted">Belum ada menu</p>' : 
              menus.map(m => {
                const stokOtomatis = m.resep ? hitungStokProduk(m) : null;
                return `
                <div class="menu-card">
                  <div class="menu-card-header">
                    <input type="checkbox" ${state.selectedMenus.has(m.id) ? 'checked' : ''} 
                           onchange="toggleSelectMenu('${m.id}')">
                    <div class="menu-info">
                      <div class="menu-name">${m.name}</div>
                      <div class="menu-price">Rp ${formatRupiah(m.price)}</div>
                      ${m.resep ? 
                        `<div class="menu-stock">
                          <i class="fas fa-cubes"></i> Stok: ${stokOtomatis} porsi
                          <small class="text-muted">(dari bahan)</small>
                        </div>` : 
                        m.useStock ? 
                        `<div class="menu-stock"><i class="fas fa-box"></i> Stok: ${m.stock}</div>` : 
                        '<div class="menu-stock text-muted"><i class="fas fa-infinity"></i></div>'
                      }
                      ${m.resep ? 
                        `<div class="menu-resep"><i class="fas fa-flask"></i> ${m.resep.length} bahan</div>` : 
                        ''}
                    </div>
                  </div>
                  <div class="menu-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editMenu('${m.id}')">
                      <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteMenu('${m.id}')">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              `}).join('')}
          </div>
        </div>
      </main>
    </div>
  `;
}

async function showAddMenuModal(categoryId) {
  const bahanOptions = state.rawMaterials.map(b => 
    `<option value="${b.id}" data-satuan="${b.satuan || 'pcs'}">${b.name} (${b.satuan || 'pcs'})</option>`
  ).join('');
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'add-menu-modal';
  modal.innerHTML = `
    <div class="modal modal-lg">
      <h3><i class="fas fa-plus-circle"></i> Tambah Menu</h3>
      
      <div class="form-group">
        <label class="form-label">Nama Menu <span class="text-danger">*</span></label>
        <input type="text" id="menuName" class="form-input" placeholder="Contoh: Nasi Goreng" autocomplete="off">
      </div>
      
      <div class="form-group">
        <label class="form-label">Harga (Rp) <span class="text-danger">*</span></label>
        <input type="number" id="menuPrice" class="form-input" placeholder="15000" min="0">
      </div>
      
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="useStock"> Gunakan Stok Manual
        </label>
        <small class="text-muted">Stok akan dihitung otomatis dari bahan</small>
      </div>
      
      <div id="stockField" class="form-group" style="display:none;">
        <label class="form-label">Stok Awal</label>
        <input type="number" id="menuStock" class="form-input" value="0" min="0">
      </div>
      
      <div class="form-group">
        <label class="form-label">Resep (Bahan Baku)</label>
        <p class="text-muted small">Stok dihitung dari bahan terkecil</p>
        <div id="recipeContainer">
          <div class="recipe-row" id="recipe-row-0">
            <select class="recipe-select" id="bahan-0">
              <option value="">Pilih Bahan</option>
              ${bahanOptions}
            </select>
            <input type="number" class="recipe-input" id="qty-0" placeholder="Jumlah" min="0" step="0.1" value="1">
            <span class="recipe-unit" id="unit-0">pcs</span>
            <button type="button" class="recipe-remove" onclick="removeRecipeRow(0)" style="display:none;">×</button>
          </div>
        </div>
        <button type="button" class="recipe-add" onclick="addRecipeRow()">
          <i class="fas fa-plus"></i> Tambah Bahan
        </button>
      </div>
      
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeAddMenuModal()">Batal</button>
        <button class="btn btn-primary" onclick="saveNewMenu('${categoryId}')">
          <i class="fas fa-save"></i> Simpan
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const useStockCheck = document.getElementById('useStock');
  if (useStockCheck) {
    useStockCheck.addEventListener('change', function(e) {
      document.getElementById('stockField').style.display = e.target.checked ? 'block' : 'none';
    });
  }
  
  setupRecipeRowListeners(0);
  
  window.addRecipeRow = function() {
    const container = document.getElementById('recipeContainer');
    const index = container.children.length;
    
    const row = document.createElement('div');
    row.className = 'recipe-row';
    row.id = `recipe-row-${index}`;
    row.innerHTML = `
      <select class="recipe-select" id="bahan-${index}">
        <option value="">Pilih Bahan</option>
        ${bahanOptions}
      </select>
      <input type="number" class="recipe-input" id="qty-${index}" placeholder="Jumlah" min="0" step="0.1" value="1">
      <span class="recipe-unit" id="unit-${index}">pcs</span>
      <button type="button" class="recipe-remove" onclick="removeRecipeRow(${index})">×</button>
    `;
    
    container.appendChild(row);
    setupRecipeRowListeners(index);
  };
  
  window.removeRecipeRow = function(index) {
    const row = document.getElementById(`recipe-row-${index}`);
    if (row && document.querySelectorAll('.recipe-row').length > 1) {
      row.remove();
    }
  };
  
  window.closeAddMenuModal = function() {
    const modal = document.getElementById('add-menu-modal');
    if (modal) modal.remove();
  };
  
  window.saveNewMenu = async function(catId) {
    try {
      const nameInput = document.getElementById('menuName');
      const priceInput = document.getElementById('menuPrice');
      
      if (!nameInput) {
        showToast("Terjadi kesalahan", 'error');
        return;
      }
      
      const name = nameInput.value.trim();
      if (!name) {
        showToast("Nama menu harus diisi!", 'error');
        nameInput.focus();
        return;
      }
      
      if (!priceInput) {
        showToast("Terjadi kesalahan", 'error');
        return;
      }
      
      const price = parseInt(priceInput.value);
      if (isNaN(price) || price <= 0) {
        showToast("Harga harus diisi dengan angka yang valid!", 'error');
        priceInput.focus();
        return;
      }
      
      const useStock = document.getElementById('useStock')?.checked || false;
      const stock = useStock ? parseInt(document.getElementById('menuStock')?.value) || 0 : 0;
      
      const resep = [];
      const rows = document.querySelectorAll('#recipeContainer .recipe-row');
      
      for (let i = 0; i < rows.length; i++) {
        const select = document.getElementById(`bahan-${i}`);
        const qty = parseFloat(document.getElementById(`qty-${i}`)?.value);
        
        if (select?.value && qty > 0) {
          const bahan = state.rawMaterials.find(b => b.id === select.value);
          if (bahan) {
            resep.push({
              bahanId: bahan.id,
              nama: bahan.name,
              qty: qty,
              satuan: bahan.satuan || 'pcs'
            });
          }
        }
      }
      
      showToast("⏳ Menyimpan menu...", 'warning');
      
      const menuData = {
        name: name,
        price: price,
        categoryId: catId,
        useStock: useStock,
        stock: stock,
        resep: resep.length > 0 ? resep : null,
        active: true,
        createdAt: new Date()
      };
      
      const docRef = await dbCloud.collection("menus").add(menuData);
      
      showToast("Menu berhasil ditambahkan!");
      
      closeAddMenuModal();
      openCategory(catId);
      
    } catch (error) {
      console.error('Error tambah menu:', error);
      
      if (error.code === 'permission-denied') {
        showToast("Tidak punya izin. Periksa Firestore Rules", 'error');
      } else {
        showToast("Gagal: " + error.message, 'error');
      }
    }
  };
  
  function setupRecipeRowListeners(index) {
    const select = document.getElementById(`bahan-${index}`);
    if (select) {
      select.addEventListener('change', function(e) {
        const unit = e.target.options[e.target.selectedIndex]?.dataset?.satuan || 'pcs';
        const unitSpan = document.getElementById(`unit-${index}`);
        if (unitSpan) unitSpan.textContent = unit;
      });
    }
  }
}

async function editMenu(id) {
  const menu = state.menus.find(m => m.id === id);
  if (!menu) return;

  const existingModal = document.getElementById('custom-edit-modal');
  if (existingModal) existingModal.remove();

  const bahanOptions = state.rawMaterials.map(b =>
    `<option value="${b.id}" data-satuan="${b.satuan || 'pcs'}">${b.name} (${b.satuan || 'pcs'})</option>`
  ).join('');

  const modal = document.createElement('div');
  modal.id = 'custom-edit-modal';
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;

  modal.innerHTML = `
    <div class="modal modal-lg" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
      <div style="padding: 20px;">
        <h3><i class="fas fa-edit"></i> Edit ${menu.name}</h3>
        
        <div class="form-group">
          <label class="form-label">Nama Menu</label>
          <input type="text" id="editName" class="form-input" value="${menu.name}">
        </div>
        
        <div class="form-group">
          <label class="form-label">Harga (Rp)</label>
          <input type="number" id="editPrice" class="form-input" value="${menu.price}">
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" id="editUseStock" ${menu.useStock ? 'checked' : ''}> Gunakan Stok Manual
          </label>
          <small class="text-muted">Stok akan dihitung otomatis dari bahan</small>
        </div>
        
        <div id="editStockField" class="form-group" style="${menu.useStock ? 'display:block;' : 'display:none;'}">
          <label class="form-label">Stok</label>
          <input type="number" id="editStock" class="form-input" value="${menu.stock || 0}">
        </div>
        
        <div class="form-group">
          <label class="form-label">Resep (Bahan Baku)</label>
          <p class="text-muted small">Stok dihitung dari bahan terkecil</p>
          <div id="editRecipeContainer">
            ${menu.resep?.map((r, i) => `
              <div class="recipe-row" id="edit-recipe-row-${i}">
                <select class="recipe-select" id="editBahan-${i}">
                  <option value="">Pilih Bahan</option>
                  ${state.rawMaterials.map(b =>
    `<option value="${b.id}" data-satuan="${b.satuan || 'pcs'}" ${b.id === r.bahanId ? 'selected' : ''}>${b.name} (${b.satuan || 'pcs'})</option>`
  ).join('')}
                </select>
                <input type="number" class="recipe-input" id="editQty-${i}" placeholder="Jumlah" min="0" step="0.1" value="${r.qty}">
                <span class="recipe-unit" id="editUnit-${i}">${r.satuan || 'pcs'}</span>
                <button type="button" class="recipe-remove" onclick="removeEditRecipeRow(${i})">×</button>
              </div>
            `).join('') || `
              <div class="recipe-row" id="edit-recipe-row-0">
                <select class="recipe-select" id="editBahan-0">
                  <option value="">Pilih Bahan</option>
                  ${bahanOptions}
                </select>
                <input type="number" class="recipe-input" id="editQty-0" placeholder="Jumlah" min="0" step="0.1" value="1">
                <span class="recipe-unit" id="editUnit-0">pcs</span>
                <button type="button" class="recipe-remove" onclick="removeEditRecipeRow(0)">×</button>
              </div>
            `}
          </div>
          <button type="button" class="recipe-add" onclick="addEditRecipeRow()">
            <i class="fas fa-plus"></i> Tambah Bahan
          </button>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
          <button class="btn btn-secondary" onclick="closeEditModal()">Batal</button>
          <button class="btn btn-primary" onclick="saveEditMenu('${id}')">
            <i class="fas fa-save"></i> Simpan
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('editUseStock')?.addEventListener('change', function (e) {
    const stockField = document.getElementById('editStockField');
    if (stockField) {
      stockField.style.display = e.target.checked ? 'block' : 'none';
    }
  });

  const rows = document.querySelectorAll('#editRecipeContainer .recipe-row');
  rows.forEach((row, i) => {
    const select = document.getElementById(`editBahan-${i}`);
    if (select) {
      select.addEventListener('change', function (e) {
        const unit = e.target.options[e.target.selectedIndex]?.dataset?.satuan || 'pcs';
        const unitSpan = document.getElementById(`editUnit-${i}`);
        if (unitSpan) unitSpan.textContent = unit;
      });
    }
  });
}

window.closeEditModal = function () {
  const modal = document.getElementById('custom-edit-modal');
  if (modal) modal.remove();
};

window.addEditRecipeRow = function () {
  const container = document.getElementById('editRecipeContainer');
  if (!container) return;

  const bahanOptions = state.rawMaterials.map(b =>
    `<option value="${b.id}" data-satuan="${b.satuan || 'pcs'}">${b.name} (${b.satuan || 'pcs'})</option>`
  ).join('');

  const index = container.children.length;
  const row = document.createElement('div');
  row.className = 'recipe-row';
  row.id = `edit-recipe-row-${index}`;
  row.innerHTML = `
    <select class="recipe-select" id="editBahan-${index}">
      <option value="">Pilih Bahan</option>
      ${bahanOptions}
    </select>
    <input type="number" class="recipe-input" id="editQty-${index}" placeholder="Jumlah" min="0" step="0.1" value="1">
    <span class="recipe-unit" id="editUnit-${index}">pcs</span>
    <button type="button" class="recipe-remove" onclick="removeEditRecipeRow(${index})">×</button>
  `;
  container.appendChild(row);

  const select = document.getElementById(`editBahan-${index}`);
  if (select) {
    select.addEventListener('change', function (e) {
      const unit = e.target.options[e.target.selectedIndex]?.dataset?.satuan || 'pcs';
      const unitSpan = document.getElementById(`editUnit-${index}`);
      if (unitSpan) unitSpan.textContent = unit;
    });
  }
};

window.removeEditRecipeRow = function (index) {
  const row = document.getElementById(`edit-recipe-row-${index}`);
  if (row && document.querySelectorAll('#editRecipeContainer .recipe-row').length > 1) {
    row.remove();
  }
};

window.saveEditMenu = async function (id) {
  console.log("Menyimpan edit untuk menu:", id);

  const nameInput = document.getElementById('editName');
  const priceInput = document.getElementById('editPrice');
  const useStockInput = document.getElementById('editUseStock');
  const stockInput = document.getElementById('editStock');

  if (!nameInput || !priceInput) {
    console.error("Form tidak lengkap");
    showToast("Error: Form tidak lengkap", 'error');
    return;
  }

  const name = nameInput.value.trim();
  const price = parseInt(priceInput.value);
  const useStock = useStockInput ? useStockInput.checked : false;
  const stock = useStock && stockInput ? parseInt(stockInput.value) || 0 : 0;

  if (!name) {
    showToast("Nama menu harus diisi", 'error');
    nameInput.focus();
    return;
  }

  if (!price || price <= 0) {
    showToast("Harga harus diisi dengan valid", 'error');
    priceInput.focus();
    return;
  }

  const resep = [];
  const rows = document.querySelectorAll('#editRecipeContainer .recipe-row');

  for (let i = 0; i < rows.length; i++) {
    const select = document.getElementById(`editBahan-${i}`);
    const qtyInput = document.getElementById(`editQty-${i}`);

    if (!select || !qtyInput) continue;

    const qty = parseFloat(qtyInput.value);

    if (select.value && qty > 0) {
      const bahan = state.rawMaterials.find(b => b.id === select.value);
      if (bahan) {
        resep.push({
          bahanId: bahan.id,
          nama: bahan.name,
          qty: qty,
          satuan: bahan.satuan || 'pcs'
        });
      }
    }
  }

  console.log("Data yang akan disimpan:", { name, price, useStock, stock, resep });

  try {
    showToast("⏳ Menyimpan perubahan...", 'warning');

    await dbCloud.collection("menus").doc(id).update({
      name,
      price,
      useStock,
      stock,
      resep: resep.length ? resep : null,
      updatedAt: new Date()
    });

    console.log("Update sukses!");
    showToast("Menu berhasil diupdate");

    closeEditModal();

    openCategory(state.currentCategoryId);
  } catch (error) {
    console.error("Error detail:", error);
    showToast("Gagal: " + error.message, 'error');
  }
};

window.addEditRecipeRow = function() {
  const container = document.getElementById('editRecipeContainer');
  if (!container) return;
  
  const bahanOptions = state.rawMaterials.map(b => 
    `<option value="${b.id}" data-satuan="${b.satuan || 'pcs'}">${b.name} (${b.satuan || 'pcs'})</option>`
  ).join('');
  
  const index = container.children.length;
  const row = document.createElement('div');
  row.className = 'recipe-row';
  row.id = `edit-recipe-row-${index}`;
  row.innerHTML = `
    <select class="recipe-select" id="editBahan-${index}">
      <option value="">Pilih Bahan</option>
      ${bahanOptions}
    </select>
    <input type="number" class="recipe-input" id="editQty-${index}" placeholder="Jumlah" min="0" step="0.1" value="1">
    <span class="recipe-unit" id="editUnit-${index}">pcs</span>
    <button type="button" class="recipe-remove" onclick="removeEditRecipeRow(${index})">×</button>
  `;
  container.appendChild(row);
  
  const select = document.getElementById(`editBahan-${index}`);
  if (select) {
    select.addEventListener('change', function(e) {
      const unit = e.target.options[e.target.selectedIndex]?.dataset?.satuan || 'pcs';
      const unitSpan = document.getElementById(`editUnit-${index}`);
      if (unitSpan) unitSpan.textContent = unit;
    });
  }
};

window.removeEditRecipeRow = function(index) {
  const row = document.getElementById(`edit-recipe-row-${index}`);
  if (row && document.querySelectorAll('#editRecipeContainer .recipe-row').length > 1) {
    row.remove();
  }
};

async function deleteMenu(id) {
  if (!await showConfirm("Hapus menu ini?")) return;
  
  try {
    await dbCloud.collection("menus").doc(id).delete();
    showToast("Menu dihapus");
    openCategory(state.currentCategoryId);
  } catch (error) {
    showToast("Gagal: " + error.message, 'error');
  }
}

function toggleSelectMenu(id) {
  if (state.selectedMenus.has(id)) state.selectedMenus.delete(id);
  else state.selectedMenus.add(id);
  openCategory(state.currentCategoryId);
}

function toggleSelectAllMenu(categoryId) {
  const menus = state.menus.filter(m => m.categoryId === categoryId);
  if (state.selectedMenus.size === menus.length) state.selectedMenus.clear();
  else menus.forEach(m => state.selectedMenus.add(m.id));
  openCategory(categoryId);
}

async function deleteSelectedMenus(categoryId) {
  if (state.selectedMenus.size === 0) return;
  if (!await showConfirm(`Hapus ${state.selectedMenus.size} menu?`)) return;
  
  try {
    await Promise.all([...state.selectedMenus].map(id => dbCloud.collection("menus").doc(id).delete()));
    state.selectedMenus.clear();
    showToast(`${state.selectedMenus.size} menu dihapus`);
    openCategory(categoryId);
  } catch (error) {
    showToast("Gagal: " + error.message, 'error');
  }
}

window.renderMenuManager = renderMenuManager;
window.showAddCategoryModal = showAddCategoryModal;
window.deleteCategory = deleteCategory;
window.openCategory = openCategory;
window.showAddMenuModal = showAddMenuModal;
window.editMenu = editMenu;
window.deleteMenu = deleteMenu;
window.toggleSelectMenu = toggleSelectMenu;
window.toggleSelectAllMenu = toggleSelectAllMenu;
window.deleteSelectedMenus = deleteSelectedMenus;
window.hitungStokProduk = hitungStokProduk;
window.updateAllProductStocks = updateAllProductStocks;

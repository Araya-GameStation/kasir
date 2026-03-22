let lastMenuScroll = 0;

function renderMenuManager() {
    state.currentView = "menuManager";
    const sortedCategories = [
        ...state.categories.filter(c => !c.system).sort((a, b) => a.name.localeCompare(b.name)),
        ...state.categories.filter(c => c.system)
    ];
    const content = `
    <div class="stack-y menu-stack">
      <div class="row-between">
        <h2 class="text-heading fw-bold"><i class="fas fa-utensils text-primary mr-2"></i> Kelola Kategori & Menu</h2>
        <button class="btn btn-primary" onclick="const b=this;Utils.setButtonLoading(b,true);showAddCategoryModal().finally(()=>Utils.setButtonLoading(b,false))">
          <i class="fas fa-plus"></i> Tambah Kategori
        </button>
      </div>
      <div class="category-grid">
        ${sortedCategories.map(c => `
          <div class="category-card">
            <div class="section-category-header">
              <h3>${c.name}</h3>
              ${c.system ? '<span class="badge-system">System</span>' : ''}
            </div>
            <div class="menu-item-meta">
              ${state.menus.filter(m => m.categoryId === c.id).length} Produk
            </div>
            <div class="category-actions">
              <button class="btn btn-primary btn-sm" onclick="openCategory('${c.id}')">
                <i class="fas fa-folder-open"></i> Buka Menu
              </button>
              ${!c.system ? `
                <button class="btn-icon-sm" onclick="editCategory('${c.id}')" title="Edit">
                  <i class="fas fa-pen"></i>
                </button>
                <button class="btn-icon-sm btn-icon-danger" onclick="const b=this;Utils.setButtonLoading(b,true);deleteCategory('${c.id}').finally(()=>Utils.setButtonLoading(b,false))" title="Hapus">
                  <i class="fas fa-trash"></i>
                </button>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
    app.innerHTML = Layout.renderMain(content);
    requestAnimationFrame(() => {
        const _main = document.querySelector('main');
        if (_main && lastMenuScroll > 0) {
            _main.scrollTop = lastMenuScroll;
        }
    });
}

async function showAddCategoryModal() {
    const name = await Utils.showPrompt('Nama Kategori Baru');
    if (!name) return;
    try {
        await dbCloud.collection("categories").add({
            name,
            system: false,
            createdAt: new Date()
        });
        Utils.showToast("Kategori ditambahkan");
    } catch (error) {
        Utils.showToast("Gagal: " + error.message, 'error');
    }
}

async function editCategory(id) {
    const category = state.categories.find(c => c.id === id);
    if (!category) return;
    const newName = await Utils.showPrompt('Edit Nama Kategori', category.name);
    if (!newName || newName === category.name) return;
    try {
        await dbCloud.collection("categories").doc(id).update({
            name: newName,
            updatedAt: new Date()
        });
        Utils.showToast("Kategori berhasil diupdate");
    } catch (error) {
        Utils.showToast("Gagal: " + error.message, 'error');
    }
}

async function deleteCategory(id) {
    if (!await Utils.showConfirm("Hapus kategori? Menu akan dipindahkan ke Lainnya.")) return;
    try {
        const lainnya = state.categories.find(c => c.system);
        for (const m of state.menus.filter(m => m.categoryId === id)) {
            await dbCloud.collection("menus").doc(m.id).update({ categoryId: lainnya.id });
        }
        await dbCloud.collection("categories").doc(id).delete();
        Utils.showToast("Kategori dihapus");
    } catch (error) {
        Utils.showToast("Gagal: " + error.message, 'error');
    }
}

function openCategory(id) {
    state.currentView = "openCategory";
    state.currentCategoryId = id;
    const category = state.categories.find(c => c.id === id);
    if (!category) return;
    const menus = state.menus.filter(m => m.categoryId === id);
    const sortedMenus = SortableTable.sort(menus, 'menus');
    const content = `
    <div class="stack-y menu-stack">
      <div class="row-between">
        <h2 class="text-heading fw-bold"><i class="fas fa-folder-open text-primary mr-2"></i> ${category.name}</h2>
        <button class="btn-kembali" onclick="renderMenuManager()">
          <i class="fas fa-arrow-left"></i> Kembali
        </button>
      </div>
      <div class="row-gap">
        <button class="btn btn-primary" onclick="showAddMenuModal('${id}')">
          <i class="fas fa-plus"></i> Tambah Menu
        </button>
        <button class="btn btn-secondary" onclick="toggleSelectAllMenu('${id}')">
          ${state.selectedMenus.size === menus.length ? 'Batal Pilih' : 'Pilih Semua'}
        </button>
        <button class="btn btn-danger" onclick="const b=this;Utils.setButtonLoading(b,true);deleteSelectedMenus('${id}').finally(()=>Utils.setButtonLoading(b,false))" 
                ${state.selectedMenus.size === 0 ? 'disabled' : ''}>
          <i class="fas fa-trash"></i> Hapus ${state.selectedMenus.size > 0 ? `(${state.selectedMenus.size})` : ''}
        </button>
      </div>
      <table class="table-full">
        <thead class="neu-table-head">
          <tr>
            <th class="td-base text-left">Pilih</th>
            <th class="td-base text-left cursor-pointer" onclick="sortMenus('name')">
              Nama <i class="fas ${SortableTable.getSortIcon('menus', 'name')}"></i>
            </th>
            <th class="td-base text-left cursor-pointer" onclick="sortMenus('price')">
              Harga <i class="fas ${SortableTable.getSortIcon('menus', 'price')}"></i>
            </th>
            <th class="td-base text-left">Stok</th>
            <th class="td-base text-left">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${sortedMenus.length === 0 ?
            '<tr><td colspan="5" class="td-base text-center text-muted">Belum ada menu</td></tr>' :
            sortedMenus.map(m => {
                const stokOtomatis = m.resep ? Utils.hitungStokProduk(m) : null;
                return `
                <tr class="neu-table-row">
                  <td class="td-base">
                    <input type="checkbox" ${state.selectedMenus.has(m.id) ? 'checked' : ''} 
                           onchange="toggleSelectMenu('${m.id}')">
                  </td>
                  <td class="td-base td-medium">${m.name}</td>
                  <td class="td-base">Rp ${Utils.formatRupiah(m.price)}</td>
                  <td class="td-base">
                    ${m.resep ?
                        `<span class="text-base-sm"><i class="fas fa-cubes"></i> ${stokOtomatis} porsi</span>` :
                        m.useStock ?
                            `<span class="text-base-sm"><i class="fas fa-box"></i> ${m.stock}</span>` :
                            '<span class="text-base-sm text-muted"><i class="fas fa-infinity"></i></span>'
                    }
                  </td>
                  <td class="td-base">
                    <button class="btn-icon-sm" onclick="editMenu('${m.id}')" title="Edit">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon-sm btn-icon-danger" onclick="const b=this;Utils.setButtonLoading(b,true);deleteMenu('${m.id}').finally(()=>Utils.setButtonLoading(b,false))" title="Hapus">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
        </tbody>
      </table>
    </div>
  `;
    app.innerHTML = Layout.renderMain(content);
    requestAnimationFrame(() => {
        const _main = document.querySelector('main');
        if (_main && lastMenuScroll > 0) {
            _main.scrollTop = lastMenuScroll;
        }
    });
}

function sortMenus(field) {
    const _m = document.querySelector('main'); if (_m) lastMenuScroll = _m.scrollTop;
    SortableTable.toggle('menus', field);
    openCategory(state.currentCategoryId);
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
        <input type="text" id="menuName" class="form-input" placeholder="Contoh: Ice Tea" autocomplete="off">
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
      <div id="stockField" class="form-group is-hidden">
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
            <button type="button" class="recipe-remove" onclick="removeRecipeRow(0)"<>×</button>
          </div>
        </div>
        <button type="button" class="recipe-add" onclick="addRecipeRow()">
          <i class="fas fa-plus"></i> Tambah Bahan
        </button>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeAddMenuModal()">Batal</button>
        <button class="btn btn-primary" onclick="const b=this;Utils.setButtonLoading(b,true);saveNewMenu('${categoryId}').finally(()=>Utils.setButtonLoading(b,false))">
          <i class="fas fa-save"></i> Simpan
        </button>
      </div>
    </div>
  `;
    document.body.appendChild(modal);
    const useStockCheck = document.getElementById('useStock');
    if (useStockCheck) {
        useStockCheck.addEventListener('change', function (e) {
            document.getElementById('stockField').classList.toggle('is-hidden', !e.target.checked);
        });
    }
    setupRecipeRowListeners(0);
    window.addRecipeRow = function () {
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
    window.removeRecipeRow = function (index) {
        const row = document.getElementById(`recipe-row-${index}`);
        if (row && document.querySelectorAll('.recipe-row').length > 1) {
            row.remove();
        }
    };
    window.closeAddMenuModal = function () {
        const modal = document.getElementById('add-menu-modal');
        if (modal) modal.remove();
    };
    window.saveNewMenu = async function (catId) {
        try {
            const nameInput = document.getElementById('menuName');
            const priceInput = document.getElementById('menuPrice');
            if (!nameInput) {
                Utils.showToast("Terjadi kesalahan", 'error');
                return;
            }
            const name = nameInput.value.trim();
            if (!name) {
                Utils.showToast("Nama menu harus diisi!", 'error');
                nameInput.focus();
                return;
            }
            if (!priceInput) {
                Utils.showToast("Terjadi kesalahan", 'error');
                return;
            }
            const price = parseInt(priceInput.value);
            if (isNaN(price) || price <= 0) {
                Utils.showToast("Harga harus diisi dengan angka yang valid!", 'error');
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
            Utils.showToast("⏳ Menyimpan menu...", 'warning');
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
            await dbCloud.collection("menus").add(menuData);
            Utils.showToast("Menu berhasil ditambahkan!");
            closeAddMenuModal();
            openCategory(catId);
        } catch (error) {
            if (error.code === 'permission-denied') {
                Utils.showToast("Tidak punya izin. Periksa Firestore Rules", 'error');
            } else {
                Utils.showToast("Gagal: " + error.message, 'error');
            }
        }
    };
    function setupRecipeRowListeners(index) {
        const select = document.getElementById(`bahan-${index}`);
        if (select) {
            select.addEventListener('change', function (e) {
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
    modal.innerHTML = `
    <div class="modal modal-lg modal-menu-detail">
      <div class="modal-menu-detail-body">
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
        <div id="editStockField" class="form-group ${menu.useStock ? '' : 'is-hidden'}">
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
        <div class="modal-menu-footer">
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
            stockField.classList.toggle('is-hidden', !e.target.checked);
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
    const nameInput = document.getElementById('editName');
    const priceInput = document.getElementById('editPrice');
    const useStockInput = document.getElementById('editUseStock');
    const stockInput = document.getElementById('editStock');
    if (!nameInput || !priceInput) {
        Utils.showToast("Error: Form tidak lengkap", 'error');
        return;
    }
    const name = nameInput.value.trim();
    const price = parseInt(priceInput.value);
    const useStock = useStockInput ? useStockInput.checked : false;
    const stock = useStock && stockInput ? parseInt(stockInput.value) || 0 : 0;
    if (!name) {
        Utils.showToast("Nama menu harus diisi", 'error');
        nameInput.focus();
        return;
    }
    if (!price || price <= 0) {
        Utils.showToast("Harga harus diisi dengan valid", 'error');
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
    try {
        Utils.showToast("⏳ Menyimpan perubahan...", 'warning');
        await dbCloud.collection("menus").doc(id).update({
            name,
            price,
            useStock,
            stock,
            resep: resep.length ? resep : null,
            updatedAt: new Date()
        });
        Utils.showToast("Menu berhasil diupdate");
        closeEditModal();
        openCategory(state.currentCategoryId);
    } catch (error) {
        Utils.showToast("Gagal: " + error.message, 'error');
    }
};

async function deleteMenu(id) {
    if (!await Utils.showConfirm("Hapus menu ini?")) return;
    try {
        await dbCloud.collection("menus").doc(id).delete();
        Utils.showToast("Menu dihapus");
        openCategory(state.currentCategoryId);
    } catch (error) {
        Utils.showToast("Gagal: " + error.message, 'error');
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
    if (!await Utils.showConfirm(`Hapus ${state.selectedMenus.size} menu?`)) return;
    try {
        const jumlah = state.selectedMenus.size;
        await Promise.all([...state.selectedMenus].map(id => dbCloud.collection("menus").doc(id).delete()));
        state.selectedMenus.clear();
        Utils.showToast(`${jumlah} menu dihapus`);
        openCategory(categoryId);
    } catch (error) {
        Utils.showToast("Gagal: " + error.message, 'error');
    }
}

window.renderMenuManager = renderMenuManager;
window.showAddCategoryModal = showAddCategoryModal;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.openCategory = openCategory;
window.showAddMenuModal = showAddMenuModal;
window.editMenu = editMenu;
window.deleteMenu = deleteMenu;
window.toggleSelectMenu = toggleSelectMenu;
window.toggleSelectAllMenu = toggleSelectAllMenu;
window.deleteSelectedMenus = deleteSelectedMenus;
window.sortMenus = sortMenus;
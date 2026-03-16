let currentSettingsTab = 'toko';

function renderSettings() {
  state.currentView = "settings";
  
  app.innerHTML = `
    <div class="pos-container">
      ${getSidebarHTML()}
      <main class="main-content smart-layout">
        <div class="smart-header">
          <div class="settings-header">
            <h2><i class="fas fa-cog"></i> Pengaturan</h2>
          </div>
          <div class="tab-nav">
            <button class="tab-btn ${currentSettingsTab === 'toko' ? 'active' : ''}" onclick="switchSettingsTab('toko')">
              <i class="fas fa-store"></i> Toko
            </button>
            <button class="tab-btn ${currentSettingsTab === 'struk' ? 'active' : ''}" onclick="switchSettingsTab('struk')">
              <i class="fas fa-receipt"></i> Struk
            </button>
            <button class="tab-btn ${currentSettingsTab === 'meja' ? 'active' : ''}" onclick="switchSettingsTab('meja')">
              <i class="fas fa-chair"></i> Meja
            </button>
            <button class="tab-btn ${currentSettingsTab === 'backup' ? 'active' : ''}" onclick="switchSettingsTab('backup')">
              <i class="fas fa-database"></i> Backup
            </button>
          </div>
        </div>
        
        <div class="smart-scroll">
          <div id="settings-content" class="settings-content">
            ${renderSettingsTab()}
          </div>
        </div>
      </main>
    </div>
  `;
}

function renderSettingsTab() {
  const s = state.settings || {};
  
  if (currentSettingsTab === 'toko') {
    return `
      <div class="settings-card">
        <h3><i class="fas fa-store"></i> Informasi Toko</h3>
        
        <div class="form-group">
          <label class="form-label">Nama Toko</label>
          <input type="text" id="tokoNama" class="form-input" value="${s.toko?.nama || 'GARIS WAKTU'}">
        </div>
        
        <div class="form-group">
          <label class="form-label">Alamat</label>
          <textarea id="tokoAlamat" class="form-input" rows="3">${s.toko?.alamat || ''}</textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">Telepon</label>
          <input type="text" id="tokoTelepon" class="form-input" value="${s.toko?.telepon || ''}">
        </div>
        
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="tokoEmail" class="form-input" value="${s.toko?.email || ''}">
        </div>
        
        <button class="btn btn-primary" onclick="saveTokoSettings()">
          <i class="fas fa-save"></i> Simpan
        </button>
      </div>
    `;
  }
  
  if (currentSettingsTab === 'struk') {
    const footerText = s.struk?.footer?.join('\n') || 'Terima Kasih\nIG: @arayagamestation';
    
    return `
      <div class="settings-card">
        <h3><i class="fas fa-receipt"></i> Pengaturan Struk</h3>
        
        <div class="form-group">
          <label class="form-label">Header Struk</label>
          <input type="text" id="strukHeader" class="form-input" value="${s.struk?.header || 'TERIMA KASIH'}">
        </div>
        
        <div class="form-group">
          <label class="form-label">Footer Struk</label>
          <textarea id="strukFooter" class="form-input" rows="4" placeholder="Tulis footer, satu baris per enter">${footerText}</textarea>
          <small class="text-muted">Setiap baris dipisahkan dengan enter</small>
        </div>
        
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" id="showMeja" ${s.struk?.showMeja !== false ? 'checked' : ''}>
            Tampilkan nomor meja di struk
          </label>
          
          <label class="checkbox-label">
            <input type="checkbox" id="showHargaSatuan" ${s.struk?.showHargaSatuan !== false ? 'checked' : ''}>
            Tampilkan harga satuan
          </label>
        </div>
        
        <button class="btn btn-primary" onclick="saveStrukSettings()">
          <i class="fas fa-save"></i> Simpan
        </button>
      </div>
    `;
  }
  
  if (currentSettingsTab === 'meja') {
    const mejaList = state.tables.filter(t => t.aktif !== false);
    
    return `
      <div class="settings-card">
        <h3><i class="fas fa-chair"></i> Manajemen Meja</h3>
        
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" id="mejaAktif" ${s.meja?.aktif !== false ? 'checked' : ''}>
            Aktifkan fitur meja
          </label>
        </div>
        
        <div class="add-row">
          <input type="text" id="newMejaNomor" class="form-input" placeholder="Nomor meja">
          <input type="text" id="newMejaNama" class="form-input" placeholder="Nama meja">
          <button class="btn btn-primary" onclick="tambahMeja()">
            <i class="fas fa-plus"></i> Tambah
          </button>
        </div>
        
        <table class="settings-table">
          <thead>
            <tr>
              <th>Nomor</th>
              <th>Nama</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${mejaList.map(m => `
              <tr>
                <td>${m.nomor}</td>
                <td>${m.nama}</td>
                <td>
                  <span class="badge ${m.aktif ? 'badge-success' : 'badge-danger'}">
                    ${m.aktif ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td class="table-actions">
                  <button class="btn btn-sm btn-secondary" onclick="toggleMejaStatus('${m.id}')">
                    ${m.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="hapusMeja('${m.id}')">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <button class="btn btn-primary" onclick="saveMejaSettings()">
          <i class="fas fa-save"></i> Simpan
        </button>
      </div>
    `;
  }
  
  if (currentSettingsTab === 'backup') {
    return `
      <div class="settings-card">
        <h3><i class="fas fa-database"></i> Backup & Restore</h3>
        
        <div class="backup-grid">
          <div class="backup-card">
            <div class="backup-icon">
              <i class="fas fa-file-excel"></i>
            </div>
            <h4>Export Excel</h4>
            <p>Download semua data (rekap produk)</p>
            <button class="btn btn-primary" onclick="exportToExcel()">
              <i class="fas fa-download"></i> Export
            </button>
          </div>
          
          <div class="backup-card">
            <div class="backup-icon">
              <i class="fas fa-file-pdf"></i>
            </div>
            <h4>Export PDF</h4>
            <p>Download laporan ringkasan</p>
            <button class="btn btn-primary" onclick="exportToPDF()">
              <i class="fas fa-download"></i> Export
            </button>
          </div>
          
          <div class="backup-card">
            <div class="backup-icon">
              <i class="fas fa-file-import"></i>
            </div>
            <h4>Import Excel</h4>
            <p>Import menu & bahan</p>
            <input type="file" id="importExcelFile" accept=".xlsx,.xls" style="margin-bottom:10px;">
            <button class="btn btn-primary" onclick="importFromExcel()">
              <i class="fas fa-upload"></i> Import
            </button>
          </div>
          
          <div class="backup-card">
            <div class="backup-icon">
              <i class="fas fa-download"></i>
            </div>
            <h4>Template Excel</h4>
            <p>Download template import</p>
            <button class="btn btn-secondary" onclick="downloadTemplateExcel()">
              <i class="fas fa-file"></i> Template
            </button>
          </div>
        </div>
        
        <div class="backup-grid">
          <div class="backup-card warning">
            <div class="backup-icon">
              <i class="fas fa-history"></i>
            </div>
            <h4>Reset Riwayat</h4>
            <p>Hapus transaksi & sesi.<br>Kategori, Menu, Bahan tetap</p>
            <button class="btn btn-warning" onclick="resetRiwayatOnly()">
              <i class="fas fa-trash-alt"></i> Reset
            </button>
          </div>
          
          <div class="backup-card danger">
            <div class="backup-icon">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h4>Reset Total</h4>
            <p>Hapus SEMUA data!<br>Termasuk menu & bahan</p>
            <button class="btn btn-danger" onclick="resetData()">
              <i class="fas fa-skull-crossbones"></i> Reset Total
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  return '';
}

function switchSettingsTab(tab) {
  currentSettingsTab = tab;
  renderSettings();
}

async function saveTokoSettings() {
  try {
    await dbCloud.collection("settings").doc("toko").update({
      toko: {
        nama: document.getElementById('tokoNama').value,
        alamat: document.getElementById('tokoAlamat').value,
        telepon: document.getElementById('tokoTelepon').value,
        email: document.getElementById('tokoEmail').value
      }
    });
    
    state.settings.toko = {
      nama: document.getElementById('tokoNama').value,
      alamat: document.getElementById('tokoAlamat').value,
      telepon: document.getElementById('tokoTelepon').value,
      email: document.getElementById('tokoEmail').value
    };
    
    showToast("Pengaturan disimpan");
  } catch (error) {
    showToast("Gagal: " + error.message, 'error');
  }
}

async function saveStrukSettings() {
  try {
    const footerText = document.getElementById('strukFooter').value;
    const footer = footerText.split('\n').filter(l => l.trim() !== '');
    
    await dbCloud.collection("settings").doc("toko").update({
      struk: {
        header: document.getElementById('strukHeader').value,
        footer: footer,
        showMeja: document.getElementById('showMeja').checked,
        showHargaSatuan: document.getElementById('showHargaSatuan').checked
      }
    });
    
    state.settings.struk = {
      header: document.getElementById('strukHeader').value,
      footer: footer,
      showMeja: document.getElementById('showMeja').checked,
      showHargaSatuan: document.getElementById('showHargaSatuan').checked
    };
    
    showToast("Pengaturan disimpan");
  } catch (error) {
    showToast("Gagal: " + error.message, 'error');
  }
}

async function tambahMeja() {
  const nomor = document.getElementById('newMejaNomor').value;
  const nama = document.getElementById('newMejaNama').value;
  
  if (!nomor || !nama) {
    showToast("Nomor dan nama harus diisi", 'error');
    return;
  }
  
  try {
    await dbCloud.collection("tables").add({ 
      nomor, 
      nama, 
      aktif: true 
    });
    
    document.getElementById('newMejaNomor').value = '';
    document.getElementById('newMejaNama').value = '';
    showToast("Meja ditambahkan");
  } catch (error) {
    showToast("Gagal: " + error.message, 'error');
  }
}

async function toggleMejaStatus(id) {
  const meja = state.tables.find(t => t.id === id);
  if (!meja) return;
  
  try {
    await dbCloud.collection("tables").doc(id).update({ 
      aktif: !meja.aktif 
    });
    showToast(`Meja ${!meja.aktif ? 'diaktifkan' : 'dinonaktifkan'}`);
  } catch (error) {
    showToast("Gagal: " + error.message, 'error');
  }
}

async function hapusMeja(id) {
  if (!await showConfirm("Hapus meja ini?")) return;
  
  try {
    await dbCloud.collection("tables").doc(id).delete();
    showToast("Meja dihapus");
  } catch (error) {
    showToast("Gagal: " + error.message, 'error');
  }
}

async function saveMejaSettings() {
  try {
    await dbCloud.collection("settings").doc("toko").update({
      meja: { 
        aktif: document.getElementById('mejaAktif').checked 
      }
    });
    
    state.settings.meja = { 
      ...state.settings.meja, 
      aktif: document.getElementById('mejaAktif').checked 
    };
    
    showToast("Pengaturan disimpan");
  } catch (error) {
    showToast("Gagal: " + error.message, 'error');
  }
}

function exportToExcel() {
  try {
    const wb = XLSX.utils.book_new();
    
    const transaksiData = state.allTransactions?.map(t => {
      const tgl = new Date(t.date.seconds ? t.date.seconds * 1000 : t.date);
      return {
        'Tanggal': tgl.toLocaleDateString('id-ID'),
        'Waktu': tgl.toLocaleTimeString('id-ID'),
        'Kasir': t.kasir,
        'Meja': t.mejaNama || '-',
        'Total': t.total,
        'Cash': t.cashAmount || (t.metodeBayar === 'tunai' ? t.total : 0),
        'QRIS': t.qrisAmount || (t.metodeBayar === 'qris' ? t.total : 0),
        'Metode': t.metodeBayar === 'tunai' ? 'CASH' : t.metodeBayar === 'qris' ? 'QRIS' : 'CAMPUR',
        'Item': t.items.length
      };
    }) || [];
    
    const produkTerjual = {};
    state.allTransactions?.forEach(t => {
      t.items.forEach(i => {
        if (!produkTerjual[i.name]) {
          produkTerjual[i.name] = {
            nama: i.name,
            qty: 0,
            total: 0,
            hargaSatuan: i.price
          };
        }
        produkTerjual[i.name].qty += i.qty;
        produkTerjual[i.name].total += (i.price * i.qty);
      });
    });
    
    const rekapData = Object.values(produkTerjual)
      .sort((a, b) => b.qty - a.qty)
      .map(p => ({
        'Nama Produk': p.nama,
        'Jumlah Terjual': p.qty,
        'Harga Satuan': p.hargaSatuan,
        'Total Penjualan': p.total,
        'Persentase': state.allTransactions?.length ? 
          `${((p.qty / state.allTransactions.reduce((sum, t) => sum + t.items.length, 0)) * 100).toFixed(1)}%` : '0%'
      }));
    
    const menuData = state.menus?.map(m => ({
      'Nama Menu': m.name,
      'Harga': m.price,
      'Kategori': state.categories.find(c => c.id === m.categoryId)?.name || '-',
      'Stok': m.useStock ? m.stock : 'Tanpa stok',
      'Jumlah Resep': m.resep?.length || 0,
      'Status': m.active ? 'Aktif' : 'Nonaktif'
    })) || [];
    
    const bahanData = state.rawMaterials?.map(b => ({
      'Nama Bahan': b.name,
      'Stok': b.stock,
      'Satuan': b.satuan || 'pcs',
      'Min Stok': b.minStock || 5,
      'Supplier': b.supplier || '-',
      'Status': b.stock <= (b.minStock || 5) ? 'Menipis' : 'Aman'
    })) || [];
    
    const kategoriData = state.categories?.map(c => ({
      'Nama Kategori': c.name,
      'Tipe': c.system ? 'System' : 'Custom',
      'Jumlah Menu': state.menus.filter(m => m.categoryId === c.id).length
    })) || [];
    
    const sesiData = state.sessions?.map(s => {
      const buka = new Date(s.waktuBuka.seconds ? s.waktuBuka.seconds * 1000 : s.waktuBuka);
      const tutup = s.waktuTutup ? new Date(s.waktuTutup.seconds * 1000) : null;
      return {
        'Kasir': s.kasir,
        'Shift': s.shift,
        'Buka': buka.toLocaleString('id-ID'),
        'Tutup': tutup ? tutup.toLocaleString('id-ID') : 'Masih aktif',
        'Modal': s.modalAwal || 0,
        'Penjualan': s.totalPenjualan || 0,
        'Cash': s.totalCash || 0,
        'QRIS': s.totalQRIS || 0,
        'Transaksi': s.jumlahTransaksi || 0,
        'Status': s.status
      };
    }) || [];
    
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transaksiData), "Transaksi");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rekapData), "Produk Terjual");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(menuData), "Menu");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bahanData), "Bahan");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kategoriData), "Kategori");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sesiData), "Sesi");
    
    XLSX.writeFile(wb, `gariswaktu_lengkap_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("Excel diekspor");
    
  } catch (error) {
    console.error('Export error:', error);
    showToast("Gagal: " + error.message, 'error');
  }
}

function exportToPDF() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 15;
    
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("LAPORAN GARIS WAKTU", 105, y, { align: 'center' });
    y += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 105, y, { align: 'center' });
    y += 15;
    
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("RINGKASAN", 14, y);
    y += 8;
    
    const totalTransaksi = state.allTransactions?.length || 0;
    const totalPenjualan = state.allTransactions?.reduce((s,t) => s + t.total, 0) || 0;
    const totalCash = state.allTransactions?.reduce((s,t) => s + (t.cashAmount || (t.metodeBayar === 'tunai' ? t.total : 0)), 0) || 0;
    const totalQRIS = state.allTransactions?.reduce((s,t) => s + (t.qrisAmount || (t.metodeBayar === 'qris' ? t.total : 0)), 0) || 0;
    
    doc.setFontSize(10);
    doc.text(`Total Transaksi: ${totalTransaksi}`, 20, y); y += 6;
    doc.text(`Total Cash: Rp ${formatRupiah(totalCash)}`, 20, y); y += 6;
    doc.text(`Total QRIS: Rp ${formatRupiah(totalQRIS)}`, 20, y); y += 6;
    doc.text(`Total Penjualan: Rp ${formatRupiah(totalPenjualan)}`, 20, y); y += 15;
    
    doc.setFontSize(12);
    doc.text("PRODUK TERLARIS", 14, y);
    y += 8;
    
    const produkCount = {};
    state.allTransactions?.forEach(t => {
      t.items.forEach(i => {
        if (!produkCount[i.name]) {
          produkCount[i.name] = { qty: 0, total: 0 };
        }
        produkCount[i.name].qty += i.qty;
        produkCount[i.name].total += i.price * i.qty;
      });
    });
    
    const topProducts = Object.entries(produkCount)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 10);
    
    if (topProducts.length > 0) {
      doc.autoTable({
        startY: y,
        head: [['Nama Produk', 'Terjual', 'Total Penjualan']],
        body: topProducts.map(([name, data]) => [
          name,
          data.qty + ' pcs',
          `Rp ${formatRupiah(data.total)}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        margin: { left: 14, right: 14 }
      });
      
      y = doc.lastAutoTable.finalY + 15;
    } else {
      doc.text("Belum ada data penjualan", 20, y);
      y += 15;
    }
    
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(12);
    doc.text("BAHAN STOK MENIPIS", 14, y);
    y += 8;
    
    const lowStock = state.rawMaterials?.filter(b => 
      b.stock <= (b.minStock || 5)
    ) || [];
    
    if (lowStock.length > 0) {
      doc.autoTable({
        startY: y,
        head: [['Nama Bahan', 'Stok', 'Minimal', 'Satuan']],
        body: lowStock.map(b => [
          b.name,
          b.stock,
          b.minStock || 5,
          b.satuan || 'pcs'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
        margin: { left: 14, right: 14 }
      });
    } else {
      doc.text("Semua stok aman", 20, y);
    }
    
    doc.save(`gariswaktu_laporan_${new Date().toISOString().slice(0,10)}.pdf`);
    showToast("PDF diekspor");
    
  } catch (error) {
    console.error('PDF error:', error);
    showToast("Gagal: " + error.message, 'error');
  }
}

async function importFromExcel() {
  const file = document.getElementById('importExcelFile')?.files[0];
  if (!file) {
    showToast("Pilih file Excel", 'error');
    return;
  }
  
  if (!await showConfirm("Import akan menimpa data menu & bahan. Lanjutkan?")) return;
  
  try {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    
    const menuSheet = wb.Sheets["Menu"];
    const bahanSheet = wb.Sheets["Bahan"];
    
    let importCount = 0;
    
    if (menuSheet) {
      const menus = XLSX.utils.sheet_to_json(menuSheet);
      
      const oldMenus = await dbCloud.collection("menus").get();
      const batch = dbCloud.batch();
      oldMenus.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      for (const m of menus) {
        await dbCloud.collection("menus").add({
          name: m['Nama Menu'] || 'Unknown',
          price: parseInt(m['Harga']) || 0,
          categoryId: null,
          useStock: m['Gunakan Stok'] === 'TRUE',
          stock: parseInt(m['Stok']) || 0,
          active: true,
          createdAt: new Date()
        });
        importCount++;
      }
    }
    
    if (bahanSheet) {
      const bahan = XLSX.utils.sheet_to_json(bahanSheet);
      
      const oldBahan = await dbCloud.collection("raw_materials").get();
      const batch = dbCloud.batch();
      oldBahan.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      for (const b of bahan) {
        await dbCloud.collection("raw_materials").add({
          name: b['Nama Bahan'] || 'Unknown',
          satuan: b['Satuan'] || 'pcs',
          stock: parseFloat(b['Stok Awal']) || 0,
          minStock: parseInt(b['Minimal Stok']) || 5,
          createdAt: new Date()
        });
        importCount++;
      }
    }
    
    showToast(`Import berhasil (${importCount} data)`);
    setTimeout(() => location.reload(), 2000);
  } catch (error) {
    showToast("Gagal: " + error.message, 'error');
  }
}

function downloadTemplateExcel() {
  try {
    const wb = XLSX.utils.book_new();
    
    const menuTemplate = [
      { 
        'Nama Menu': 'Nasi Goreng', 
        'Harga': 15000, 
        'Kategori': 'Makanan', 
        'Gunakan Stok': 'TRUE', 
        'Stok': 50 
      },
      { 
        'Nama Menu': 'Es Teh', 
        'Harga': 5000, 
        'Kategori': 'Minuman', 
        'Gunakan Stok': 'FALSE', 
        'Stok': 0 
      }
    ];
    
    const bahanTemplate = [
      { 
        'Nama Bahan': 'Tepung', 
        'Satuan': 'kg', 
        'Stok Awal': 25, 
        'Minimal Stok': 5 
      },
      { 
        'Nama Bahan': 'Telur', 
        'Satuan': 'pcs', 
        'Stok Awal': 100, 
        'Minimal Stok': 20 
      }
    ];
    
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(menuTemplate), "Menu");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bahanTemplate), "Bahan");
    
    XLSX.writeFile(wb, "template_import_gariswaktu.xlsx");
    showToast("Template didownload");
  } catch (error) {
    showToast("Gagal: " + error.message, 'error');
  }
}

async function resetRiwayatOnly() {
  if (!await showConfirm("RESET RIWAYAT?\n\nTransaksi & sesi akan dihapus.\nKategori, Menu, Bahan tetap aman.")) return;
  
  const konfirmasi = await showPrompt("Ketik 'RESET' untuk konfirmasi");
  if (konfirmasi !== "RESET") {
    showToast("Reset dibatalkan", 'warning');
    return;
  }
  
  showToast("⏳ Menghapus riwayat...", 'warning');
  
  try {
    const trans = await dbCloud.collection("transactions").get();
    if (trans.size > 0) {
      const batchTrans = dbCloud.batch();
      trans.docs.forEach(doc => batchTrans.delete(doc.ref));
      await batchTrans.commit();
    }
    
    const sesi = await dbCloud.collection("sessions").get();
    if (sesi.size > 0) {
      const batchSesi = dbCloud.batch();
      sesi.docs.forEach(doc => batchSesi.delete(doc.ref));
      await batchSesi.commit();
    }
    
    const mutasi = await dbCloud.collection("stock_mutations").get();
    if (mutasi.size > 0) {
      const batchMutasi = dbCloud.batch();
      mutasi.docs.forEach(doc => batchMutasi.delete(doc.ref));
      await batchMutasi.commit();
    }
    
    state.transactions = [];
    state.allTransactions = [];
    state.sessions = [];
    state.currentSession = null;
    state.cart = [];
    state.selectedTable = null;
    state.cashAmount = 0;
    state.qrisAmount = 0;
    
    localStorage.removeItem("activeSession");
    localStorage.removeItem("printQueue");
    localStorage.removeItem("lastLowStockAlert");
    
    showToast("Riwayat berhasil direset!");
    
    setTimeout(() => {
      renderKasir();
    }, 1500);
    
  } catch (error) {
    console.error('Reset error:', error);
    showToast("Gagal reset: " + error.message, 'error');
  }
}

async function resetData() {
  if (!await showConfirm("RESET TOTAL DATABASE\n\nSEMUA data akan hilang!\nLanjutkan?")) return;
  
  const konfirmasi = await showPrompt("Ketik 'RESET TOTAL' untuk konfirmasi");
  if (konfirmasi !== "RESET TOTAL") {
    showToast("Reset dibatalkan", 'warning');
    return;
  }
  
  showToast("⏳ Menghapus SEMUA data...", 'warning');
  
  try {
    const trans = await dbCloud.collection("transactions").get();
    const batch1 = dbCloud.batch();
    trans.docs.forEach(d => batch1.delete(d.ref));
    await batch1.commit();
    
    const sesi = await dbCloud.collection("sessions").get();
    const batch2 = dbCloud.batch();
    sesi.docs.forEach(d => batch2.delete(d.ref));
    await batch2.commit();
    
    const menus = await dbCloud.collection("menus").get();
    const batch3 = dbCloud.batch();
    menus.docs.forEach(d => batch3.delete(d.ref));
    await batch3.commit();
    
    const kategori = await dbCloud.collection("categories").get();
    const batch4 = dbCloud.batch();
    kategori.docs.forEach(d => batch4.delete(d.ref));
    await batch4.commit();
    
    const bahan = await dbCloud.collection("raw_materials").get();
    const batch5 = dbCloud.batch();
    bahan.docs.forEach(d => batch5.delete(d.ref));
    await batch5.commit();
    
    const mutasi = await dbCloud.collection("stock_mutations").get();
    const batch6 = dbCloud.batch();
    mutasi.docs.forEach(d => batch6.delete(d.ref));
    await batch6.commit();
    
    const tables = await dbCloud.collection("tables").get();
    const batch7 = dbCloud.batch();
    tables.docs.forEach(d => batch7.delete(d.ref));
    await batch7.commit();
    
    const settings = await dbCloud.collection("settings").get();
    const batch8 = dbCloud.batch();
    settings.docs.forEach(d => batch8.delete(d.ref));
    await batch8.commit();
    
    state.transactions = [];
    state.allTransactions = [];
    state.sessions = [];
    state.menus = [];
    state.categories = [];
    state.rawMaterials = [];
    state.stockMutations = [];
    state.tables = [];
    state.settings = null;
    state.currentSession = null;
    state.cart = [];
    state.selectedTable = null;
    
    localStorage.clear();
    
    showToast("DATABASE berhasil direset!");
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('Reset total error:', error);
    showToast("Gagal reset total: " + error.message, 'error');
  }
}

window.renderSettings = renderSettings;
window.switchSettingsTab = switchSettingsTab;
window.saveTokoSettings = saveTokoSettings;
window.saveStrukSettings = saveStrukSettings;
window.saveMejaSettings = saveMejaSettings;
window.tambahMeja = tambahMeja;
window.toggleMejaStatus = toggleMejaStatus;
window.hapusMeja = hapusMeja;
window.exportToExcel = exportToExcel;
window.exportToPDF = exportToPDF;
window.importFromExcel = importFromExcel;
window.downloadTemplateExcel = downloadTemplateExcel;
window.resetRiwayatOnly = resetRiwayatOnly;
window.resetData = resetData;

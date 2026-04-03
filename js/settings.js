let currentSettingsTab = 'toko';
let lastSettingsScroll = 0;
let lastSettingsTabScroll = 0;

function renderSettings() {
  const _m = document.querySelector('main');
  if (_m && state.currentView === "settings") lastSettingsScroll = _m.scrollTop;

  const tabNav = document.querySelector('.tab-nav');
  if (tabNav && state.currentView === "settings") lastSettingsTabScroll = tabNav.scrollLeft;

  state.currentView = "settings";
  const content = `
    <div class="stack-y">
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
        <button class="tab-btn ${currentSettingsTab === 'kasir' ? 'active' : ''}" onclick="switchSettingsTab('kasir')">
          <i class="fas fa-users"></i> Kasir
        </button>
        <button class="tab-btn ${currentSettingsTab === 'backup' ? 'active' : ''}" onclick="switchSettingsTab('backup')">
          <i class="fas fa-database"></i> Backup
        </button>
      </div>
      <div id="settings-content" class="settings-content">
        ${renderSettingsTab()}
      </div>
    </div>
  `;
  app.innerHTML = Layout.renderMain(content);
  requestAnimationFrame(() => {
    const _main = document.querySelector('main');
    if (_main && lastSettingsScroll > 0) {
      _main.scrollTop = lastSettingsScroll;
    }
    const _tabNav = document.querySelector('.tab-nav');
    if (_tabNav && lastSettingsTabScroll > 0) {
      _tabNav.scrollLeft = lastSettingsTabScroll;
    }
  });
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
        <div class="form-group">
          <label class="form-label">Jam Buka Operasional</label>
          <input type="time" id="jamBukaOps" class="form-input" value="${s.operasional?.jamBuka || '08:00'}">
          <small class="text-muted operasional-info">
            <i class="fas fa-info-circle"></i>
            Dipakai untuk reset hari di Laporan.
          </small>
        </div>
        <button class="btn btn-primary" onclick="const b=this;Utils.setButtonLoading(b,true);saveTokoSettings().finally(()=>Utils.setButtonLoading(b,false))">
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
        <button class="btn btn-primary" onclick="const b=this;Utils.setButtonLoading(b,true);saveStrukSettings().finally(()=>Utils.setButtonLoading(b,false))">
          <i class="fas fa-save"></i> Simpan
        </button>
      </div>
    `;
  }
  if (currentSettingsTab === 'meja') {
    const mejaAll = SortableTable.sort(state.tables, 'meja');
    const mejaList = mejaAll.filter(t => t.aktif !== false);
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
          <button class="btn btn-primary" onclick="const b=this;Utils.setButtonLoading(b,true);tambahMeja().finally(()=>Utils.setButtonLoading(b,false))">
            <i class="fas fa-plus"></i> Tambah
          </button>
        </div>
        <table class="settings-table">
          <thead class="neu-table-head">
            <tr>
              <th class="td-base text-left cursor-pointer" onclick="sortMeja('nomor')">
                Nomor <i class="fas ${SortableTable.getSortIcon('meja', 'nomor')}"></i>
              </th>
              <th class="td-base text-left cursor-pointer" onclick="sortMeja('nama')">
                Nama <i class="fas ${SortableTable.getSortIcon('meja', 'nama')}"></i>
              </th>
              <th class="td-base text-left">Status</th>
              <th class="td-base text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${mejaList.map(m => `
              <tr>
                <td class="td-base">${m.nomor}</td>
                <td class="td-base">${m.nama}</td>
                <td class="td-base">
                  <span class="badge ${m.aktif ? 'badge-success' : 'badge-danger'}">
                    ${m.aktif ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td class="table-actions">
                  <button class="btn btn-sm btn-secondary" onclick="_saveSettingsScroll();const b=this;Utils.setButtonLoading(b,true);toggleMejaStatus('${m.id}').finally(()=>Utils.setButtonLoading(b,false))">
                    ${m.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button class="btn btn-sm btn-icon-sm" onclick="_saveSettingsScroll();editMeja('${m.id}')" title="Edit">
                    <i class="fas fa-edit text-muted"></i>
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="_saveSettingsScroll();const b=this;Utils.setButtonLoading(b,true);hapusMeja('${m.id}').finally(()=>Utils.setButtonLoading(b,false))">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <button class="btn btn-primary" onclick="const b=this;Utils.setButtonLoading(b,true);saveMejaSettings().finally(()=>Utils.setButtonLoading(b,false))">
          <i class="fas fa-save"></i> Simpan
        </button>
      </div>
    `;
  }
  if (currentSettingsTab === 'kasir') {
    const kasirRaw = (s.kasirs || []).map((k, i) => ({ ...k, _origIndex: i }));
    const kasirList = SortableTable.sort(kasirRaw, 'kasir');
    return `
      <div class="settings-card">
        <h3><i class="fas fa-users"></i> Manajemen Kasir</h3>
        <p class="text-muted mb-3">Daftar nama kasir yang bisa di-checklist saat membuka shift jaga.</p>
        <div class="add-row">
          <input type="text" id="newKasirNama" class="form-input" placeholder="Tuliskan nama kasir (contoh: Andi)">
          <button class="btn btn-primary" onclick="_saveSettingsScroll();const b=this;Utils.setButtonLoading(b,true);tambahKasir().finally(()=>Utils.setButtonLoading(b,false))">
            <i class="fas fa-plus"></i> Tambah
          </button>
        </div>
        <table class="settings-table">
          <thead class="neu-table-head">
            <tr>
              <th class="td-base text-left cursor-pointer" onclick="sortKasir('nama')">
                Nama <i class="fas ${SortableTable.getSortIcon('kasir', 'nama')}"></i>
              </th>
              <th class="td-base text-left cursor-pointer" onclick="sortKasir('aktif')">
                Status <i class="fas ${SortableTable.getSortIcon('kasir', 'aktif')}"></i>
              </th>
              <th class="td-base text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${kasirList.map(k => `
              <tr>
                <td class="td-base">${k.nama}</td>
                <td class="td-base">
                  <span class="badge ${k.aktif !== false ? 'badge-success' : 'badge-danger'}">
                    ${k.aktif !== false ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td class="table-actions">
                  <button class="btn btn-sm btn-secondary" onclick="_saveSettingsScroll();const b=this;Utils.setButtonLoading(b,true);toggleKasirStatus(${k._origIndex}).finally(()=>Utils.setButtonLoading(b,false))">
                    ${k.aktif !== false ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button class="btn btn-sm btn-icon-sm" onclick="_saveSettingsScroll();editKasir(${k._origIndex})" title="Edit">
                    <i class="fas fa-edit text-muted"></i>
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="_saveSettingsScroll();const b=this;Utils.setButtonLoading(b,true);hapusKasir(${k._origIndex}).finally(()=>Utils.setButtonLoading(b,false))">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
            ${kasirList.length === 0 ? '<tr><td colspan="3" class="text-center text-muted">Belum ada kasir terdaftar</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    `;
  }
  if (currentSettingsTab === 'backup') {
    const hasActiveShift = !!state.currentSession;
    return `
      <div class="settings-card">
        <h3><i class="fas fa-database"></i> Backup & Restore</h3>
        <div class="backup-grid">
          <div class="backup-card">
            <div class="backup-icon">
              <i class="fas fa-file-pdf"></i>
            </div>
            <h4>Export PDF (Shift Aktif)</h4>
            <p>Download laporan shift yang sedang berjalan</p>
            <button class="btn btn-primary" onclick="const b=this;Utils.setButtonLoading(b,true);exportToPDFShift().finally(()=>Utils.setButtonLoading(b,false))" ${!hasActiveShift ? 'disabled' : ''}>
              <i class="fas fa-download"></i> Export
            </button>
            ${!hasActiveShift ? '<small class="text-muted mt-1">*Buka shift terlebih dahulu</small>' : ''}
          </div>
          <div class="backup-card">
            <div class="backup-icon">
              <i class="fas fa-file-pdf"></i>
            </div>
            <h4>Export PDF (Semua Data)</h4>
            <p>Download laporan semua transaksi</p>
            <button class="btn btn-primary" onclick="const b=this;Utils.setButtonLoading(b,true);exportToPDFAll().finally(()=>Utils.setButtonLoading(b,false))">
              <i class="fas fa-download"></i> Export
            </button>
          </div>
          <div class="backup-card">
            <div class="backup-icon">
              <i class="fas fa-file-import"></i>
            </div>
            <h4>Import Excel</h4>
            <p>Import menu & bahan</p>
            <input type="file" id="importExcelFile" accept=".xlsx,.xls" class="file-input-spaced">
            <button class="btn btn-primary" onclick="const b=this;Utils.setButtonLoading(b,true);importFromExcel().finally(()=>Utils.setButtonLoading(b,false))">
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
            <button class="btn btn-warning" onclick="const b=this;Utils.setButtonLoading(b,true);resetRiwayatOnly().finally(()=>Utils.setButtonLoading(b,false))">
              <i class="fas fa-trash-alt"></i> Reset
            </button>
          </div>
          <div class="backup-card danger">
            <div class="backup-icon">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h4>Reset Total</h4>
            <p>Hapus SEMUA data!<br>Termasuk menu & bahan</p>
            <button class="btn btn-danger" onclick="const b=this;Utils.setButtonLoading(b,true);resetData().finally(()=>Utils.setButtonLoading(b,false))">
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
  const _m = document.querySelector('main');
  if (_m && currentSettingsTab === tab) _saveSettingsScroll(); else lastSettingsScroll = 0;
  currentSettingsTab = tab;
  renderSettings();
}

function _saveSettingsScroll() {
  const _m = document.querySelector('main');
  if (_m) lastSettingsScroll = _m.scrollTop;
}

async function saveTokoSettings() {
  _saveSettingsScroll();
  try {
    const tokoData = {
      nama: document.getElementById('tokoNama').value,
      alamat: document.getElementById('tokoAlamat').value,
      telepon: document.getElementById('tokoTelepon').value,
      email: document.getElementById('tokoEmail').value
    };
    const jamBuka = document.getElementById('jamBukaOps')?.value || '08:00';

    await dbCloud.collection("settings").doc("toko").update({
      toko: tokoData,
      operasional: { jamBuka }
    });

    state.settings.toko = tokoData;
    if (!state.settings.operasional) state.settings.operasional = {};
    state.settings.operasional.jamBuka = jamBuka;

    Utils.showToast("Pengaturan disimpan");
  } catch (error) {
    Utils.showToast("Gagal: " + error.message, 'error');
  }
}

async function saveStrukSettings() {
  _saveSettingsScroll();
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
    Utils.showToast("Pengaturan disimpan");
  } catch (error) {
    Utils.showToast("Gagal: " + error.message, 'error');
  }
}

async function tambahMeja() {
  _saveSettingsScroll();
  const nomor = document.getElementById('newMejaNomor').value;
  const nama = document.getElementById('newMejaNama').value;
  if (!nomor || !nama) {
    Utils.showToast("Nomor dan nama harus diisi", 'error');
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
    Utils.showToast("Meja ditambahkan");
  } catch (error) {
    Utils.showToast("Gagal: " + error.message, 'error');
  }
}

async function toggleMejaStatus(id) {
  _saveSettingsScroll();
  const meja = state.tables.find(t => t.id === id);
  if (!meja) return;
  try {
    await dbCloud.collection("tables").doc(id).update({
      aktif: !meja.aktif
    });
    Utils.showToast(`Meja ${!meja.aktif ? 'diaktifkan' : 'dinonaktifkan'}`);
  } catch (error) {
    Utils.showToast("Gagal: " + error.message, 'error');
  }
}

async function hapusMeja(id) {
  _saveSettingsScroll();
  if (!await Utils.showConfirm("Hapus meja ini?")) return;
  try {
    await dbCloud.collection("tables").doc(id).delete();
    Utils.showToast("Meja dihapus");
  } catch (error) {
    Utils.showToast("Gagal: " + error.message, 'error');
  }
}

async function saveMejaSettings() {
  _saveSettingsScroll();
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
    Utils.showToast("Pengaturan disimpan");
  } catch (error) {
    Utils.showToast("Gagal: " + error.message, 'error');
  }
}

async function exportToPDFShift() {
  if (!state.currentSession) {
    Utils.showToast("Tidak ada shift aktif!", 'warning');
    return;
  }

  const transactions = state.transactions.filter(t => t.sessionId === state.currentSession.id);
  const totalTransaksi = transactions.length;
  const totalPenjualan = transactions.reduce((s, t) => s + t.total, 0);
  const totalCash = transactions.reduce((s, t) => s + (t.cashAmount || (t.metodeBayar === 'tunai' ? t.total : 0)), 0);
  const totalQRIS = transactions.reduce((s, t) => s + (t.qrisAmount || (t.metodeBayar === 'qris' ? t.total : 0)), 0);
  const totalPengeluaran = state.pengeluaran?.filter(p => p.sessionId === state.currentSession.id)?.reduce((s, p) => s + (p.nominal || 0), 0) || 0;
  const cashBersih = totalCash - totalPengeluaran;
  const pengeluaranList = state.pengeluaran?.filter(p => p.sessionId === state.currentSession.id) || [];

  const produkCount = {};
  transactions.forEach(t => {
    t.items.forEach(i => {
      if (!produkCount[i.name]) produkCount[i.name] = { qty: 0, total: 0 };
      produkCount[i.name].qty += i.qty;
      produkCount[i.name].total += i.price * i.qty;
    });
  });
  const topProducts = Object.entries(produkCount).sort((a, b) => b[1].qty - a[1].qty);

  const waktuBuka = state.currentSession.waktuBuka?.seconds ? new Date(state.currentSession.waktuBuka.seconds * 1000) : new Date(state.currentSession.waktuBuka);

  await generatePDF({
    title: `LAPORAN SHIFT ${state.currentSession.shift}`,
    subtitle: `Kasir: ${state.currentSession.kasir} | Dicetak: ${new Date().toLocaleString('id-ID')}`,
    totalTransaksi,
    totalPenjualan,
    totalCash,
    totalQRIS,
    totalPengeluaran,
    cashBersih,
    pengeluaranList,
    topProducts,
    filename: `gariswaktu_laporan_shift_${state.currentSession.shift}_${new Date().toISOString().slice(0, 10)}.pdf`
  });
}

async function exportToPDFAll() {
  const totalTransaksi = state.allTransactions?.length || 0;
  const totalPenjualan = state.allTransactions?.reduce((s, t) => s + t.total, 0) || 0;
  const totalCash = state.allTransactions?.reduce((s, t) => s + (t.cashAmount || (t.metodeBayar === 'tunai' ? t.total : 0)), 0) || 0;
  const totalQRIS = state.allTransactions?.reduce((s, t) => s + (t.qrisAmount || (t.metodeBayar === 'qris' ? t.total : 0)), 0) || 0;
  const totalPengeluaran = state.pengeluaran?.reduce((s, p) => s + (p.nominal || 0), 0) || 0;
  const cashBersih = totalCash - totalPengeluaran;
  const pengeluaranList = state.pengeluaran || [];

  const produkCount = {};
  state.allTransactions?.forEach(t => {
    t.items.forEach(i => {
      if (!produkCount[i.name]) produkCount[i.name] = { qty: 0, total: 0 };
      produkCount[i.name].qty += i.qty;
      produkCount[i.name].total += i.price * i.qty;
    });
  });
  const topProducts = Object.entries(produkCount).sort((a, b) => b[1].qty - a[1].qty);

  const lowStock = state.rawMaterials?.filter(b => b.stock <= (b.minStock || 5)) || [];

  await generatePDF({
    title: 'LAPORAN HARIAN GARIS WAKTU',
    subtitle: `Periode: Seluruh Shift | Dicetak: ${new Date().toLocaleString('id-ID')}`,
    totalTransaksi,
    totalPenjualan,
    totalCash,
    totalQRIS,
    totalPengeluaran,
    cashBersih,
    pengeluaranList,
    topProducts,
    lowStock,
    filename: `gariswaktu_laporan_harian_${new Date().toISOString().slice(0, 10)}.pdf`
  });
}

async function generatePDF(data) {
  try {
    const { jsPDF } = window.jspdf;

    const rowH = 7;
    const headH = 8;
    const sectionH = 12;
    const headerH = 30;

    let estH = headerH;
    estH += sectionH + 5 * rowH;
    estH += sectionH + (data.topProducts.length > 0 ? headH + data.topProducts.length * rowH : rowH);
    if (data.pengeluaranList.length > 0) estH += sectionH + headH + data.pengeluaranList.length * rowH;
    if (data.lowStock && data.lowStock.length > 0) estH += sectionH + headH + data.lowStock.length * rowH;
    estH += 20;

    const PAGE_H = 297;
    const scale = estH <= PAGE_H ? 1 : Math.max(0.45, PAGE_H / estH);
    const fontSize = s => Math.max(6, Math.round(s * scale));
    const pad = s => Math.max(1, s * scale);
    const sp = s => s * scale;

    const doc = new jsPDF({ format: [210, PAGE_H] });
    const PW = 210;
    const ML = sp(14);
    const MR = sp(14);
    let y = sp(12);

    doc.setFontSize(fontSize(18));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text(data.title, PW / 2, y, { align: 'center' });
    y += sp(7);

    doc.setFontSize(fontSize(8));
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(data.subtitle, PW / 2, y, { align: 'center' });
    y += sp(5);

    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.4);
    doc.line(ML, y, PW - MR, y);
    y += sp(8);

    const section = (label) => {
      doc.setFontSize(fontSize(11));
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text(label, ML, y);
      y += sp(6);
    };

    const tableOpts = (extra) => ({
      styles: { fontSize: fontSize(8.5), cellPadding: pad(2.5) },
      margin: { left: ML, right: MR },
      tableWidth: PW - ML - MR,
      ...extra
    });

    section('RINGKASAN');
    const ringkasanBody = [
      ['Total Transaksi', `${data.totalTransaksi} transaksi`],
      ['Total Cash', `Rp ${Utils.formatRupiah(data.totalCash)}`],
      ['Total Qris', `Rp ${Utils.formatRupiah(data.totalQRIS)}`],
      ['Total Penjualan', `Rp ${Utils.formatRupiah(data.totalPenjualan)}`],
    ];
    if (data.totalPengeluaran > 0) {
      ringkasanBody.push(['Total Pengeluaran', `-Rp ${Utils.formatRupiah(data.totalPengeluaran)}`]);
      ringkasanBody.push(['Cash Bersih', `Rp ${Utils.formatRupiah(data.cashBersih)}`]);
    }

    doc.autoTable(tableOpts({
      startY: y,
      body: ringkasanBody,
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: (PW - ML - MR) * 0.45 },
        1: { halign: 'right' }
      },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      didParseCell(data) {
        if (data.totalPengeluaran > 0) {
          if (data.row.index === ringkasanBody.length - 2) data.cell.styles.textColor = [220, 38, 38];
          if (data.row.index === ringkasanBody.length - 1) {
            data.cell.styles.textColor = [5, 150, 105];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    }));
    y = doc.lastAutoTable.finalY + sp(10);

    section('PRODUK TERJUAL');
    if (data.topProducts.length > 0) {
      const cw = PW - ML - MR;
      doc.autoTable(tableOpts({
        startY: y,
        head: [['Nama Produk', 'Terjual', 'Total Penjualan']],
        body: data.topProducts.map(([name, data]) => [name, `${data.qty} pcs`, `Rp ${Utils.formatRupiah(data.total)}`]),
        headStyles: { fillColor: [30, 58, 138], fontStyle: 'bold', fontSize: fontSize(8.5) },
        columnStyles: {
          0: { cellWidth: cw * 0.55 },
          1: { halign: 'center', cellWidth: cw * 0.18 },
          2: { halign: 'right', cellWidth: cw * 0.27 }
        },
        theme: 'striped',
      }));
      y = doc.lastAutoTable.finalY + sp(10);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize(9));
      doc.setTextColor(120, 120, 120);
      doc.text('Belum ada data penjualan', ML + sp(4), y);
      y += sp(10);
    }

    if (data.pengeluaranList.length > 0) {
      section('PENGELUARAN');
      const cw = PW - ML - MR;
      doc.autoTable(tableOpts({
        startY: y,
        head: [['Nama Pengeluaran', 'Nominal']],
        body: data.pengeluaranList.map(p => [p.nama, `Rp ${Utils.formatRupiah(p.nominal)}`]),
        headStyles: { fillColor: [220, 38, 38], fontStyle: 'bold', fontSize: fontSize(8.5) },
        columnStyles: {
          0: { cellWidth: cw * 0.72 },
          1: { halign: 'right', cellWidth: cw * 0.28 }
        },
        theme: 'striped',
      }));
      y = doc.lastAutoTable.finalY + sp(10);
    }

    if (data.lowStock && data.lowStock.length > 0) {
      section('BAHAN STOK MENIPIS');
      const cw = PW - ML - MR;
      doc.autoTable(tableOpts({
        startY: y,
        head: [['Nama Bahan', 'Stok', 'Min. Stok', 'Satuan']],
        body: data.lowStock.map(b => [b.name, b.stock, b.minStock || 5, b.satuan || 'pcs']),
        headStyles: { fillColor: [217, 119, 6], fontStyle: 'bold', fontSize: fontSize(8.5) },
        columnStyles: {
          0: { cellWidth: cw * 0.46 },
          1: { halign: 'center', cellWidth: cw * 0.18 },
          2: { halign: 'center', cellWidth: cw * 0.18 },
          3: { halign: 'center', cellWidth: cw * 0.18 }
        },
        theme: 'striped',
      }));
    }

    doc.save(data.filename);
    Utils.showToast('PDF berhasil diekspor');
  } catch (error) {
    Utils.showToast('Gagal: ' + error.message, 'error');
  }
}

async function importFromExcel() {
  const file = document.getElementById('importExcelFile')?.files[0];
  if (!file) {
    Utils.showToast("Pilih file Excel", 'error');
    return;
  }
  if (!await Utils.showConfirm("Import akan menimpa data menu & bahan. Lanjutkan?")) return;
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
    Utils.showToast(`Import berhasil (${importCount} data)`);
    setTimeout(() => location.reload(), 2000);
  } catch (error) {
    Utils.showToast("Gagal: " + error.message, 'error');
  }
}

function downloadTemplateExcel() {
  try {
    const wb = XLSX.utils.book_new();
    const menuTemplate = [
      { 'Nama Menu': 'Nasi Goreng', 'Harga': 15000, 'Kategori': 'Makanan', 'Gunakan Stok': 'TRUE', 'Stok': 50 },
      { 'Nama Menu': 'Es Teh', 'Harga': 5000, 'Kategori': 'Minuman', 'Gunakan Stok': 'FALSE', 'Stok': 0 }
    ];
    const bahanTemplate = [
      { 'Nama Bahan': 'Tepung', 'Satuan': 'kg', 'Stok Awal': 25, 'Minimal Stok': 5 },
      { 'Nama Bahan': 'Telur', 'Satuan': 'pcs', 'Stok Awal': 100, 'Minimal Stok': 20 }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(menuTemplate), "Menu");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bahanTemplate), "Bahan");
    XLSX.writeFile(wb, "template_import_gariswaktu.xlsx");
    Utils.showToast("Template didownload");
  } catch (error) {
    Utils.showToast("Gagal: " + error.message, 'error');
  }
}

async function resetRiwayatOnly() {
  if (!await Utils.showConfirm("RESET RIWAYAT?\n\nTransaksi & sesi akan dihapus.\nKategori, Menu, Bahan tetap aman.")) return;
  const konfirmasi = await Utils.showPrompt("Ketik 'RESET' untuk konfirmasi");
  if (konfirmasi !== "RESET") {
    Utils.showToast("Reset dibatalkan", 'warning');
    return;
  }
  Utils.showToast("⏳ Menghapus riwayat...", 'warning');
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
    const pengeluaran = await dbCloud.collection("pengeluaran").get();
    if (pengeluaran.size > 0) {
      const batchPengeluaran = dbCloud.batch();
      pengeluaran.docs.forEach(doc => batchPengeluaran.delete(doc.ref));
      await batchPengeluaran.commit();
    }
    state.transactions = [];
    state.allTransactions = [];
    state.sessions = [];
    state.pengeluaran = [];
    state.currentSession = null;
    state.cart = [];
    state.selectedTable = null;
    state.cashAmount = 0;
    state.qrisAmount = 0;
    localStorage.removeItem("activeSession");
    localStorage.removeItem("lastLowStockAlert");
    Utils.showToast("Riwayat berhasil direset!");
    setTimeout(() => {
      renderKasir();
    }, 1500);
  } catch (error) {
    Utils.showToast("Gagal reset: " + error.message, 'error');
  }
}

async function resetData() {
  if (!await Utils.showConfirm("RESET TOTAL DATABASE\n\nSEMUA data akan hilang!\nLanjutkan?")) return;
  const konfirmasi = await Utils.showPrompt("Ketik 'RESET TOTAL' untuk konfirmasi");
  if (konfirmasi !== "RESET TOTAL") {
    Utils.showToast("Reset dibatalkan", 'warning');
    return;
  }
  Utils.showToast("⏳ Menghapus SEMUA data...", 'warning');
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
    const pengeluaranAll = await dbCloud.collection("pengeluaran").get();
    const batch9 = dbCloud.batch();
    pengeluaranAll.docs.forEach(d => batch9.delete(d.ref));
    await batch9.commit();
    state.transactions = [];
    state.allTransactions = [];
    state.sessions = [];
    state.menus = [];
    state.categories = [];
    state.rawMaterials = [];
    state.stockMutations = [];
    state.tables = [];
    state.settings = null;
    state.pengeluaran = [];
    state.currentSession = null;
    state.cart = [];
    state.selectedTable = null;
    localStorage.clear();
    Utils.showToast("DATABASE berhasil direset!");
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (error) {
    Utils.showToast("Gagal reset total: " + error.message, 'error');
  }
}

function sortMeja(field) {
  _saveSettingsScroll();
  SortableTable.toggle('meja', field);
  renderSettings();
}

function sortKasir(field) {
  _saveSettingsScroll();
  SortableTable.toggle('kasir', field);
  renderSettings();
}

async function editKasir(index) {
  const kasirs = state.settings?.kasirs || [];
  const kData = kasirs[index];
  if (!kData) return;

  const newName = await Utils.showPrompt(`Ubah Nama Kasir "${kData.nama}"`, kData.nama);
  if (!newName || newName.trim() === '' || newName === kData.nama) return;

  if (kasirs.find((k, i) => i !== index && k.nama.toLowerCase() === newName.trim().toLowerCase())) {
    Utils.showToast("Nama kasir tersebut sudah ada!", 'warning');
    return;
  }

  const newArr = [...kasirs];
  newArr[index].nama = newName.trim();
  _saveSettingsScroll();
  await saveKasirSettings(newArr);
  Utils.showToast("Nama kasir diperbarui");
}

async function editMeja(id) {
  const meja = state.tables.find(m => m.id === id);
  if (!meja) return;

  const result = await Utils.showModal({
    title: 'Edit Meja',
    content: `
          <div class="form-group">
            <label class="form-label">Nomor Meja</label>
            <input type="text" id="editMejaNomor" class="form-input" value="${meja.nomor}">
          </div>
          <div class="form-group">
            <label class="form-label">Nama/Keterangan</label>
            <input type="text" id="editMejaNama" class="form-input" value="${meja.nama}">
          </div>
        `,
    buttons: [
      { text: 'Batal', action: 'cancel', class: 'btn-secondary' },
      {
        text: 'Simpan', action: 'save', class: 'btn-primary', onClick: () => {
          window._eM_nomor = document.getElementById('editMejaNomor').value;
          window._eM_nama = document.getElementById('editMejaNama').value;
        }
      }
    ]
  });

  if (result === 'save') {
    const nr = window._eM_nomor;
    const nm = window._eM_nama;
    delete window._eM_nomor;
    delete window._eM_nama;
    if (!nr && !nm) return;

    _saveSettingsScroll();
    try {
      await dbCloud.collection("tables").doc(id).update({
        nomor: nr || meja.nomor,
        nama: nm || meja.nama
      });
      const stItem = state.tables.find(m => m.id === id);
      if (stItem) { stItem.nomor = nr; stItem.nama = nm; }
      Utils.showToast("Meja berhasil diupdate");
      renderSettings();
    } catch (e) {
      Utils.showToast("Gagal update meja: " + e.message, 'error');
    }
  }
}

async function saveKasirSettings(kasirs) {
  try {
    await dbCloud.collection("settings").doc("toko").update({ kasirs });
    state.settings.kasirs = kasirs;
    renderSettings();
  } catch (e) {
    Utils.showToast("Gagal simpan kasir: " + e.message, 'error');
  }
}

async function tambahKasir() {
  const nama = document.getElementById('newKasirNama').value.trim();
  if (!nama) return;
  const currentKasirs = state.settings?.kasirs || [];
  if (currentKasirs.find(k => k.nama.toLowerCase() === nama.toLowerCase())) {
    Utils.showToast("Nama kasir sudah ada!", 'warning');
    return;
  }
  const kasirs = [...currentKasirs, { nama, aktif: true }];
  await saveKasirSettings(kasirs);
  Utils.showToast("Kasir ditambah");
}

async function toggleKasirStatus(index) {
  const kasirs = [...(state.settings?.kasirs || [])];
  if (kasirs[index]) {
    kasirs[index].aktif = kasirs[index].aktif === false ? true : false;
    await saveKasirSettings(kasirs);
  }
}

async function hapusKasir(index) {
  const ok = await Utils.showConfirm("Hapus kasir ini?");
  if (ok) {
    const kasirs = [...(state.settings?.kasirs || [])];
    kasirs.splice(index, 1);
    await saveKasirSettings(kasirs);
    Utils.showToast("Kasir dihapus");
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
window.sortMeja = sortMeja;
window.editMeja = editMeja;
window.tambahKasir = tambahKasir;
window.toggleKasirStatus = toggleKasirStatus;
window.hapusKasir = hapusKasir;
window.sortKasir = sortKasir;
window.editKasir = editKasir;
window.exportToPDFShift = exportToPDFShift;
window.exportToPDFAll = exportToPDFAll;
window.importFromExcel = importFromExcel;
window.downloadTemplateExcel = downloadTemplateExcel;
window.resetRiwayatOnly = resetRiwayatOnly;
window.resetData = resetData;
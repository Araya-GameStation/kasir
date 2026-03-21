let currentSettingsTab = 'toko';

let lastSettingsScroll = 0;

function renderSettings() {
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
              <th class="p-3 text-left cursor-pointer" onclick="sortMeja('nomor')">
                Nomor <i class="fas ${SortableTable.getSortIcon('meja', 'nomor')}"></i>
              </th>
              <th class="p-3 text-left cursor-pointer" onclick="sortMeja('nama')">
                Nama <i class="fas ${SortableTable.getSortIcon('meja', 'nama')}"></i>
              </th>
              <th class="p-3 text-left">Status</th>
              <th class="p-3 text-left">Aksi</th>
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
        <button class="btn btn-primary" onclick="const b=this;Utils.setButtonLoading(b,true);saveMejaSettings().finally(()=>Utils.setButtonLoading(b,false))">
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
            <p>Download laporan ringkasan</p>
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
        Utils.showToast("Pengaturan disimpan");
    } catch (error) {
        Utils.showToast("Gagal: " + error.message, 'error');
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
        Utils.showToast("Pengaturan disimpan");
    } catch (error) {
        Utils.showToast("Gagal: " + error.message, 'error');
    }
}

async function tambahMeja() {
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
    if (!await Utils.showConfirm("Hapus meja ini?")) return;
    try {
        await dbCloud.collection("tables").doc(id).delete();
        Utils.showToast("Meja dihapus");
    } catch (error) {
        Utils.showToast("Gagal: " + error.message, 'error');
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
        Utils.showToast("Pengaturan disimpan");
    } catch (error) {
        Utils.showToast("Gagal: " + error.message, 'error');
    }
}

function exportToExcel() {
    try {
        const wb = XLSX.utils.book_new();

        const totalTransaksi   = state.allTransactions?.length || 0;
        const totalPenjualan   = state.allTransactions?.reduce((s, t) => s + t.total, 0) || 0;
        const totalCash        = state.allTransactions?.reduce((s, t) => s + (t.cashAmount || (t.metodeBayar === 'tunai' ? t.total : 0)), 0) || 0;
        const totalQRIS        = state.allTransactions?.reduce((s, t) => s + (t.qrisAmount || (t.metodeBayar === 'qris' ? t.total : 0)), 0) || 0;
        const totalPengeluaran = state.pengeluaran?.reduce((s, p) => s + (p.nominal || 0), 0) || 0;
        const kasBersih        = totalCash - totalPengeluaran;

        const rows = [];

        rows.push({ A: 'LAPORAN GARIS WAKTU' });
        rows.push({ A: `Dicetak: ${new Date().toLocaleString('id-ID')}` });
        rows.push({});

        rows.push({ A: '== RINGKASAN ==' });
        rows.push({ A: 'Total Transaksi',   B: totalTransaksi });
        rows.push({ A: 'Total Cash',        B: totalCash });
        rows.push({ A: 'Total QRIS',        B: totalQRIS });
        rows.push({ A: 'Total Penjualan',   B: totalPenjualan });
        if (totalPengeluaran > 0) {
            rows.push({ A: 'Total Pengeluaran', B: -totalPengeluaran });
            rows.push({ A: 'Kas Bersih',        B: kasBersih });
        }
        rows.push({});

        rows.push({ A: '== PRODUK TERLARIS ==' });
        rows.push({ A: 'Nama Produk', B: 'Jumlah Terjual', C: 'Total Penjualan' });
        const produkTerjual = {};
        state.allTransactions?.forEach(t => {
            t.items.forEach(i => {
                if (!produkTerjual[i.name]) produkTerjual[i.name] = { qty: 0, total: 0 };
                produkTerjual[i.name].qty   += i.qty;
                produkTerjual[i.name].total += i.price * i.qty;
            });
        });
        Object.entries(produkTerjual)
            .sort((a, b) => b[1].qty - a[1].qty)
            .forEach(([nama, data]) => {
                rows.push({ A: nama, B: data.qty, C: data.total });
            });
        rows.push({});

        const pengeluaranList = state.pengeluaran || [];
        if (pengeluaranList.length > 0) {
            rows.push({ A: '== PENGELUARAN ==' });
            rows.push({ A: 'Nama Pengeluaran', B: 'Nominal' });
            pengeluaranList.forEach(p => {
                rows.push({ A: p.nama, B: p.nominal });
            });
            rows.push({ A: 'Total', B: totalPengeluaran });
            rows.push({});
        }

        const lowStock = state.rawMaterials?.filter(b => b.stock <= (b.minStock || 5)) || [];
        rows.push({ A: '== BAHAN STOK MENIPIS ==' });
        if (lowStock.length > 0) {
            rows.push({ A: 'Nama Bahan', B: 'Stok', C: 'Min. Stok', D: 'Satuan' });
            lowStock.forEach(b => {
                rows.push({ A: b.name, B: b.stock, C: b.minStock || 5, D: b.satuan || 'pcs' });
            });
        } else {
            rows.push({ A: 'Semua stok aman' });
        }

        const ws = XLSX.utils.json_to_sheet(rows, { header: ['A','B','C','D'], skipHeader: true });

        ws['!cols'] = [
            { wch: 35 },
            { wch: 20 },
            { wch: 20 },
            { wch: 12 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
        XLSX.writeFile(wb, `gariswaktu_laporan_${new Date().toISOString().slice(0, 10)}.xlsx`);
        Utils.showToast('Excel diekspor');
    } catch (error) {
        console.error('Export error:', error);
        Utils.showToast('Gagal: ' + error.message, 'error');
    }
}

function exportToPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const PW = 210;
        const ML = 14;
        const MR = 14;
        let y = 15;

        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text('LAPORAN GARIS WAKTU', PW / 2, y, { align: 'center' });
        y += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, PW / 2, y, { align: 'center' });
        y += 6;
        doc.setDrawColor(30, 58, 138);
        doc.setLineWidth(0.5);
        doc.line(ML, y, PW - MR, y);
        y += 10;

        const totalTransaksi  = state.allTransactions?.length || 0;
        const totalPenjualan  = state.allTransactions?.reduce((s, t) => s + t.total, 0) || 0;
        const totalCash       = state.allTransactions?.reduce((s, t) => s + (t.cashAmount || (t.metodeBayar === 'tunai' ? t.total : 0)), 0) || 0;
        const totalQRIS       = state.allTransactions?.reduce((s, t) => s + (t.qrisAmount || (t.metodeBayar === 'qris' ? t.total : 0)), 0) || 0;
        const totalPengeluaran = state.pengeluaran?.reduce((s, p) => s + (p.nominal || 0), 0) || 0;
        const kasBersih       = totalCash - totalPengeluaran;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text('RINGKASAN', ML, y);
        y += 7;

        const ringkasanBody = [
            ['Total Transaksi', `${totalTransaksi} transaksi`],
            ['Total Cash',      `Rp ${Utils.formatRupiah(totalCash)}`],
            ['Total Qris',      `Rp ${Utils.formatRupiah(totalQRIS)}`],
            ['Total Penjualan', `Rp ${Utils.formatRupiah(totalPenjualan)}`],
        ];
        if (totalPengeluaran > 0) {
            ringkasanBody.push(['Total Pengeluaran', `-Rp ${Utils.formatRupiah(totalPengeluaran)}`]);
            ringkasanBody.push(['Cash Bersih',        `Rp ${Utils.formatRupiah(kasBersih)}`]);
        }
        doc.autoTable({
            startY: y,
            body: ringkasanBody,
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 60 },
                1: { halign: 'right' }
            },
            styles: { fontSize: 10, cellPadding: 3 },
            tableWidth: 182,
            alternateRowStyles: { fillColor: [245, 247, 255] },
            didParseCell(data) {
                if (totalPengeluaran > 0) {
                    if (data.row.index === ringkasanBody.length - 2) {
                        data.cell.styles.textColor = [220, 38, 38];
                    }
                    if (data.row.index === ringkasanBody.length - 1) {
                        data.cell.styles.textColor = [5, 150, 105];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            },
            margin: { left: ML, right: MR }
        });
        y = doc.lastAutoTable.finalY + 12;

        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text('PRODUK TERLARIS', ML, y);
        y += 7;

        const produkCount = {};
        state.allTransactions?.forEach(t => {
            t.items.forEach(i => {
                if (!produkCount[i.name]) produkCount[i.name] = { qty: 0, total: 0 };
                produkCount[i.name].qty   += i.qty;
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
                    `${data.qty} pcs`,
                    `Rp ${Utils.formatRupiah(data.total)}`
                ]),
                theme: 'striped',
                headStyles: { fillColor: [30, 58, 138], fontStyle: 'bold', fontSize: 9.5 },
                columnStyles: {
                    0: { cellWidth: 100 },
                    1: { halign: 'center', cellWidth: 30 },
                    2: { halign: 'right', cellWidth: 50 }
                },
                styles: { fontSize: 9.5, cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
                margin: { left: ML, right: MR }
            });
            y = doc.lastAutoTable.finalY + 12;
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(120, 120, 120);
            doc.text('Belum ada data penjualan', ML + 6, y);
            y += 12;
        }

        const pengeluaranList = state.pengeluaran || [];
        if (pengeluaranList.length > 0) {
            if (y > 240) { doc.addPage(); y = 20; }
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 58, 138);
            doc.text('PENGELUARAN', ML, y);
            y += 7;
            doc.autoTable({
                startY: y,
                head: [['Nama Pengeluaran', 'Nominal']],
                body: pengeluaranList.map(p => [
                    p.nama,
                    `Rp ${Utils.formatRupiah(p.nominal)}`
                ]),
                theme: 'striped',
                headStyles: { fillColor: [220, 38, 38], fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 130 },
                    1: { halign: 'right', cellWidth: 52 }
                },
                tableWidth: 182,
                styles: { fontSize: 9.5, cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
                margin: { left: ML, right: MR }
            });
            y = doc.lastAutoTable.finalY + 12;
        }

        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text('BAHAN STOK MENIPIS', ML, y);
        y += 7;

        const lowStock = state.rawMaterials?.filter(b => b.stock <= (b.minStock || 5)) || [];
        if (lowStock.length > 0) {
            doc.autoTable({
                startY: y,
                head: [['Nama Bahan', 'Stok', 'Min. Stok', 'Satuan']],
                body: lowStock.map(b => [
                    b.name,
                    b.stock,
                    b.minStock || 5,
                    b.satuan || 'pcs'
                ]),
                theme: 'striped',
                headStyles: { fillColor: [217, 119, 6], fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { halign: 'center', cellWidth: 36 },
                    2: { halign: 'center', cellWidth: 36 },
                    3: { halign: 'center', cellWidth: 30 }
                },
                tableWidth: 182,
                styles: { fontSize: 9.5, cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
                margin: { left: ML, right: MR }
            });
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(5, 150, 105);
            doc.text('Semua stok aman ✓', ML + 6, y);
        }

        doc.save(`gariswaktu_laporan_${new Date().toISOString().slice(0, 10)}.pdf`);
        Utils.showToast('PDF diekspor');
    } catch (error) {
        console.error('PDF error:', error);
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
        console.error('Reset error:', error);
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
        console.error('Reset total error:', error);
        Utils.showToast("Gagal reset total: " + error.message, 'error');
    }
}

function sortMeja(field) {
    const _m = document.querySelector('main'); if (_m) lastSettingsScroll = _m.scrollTop;
    SortableTable.toggle('meja', field);
    renderSettings();
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
window.exportToExcel = exportToExcel;
window.exportToPDF = exportToPDF;
window.importFromExcel = importFromExcel;
window.downloadTemplateExcel = downloadTemplateExcel;
window.resetRiwayatOnly = resetRiwayatOnly;
window.resetData = resetData;
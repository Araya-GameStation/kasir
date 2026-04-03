let _laporanMode = 'harian';
let _laporanOffset = 0;

function renderLaporan() {
  state.currentView = 'laporan';
  const content = `
    <div class="stack-y">
      <div class="laporan-tab-bar">
        ${['harian','mingguan','bulanan','shift'].map(m => `
          <button class="tab-btn ${_laporanMode === m ? 'active' : ''}" onclick="window._setLaporanMode('${m}')">
            ${m === 'harian' ? '<i class="fas fa-calendar-day"></i> Harian'
              : m === 'mingguan' ? '<i class="fas fa-calendar-week"></i> Mingguan'
              : m === 'bulanan' ? '<i class="fas fa-calendar-alt"></i> Bulanan'
              : '<i class="fas fa-layer-group"></i> Per Shift'}
          </button>
        `).join('')}
      </div>
      <div id="laporan-content">
        ${_buildLaporanContent()}
      </div>
    </div>
  `;
  app.innerHTML = Layout.renderMain(content);
}

function _jamBuka() {
  const raw = state.settings?.operasional?.jamBuka || '08:00';
  const [h, m] = raw.split(':').map(Number);
  return { h: h || 8, m: m || 0 };
}

function _toDate(ts) {
  if (!ts) return new Date(0);
  if (ts.seconds) return new Date(ts.seconds * 1000);
  if (ts.toDate) return ts.toDate();
  return new Date(ts);
}

function _formatTgl(date) {
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function _allTrx()        { return state.allTransactions || []; }
function _allPengeluaran() { return state.pengeluaran || []; }
function _allMutations()   { return state.stockMutations || []; }

function _sumTrx(trxList) {
  const total = trxList.reduce((s, t) => s + (t.total || 0), 0);
  const cash  = trxList.reduce((s, t) => s + (t.cashAmount || (t.metodeBayar === 'tunai' ? t.total : 0)), 0);
  const qris  = trxList.reduce((s, t) => s + (t.qrisAmount || (t.metodeBayar === 'qris' ? t.total : 0)), 0);
  return { total, cash, qris };
}

function _shortRupiah(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0','') + 'jt';
  if (n >= 1000)    return (n / 1000).toFixed(0) + 'rb';
  return String(n);
}

function _buildLaporanContent() {
  if (_laporanMode === 'harian')   return _buildListHarian();
  if (_laporanMode === 'mingguan') return _buildListMingguan();
  if (_laporanMode === 'bulanan')  return _buildListBulanan();
  if (_laporanMode === 'shift')    return _buildListShift();
  return '';
}

function _rowItem(label, sublabel, trxCount, total, isoKey, mode, extra) {
  const empty = trxCount === 0;
  return `
    <div class="laporan-row ${empty ? 'laporan-row-empty' : ''}">
      <div class="laporan-row-info">
        <div class="laporan-row-label">${label}</div>
        ${sublabel ? `<div class="laporan-row-sublabel">${sublabel}</div>` : ''}
      </div>
      <div class="laporan-row-stats">
        <span class="laporan-row-trx">${trxCount}x</span>
        <span class="laporan-row-total">${empty ? '&mdash;' : 'Rp ' + _shortRupiah(total)}</span>
      </div>
      <div class="laporan-row-actions">
        ${extra || ''}
        <button class="btn-icon-sm" title="Lihat Detail"
          onclick="window._showLaporanDetail('${mode}','${isoKey}')">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn-icon-sm" title="Download PDF"
          onclick="window._exportLaporanPDF('${mode}','${isoKey}')">
          <i class="fas fa-file-pdf"></i>
        </button>
        <button class="btn-icon-sm btn-icon-danger" title="Hapus Data Periode Ini"
          onclick="window._hapusLaporanPeriode('${mode}','${isoKey}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `;
}

function _navBar(label) {
  return `
    <div class="laporan-nav-bar">
      <button class="btn btn-secondary btn-sm" onclick="window._laporanNav(1)">
        <i class="fas fa-chevron-left"></i>
      </button>
      <span class="laporan-nav-label">${label}</span>
      <button class="btn btn-secondary btn-sm" onclick="window._laporanNav(-1)"
        ${_laporanOffset === 0 ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  `;
}

function _listHeader(col1) {
  return `
    <div class="laporan-list-header">
      <span>${col1}</span><span>Transaksi</span><span>Total</span><span>Aksi</span>
    </div>
  `;
}

function _buildListHarian() {
  const jb = _jamBuka();
  const now = new Date();
  const base = new Date(now);
  base.setDate(base.getDate() - _laporanOffset * 7);
  base.setHours(0, 0, 0, 0);

  const rows = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base); d.setDate(d.getDate() - i);
    const ds = new Date(d); ds.setHours(jb.h, jb.m, 0, 0);
    const de = new Date(ds); de.setDate(de.getDate() + 1);
    const trxList = _allTrx().filter(t => { const td = _toDate(t.date); return td >= ds && td < de; });
    const { total } = _sumTrx(trxList);
    const isToday = d.toDateString() === now.toDateString();
    const label = _formatTgl(d) + (isToday ? ' <span class="badge badge-success">Hari Ini</span>' : '');
    return _rowItem(label, null, trxList.length, total, ds.toISOString(), 'harian', '');
  }).join('');

  const oldest = new Date(base); oldest.setDate(oldest.getDate() - 6);
  return `
    ${_navBar(`${_formatTgl(oldest)} – ${_formatTgl(base)}`)}
    ${_listHeader('Tanggal')}
    <div class="laporan-row-list">${rows}</div>
  `;
}

function _buildListMingguan() {
  const jb = _jamBuka();
  const now = new Date();
  const baseMonth = new Date(now.getFullYear(), now.getMonth() - _laporanOffset, 1);

  const rows = Array.from({ length: 5 }, (_, i) => {
    const wStart = new Date(baseMonth); wStart.setDate(1 + i * 7);
    if (wStart.getMonth() !== baseMonth.getMonth()) return '';
    const wEnd = new Date(wStart); wEnd.setDate(wEnd.getDate() + 7);
    const ds = new Date(wStart); ds.setHours(jb.h, jb.m, 0, 0);
    const de = new Date(wEnd); de.setHours(jb.h, jb.m, 0, 0);
    const trxList = _allTrx().filter(t => { const td = _toDate(t.date); return td >= ds && td < de; });
    const { total } = _sumTrx(trxList);
    const sub = `${_formatTgl(wStart)} – ${_formatTgl(new Date(wEnd.getTime() - 86400000))}`;
    return _rowItem(`Minggu ke-${i + 1}`, sub, trxList.length, total, ds.toISOString(), 'mingguan', '');
  }).join('');

  const label = baseMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  return `
    ${_navBar(label)}
    ${_listHeader('Minggu')}
    <div class="laporan-row-list">${rows}</div>
  `;
}

function _buildListBulanan() {
  const jb = _jamBuka();
  const now = new Date();
  const baseYear = now.getFullYear() - _laporanOffset;

  const rows = Array.from({ length: 12 }, (_, i) => {
    const mStart = new Date(baseYear, i, 1); mStart.setHours(jb.h, jb.m, 0, 0);
    const mEnd   = new Date(baseYear, i + 1, 1); mEnd.setHours(jb.h, jb.m, 0, 0);
    const trxList = _allTrx().filter(t => { const td = _toDate(t.date); return td >= mStart && td < mEnd; });
    const { total } = _sumTrx(trxList);
    const isNow = i === now.getMonth() && baseYear === now.getFullYear();
    const label = mStart.toLocaleDateString('id-ID', { month: 'long' })
      + (isNow ? ' <span class="badge badge-success">Bulan Ini</span>' : '');
    return _rowItem(label, null, trxList.length, total, mStart.toISOString(), 'bulanan', '');
  }).join('');

  return `
    ${_navBar(`Tahun ${baseYear}`)}
    ${_listHeader('Bulan')}
    <div class="laporan-row-list">${rows}</div>
  `;
}

function _buildListShift() {
  const sessions = [...(state.allSessions || [])].sort((a, b) =>
    _toDate(b.waktuBuka) - _toDate(a.waktuBuka)
  );
  const pageSize = 10;
  const start = _laporanOffset * pageSize;
  const page = sessions.slice(start, start + pageSize);
  const totalPages = Math.ceil(sessions.length / pageSize);

  if (sessions.length === 0) {
    return `<div class="empty-state"><i class="fas fa-layer-group"></i><p>Belum ada data shift</p></div>`;
  }

  const rows = page.map(s => {
    const wb = _toDate(s.waktuBuka);
    const wt = s.waktuTutup ? _toDate(s.waktuTutup) : null;
    const trxSesi = _allTrx().filter(t => t.sessionId === s.id);
    const { total } = _sumTrx(trxSesi);
    const isActive = s.status === 'active';
    const label = `Shift ${s.shift} &mdash; ${s.kasir || '-'}`;
    const sub = wb.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      + (wt ? ` → ${wt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ' → sekarang');
    const extra = isActive ? `<span class="badge badge-success">AKTIF</span>` : '';
    return _rowItem(label, sub, trxSesi.length, total, s.id, 'shift', extra);
  }).join('');

  return `
    <div class="laporan-shift-pagination">
      <button class="btn btn-secondary btn-sm" onclick="window._laporanNav(1)"
        ${start + pageSize >= sessions.length ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i> Lama
      </button>
      <span class="text-muted">Hal ${_laporanOffset + 1} / ${totalPages}</span>
      <button class="btn btn-secondary btn-sm" onclick="window._laporanNav(-1)"
        ${_laporanOffset === 0 ? 'disabled' : ''}>
        Baru <i class="fas fa-chevron-right"></i>
      </button>
    </div>
    ${_listHeader('Shift')}
    <div class="laporan-row-list">${rows}</div>
  `;
}

function _getPeriodData(mode, isoKey) {
  const jb = _jamBuka();
  let trxList = [], pengeluaranList = [], mutationList = [], label = '';
  let rangeStart, rangeEnd;

  if (mode === 'shift') {
    const sesi = (state.allSessions || []).find(s => s.id === isoKey);
    trxList = _allTrx().filter(t => t.sessionId === isoKey);
    pengeluaranList = _allPengeluaran().filter(p => p.sessionId === isoKey);
    const trxIds = new Set(trxList.map(t => t.id));
    mutationList = _allMutations().filter(m => m.type === 'out' && trxIds.has(m.transactionId));
    label = sesi
      ? `Shift ${sesi.shift} — ${sesi.kasir || '-'} — ${_formatTgl(_toDate(sesi.waktuBuka))}`
      : `Shift`;
    return { trxList, pengeluaranList, mutationList, label };
  }

  if (mode === 'harian') {
    rangeStart = new Date(isoKey);
    rangeEnd = new Date(rangeStart); rangeEnd.setDate(rangeEnd.getDate() + 1);
    label = _formatTgl(rangeStart);
  } else if (mode === 'mingguan') {
    rangeStart = new Date(isoKey);
    rangeEnd = new Date(rangeStart); rangeEnd.setDate(rangeEnd.getDate() + 7);
    label = `${_formatTgl(rangeStart)} – ${_formatTgl(new Date(rangeEnd.getTime() - 86400000))}`;
  } else if (mode === 'bulanan') {
    rangeStart = new Date(isoKey);
    rangeEnd = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 1);
    rangeEnd.setHours(jb.h, jb.m, 0, 0);
    label = rangeStart.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }

  trxList = _allTrx().filter(t => { const d = _toDate(t.date); return d >= rangeStart && d < rangeEnd; });
  pengeluaranList = _allPengeluaran().filter(p => { const d = _toDate(p.createdAt); return d >= rangeStart && d < rangeEnd; });
  const trxIds = new Set(trxList.map(t => t.id));
  mutationList = _allMutations().filter(m => m.type === 'out' && trxIds.has(m.transactionId));
  return { trxList, pengeluaranList, mutationList, label };
}

function _buildDetailHTML(mode, isoKey) {
  const { trxList, pengeluaranList, mutationList } = _getPeriodData(mode, isoKey);
  const { total, cash, qris } = _sumTrx(trxList);
  const totalPengeluaran = pengeluaranList.reduce((s, p) => s + (p.nominal || 0), 0);
  const kasBersih = total - totalPengeluaran;

  const recap = {};
  trxList.forEach(t => (t.items || []).forEach(i => {
    if (!recap[i.name]) recap[i.name] = { qty: 0, total: 0 };
    recap[i.name].qty += i.qty;
    recap[i.name].total += i.subtotal || ((i.price + (i.modifierTotal || 0)) * i.qty);
  }));
  const recapSorted = Object.entries(recap).sort((a, b) => b[1].total - a[1].total);
  const maxRecap = recapSorted[0]?.[1].total || 1;

  const bahanUsage = {};
  mutationList.forEach(m => {
    if (!bahanUsage[m.namaBahan]) bahanUsage[m.namaBahan] = { qty: 0, satuan: m.satuan || '' };
    bahanUsage[m.namaBahan].qty += m.qty;
  });

  return `
    <div class="laporan-detail-body">
      <div class="laporan-detail-section">
        <div class="laporan-section-title"><i class="fas fa-chart-pie"></i> Ringkasan</div>
        <div class="detail-stats-grid">
          <div class="detail-stat"><span>Total Penjualan</span><strong>Rp ${Utils.formatRupiah(total)}</strong></div>
          <div class="detail-stat"><span>Transaksi</span><strong>${trxList.length}x</strong></div>
          <div class="detail-stat cash"><span>CASH</span><strong>Rp ${Utils.formatRupiah(cash)}</strong></div>
          <div class="detail-stat qris"><span>QRIS</span><strong>Rp ${Utils.formatRupiah(qris)}</strong></div>
          ${totalPengeluaran > 0 ? `
            <div class="detail-stat danger"><span>Pengeluaran</span><strong>-Rp ${Utils.formatRupiah(totalPengeluaran)}</strong></div>
            <div class="detail-stat success"><span>Kas Bersih</span><strong>Rp ${Utils.formatRupiah(kasBersih)}</strong></div>
          ` : ''}
        </div>
      </div>

      <div class="laporan-detail-section">
        <div class="laporan-section-title"><i class="fas fa-trophy"></i> Produk Terjual</div>
        ${recapSorted.length === 0
          ? '<p class="text-muted text-center">Tidak ada data</p>'
          : `<div class="recap-produk-list">
              ${recapSorted.map(([name, d], idx) => `
                <div class="recap-produk-row">
                  <div class="recap-produk-rank">${idx + 1}</div>
                  <div class="recap-produk-info">
                    <div class="recap-produk-name">${name}</div>
                    <div class="recap-produk-bar-wrap">
                      <div class="recap-produk-bar" style="width:${Math.round((d.total/maxRecap)*100)}%"></div>
                    </div>
                  </div>
                  <div class="recap-produk-stats">
                    <span class="recap-produk-qty">${d.qty}x</span>
                    <span class="recap-produk-total">Rp ${Utils.formatRupiah(d.total)}</span>
                  </div>
                </div>
              `).join('')}
            </div>`
        }
      </div>

      ${pengeluaranList.length > 0 ? `
        <div class="laporan-detail-section">
          <div class="laporan-section-title"><i class="fas fa-money-bill-wave"></i> Pengeluaran</div>
          <div class="detail-pengeluaran-list">
            ${pengeluaranList.map(p => `
              <div class="detail-pengeluaran-row">
                <span>${p.nama}</span>
                <span class="text-danger">-Rp ${Utils.formatRupiah(p.nominal)}</span>
              </div>
            `).join('')}
            <div class="detail-pengeluaran-row detail-pengeluaran-total">
              <span>Total</span><span>-Rp ${Utils.formatRupiah(totalPengeluaran)}</span>
            </div>
          </div>
        </div>
      ` : ''}

      ${Object.keys(bahanUsage).length > 0 ? `
        <div class="laporan-detail-section">
          <div class="laporan-section-title"><i class="fas fa-boxes"></i> Pemakaian Stok Bahan</div>
          <div class="detail-bahan-list">
            ${Object.entries(bahanUsage).sort((a,b) => b[1].qty - a[1].qty).map(([nama, d]) => `
              <div class="detail-bahan-row">
                <span>${nama}</span>
                <span class="text-muted">${d.qty} ${d.satuan}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

window._showLaporanDetail = function(mode, isoKey) {
  const { label } = _getPeriodData(mode, isoKey);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'modal-laporan-detail';
  modal.innerHTML = `
    <div class="modal modal-wide">
      <div class="modal-header">
        <div>
          <h3><i class="fas fa-chart-bar"></i> Detail Laporan</h3>
          <small class="text-muted">${label}</small>
        </div>
        <div class="modal-header-actions">
          <button class="btn btn-sm btn-secondary"
            onclick="window._exportLaporanPDF('${mode}','${isoKey}')">
            <i class="fas fa-file-pdf"></i> PDF
          </button>
          <button class="btn-icon-sm" onclick="document.getElementById('modal-laporan-detail').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      <div class="modal-body">
        ${_buildDetailHTML(mode, isoKey)}
      </div>
    </div>
  `;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
};

window._hapusLaporanPeriode = async function(mode, isoKey) {
  const { trxList, label } = _getPeriodData(mode, isoKey);
  if (trxList.length === 0) { Utils.showToast('Tidak ada data untuk dihapus', 'warning'); return; }

  const result = await Swal.fire({
    title: 'Hapus Data Laporan?',
    html: `<b>${label}</b><br><br>${trxList.length} transaksi akan dihapus permanen.<br>
      <small class="text-muted">Stok bahan tidak akan dikembalikan.</small>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc3545'
  });
  if (!result.isConfirmed) return;

  try {
    const ids = trxList.map(t => t.id);
    for (let i = 0; i < ids.length; i += 400) {
      const batch = dbCloud.batch();
      ids.slice(i, i + 400).forEach(id =>
        batch.delete(dbCloud.collection('transactions').doc(id))
      );
      await batch.commit();
    }
    Utils.showToast(`${trxList.length} transaksi dihapus`, 'success');
    _refreshLaporanContent();
  } catch (err) {
    Utils.showToast('Gagal hapus: ' + err.message, 'error');
  }
};

window._exportLaporanPDF = async function(mode, isoKey) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const toko = state.settings?.toko || {};
    const { trxList, pengeluaranList, mutationList, label } = _getPeriodData(mode, isoKey);
    const { total, cash, qris } = _sumTrx(trxList);
    const totalPengeluaran = pengeluaranList.reduce((s, p) => s + (p.nominal || 0), 0);
    const kasBersih = total - totalPengeluaran;

    const recap = {};
    trxList.forEach(t => (t.items || []).forEach(i => {
      if (!recap[i.name]) recap[i.name] = { qty: 0, total: 0 };
      recap[i.name].qty += i.qty;
      recap[i.name].total += i.subtotal || ((i.price + (i.modifierTotal || 0)) * i.qty);
    }));

    const bahanUsage = {};
    mutationList.forEach(m => {
      if (!bahanUsage[m.namaBahan]) bahanUsage[m.namaBahan] = { qty: 0, satuan: m.satuan || '' };
      bahanUsage[m.namaBahan].qty += m.qty;
    });

    const C1 = 15, C2 = 195;
    let y = 15;
    const hr = () => { doc.line(C1, y, C2, y); y += 4; };

    doc.setFontSize(14); doc.setFont(undefined, 'bold');
    doc.text(toko.nama || 'GARIS WAKTU', 105, y, { align: 'center' }); y += 7;
    doc.setFontSize(8); doc.setFont(undefined, 'normal');
    if (toko.alamat) { doc.text(toko.alamat, 105, y, { align: 'center' }); y += 4; }
    if (toko.telepon) { doc.text(toko.telepon, 105, y, { align: 'center' }); y += 4; }
    y += 2; hr();

    const modeLabel = { harian:'Harian', mingguan:'Mingguan', bulanan:'Bulanan', shift:'Per Shift' }[mode] || mode;
    doc.setFontSize(11); doc.setFont(undefined, 'bold');
    doc.text(`Laporan ${modeLabel}`, 105, y, { align: 'center' }); y += 5;
    doc.setFontSize(8); doc.setFont(undefined, 'normal');
    doc.text(label, 105, y, { align: 'center' }); y += 4;
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 105, y, { align: 'center' }); y += 5;
    hr();

    doc.setFontSize(10); doc.setFont(undefined, 'bold');
    doc.text('RINGKASAN PENJUALAN', C1, y); y += 5;
    doc.setFontSize(8);
    const sRows = [
      ['Total Penjualan', `Rp ${Utils.formatRupiah(total)}`],
      ['Total Transaksi', `${trxList.length}x`],
      ['CASH', `Rp ${Utils.formatRupiah(cash)}`],
      ['QRIS', `Rp ${Utils.formatRupiah(qris)}`],
      ...(totalPengeluaran > 0 ? [
        ['Pengeluaran', `-Rp ${Utils.formatRupiah(totalPengeluaran)}`],
        ['Kas Bersih', `Rp ${Utils.formatRupiah(kasBersih)}`]
      ] : [])
    ];
    sRows.forEach(([k, v]) => {
      doc.setFont(undefined, 'normal'); doc.text(k, C1 + 3, y);
      doc.setFont(undefined, k === 'Kas Bersih' ? 'bold' : 'normal');
      doc.text(v, C2, y, { align: 'right' }); y += 5;
    });
    y += 2;

    const recapRows = Object.entries(recap).sort((a,b) => b[1].total - a[1].total)
      .map(([n, d]) => [n, String(d.qty), `Rp ${Utils.formatRupiah(d.total)}`]);
    if (recapRows.length > 0) {
      doc.autoTable({
        startY: y,
        head: [['Produk', 'Qty', 'Total']],
        body: recapRows,
        margin: { left: C1, right: 15 },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [10, 122, 95] },
        columnStyles: { 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 40, halign: 'right' } }
      });
      y = doc.lastAutoTable.finalY + 5;
    }

    if (pengeluaranList.length > 0) {
      hr();
      doc.setFontSize(10); doc.setFont(undefined, 'bold');
      doc.text('PENGELUARAN', C1, y); y += 5;
      doc.autoTable({
        startY: y,
        head: [['Keterangan', 'Nominal']],
        body: pengeluaranList.map(p => [p.nama, `Rp ${Utils.formatRupiah(p.nominal)}`]),
        foot: [['Total', `Rp ${Utils.formatRupiah(totalPengeluaran)}`]],
        margin: { left: C1, right: 15 },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [220, 53, 69] },
        footStyles: { fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' } }
      });
      y = doc.lastAutoTable.finalY + 5;
    }

    if (Object.keys(bahanUsage).length > 0) {
      hr();
      doc.setFontSize(10); doc.setFont(undefined, 'bold');
      doc.text('PEMAKAIAN STOK BAHAN', C1, y); y += 5;
      doc.autoTable({
        startY: y,
        head: [['Bahan', 'Pemakaian']],
        body: Object.entries(bahanUsage).sort((a,b) => b[1].qty - a[1].qty)
          .map(([n, d]) => [n, `${d.qty} ${d.satuan}`]),
        margin: { left: C1, right: 15 },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [13, 110, 253] },
        columnStyles: { 1: { halign: 'right' } }
      });
    }

    doc.save(`laporan-${mode}-${label.replace(/[^a-z0-9]/gi,'_').substring(0,40)}.pdf`);
    Utils.showToast('PDF berhasil diunduh', 'success');
  } catch (err) {
    Utils.showToast('Gagal export PDF: ' + err.message, 'error');
  }
};

window._setLaporanMode = function(mode) {
  _laporanMode = mode;
  _laporanOffset = 0;
  _refreshLaporanContent();
};

window._laporanNav = function(dir) {
  _laporanOffset = Math.max(0, _laporanOffset + dir);
  _refreshLaporanContent();
};

function _refreshLaporanContent() {
  const el = document.getElementById('laporan-content');
  if (el) el.innerHTML = _buildLaporanContent();
  else renderLaporan();
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const modeMap = { 'Harian':'harian', 'Mingguan':'mingguan', 'Bulanan':'bulanan', 'Per Shift':'shift' };
    const txt = btn.textContent.trim();
    btn.classList.toggle('active', Object.entries(modeMap).some(([k,v]) => txt.includes(k) && v === _laporanMode));
  });
}

window.renderLaporan = renderLaporan;

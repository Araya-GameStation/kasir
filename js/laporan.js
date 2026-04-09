let _laporanMode = 'harian';
let _laporanOffset = 0;

let lastLaporanScroll = 0;

function _saveLaporanScroll() {
  const m = document.querySelector('main');
  if (m) lastLaporanScroll = m.scrollTop;
}

function renderLaporan() {
  _saveLaporanScroll();
  state.currentView = 'laporan';
  const content = `
    <div class="stack-y">
      <div class="tab-nav">
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
  requestAnimationFrame(() => { const mn = document.querySelector("main"); if (mn && lastLaporanScroll > 0) mn.scrollTop = lastLaporanScroll; });
  Layout._restoreSidebarScroll();
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
        <div class="laporan-row-label">${label} ${extra || ''}</div>
        ${sublabel ? `<div class="laporan-row-sublabel">${sublabel}</div>` : ''}
      </div>
      <div class="laporan-row-stats">
        <span class="laporan-row-trx">${trxCount}x</span>
        <span class="laporan-row-total">${empty ? '&mdash;' : 'Rp ' + _shortRupiah(total)}</span>
      </div>
      <div class="laporan-row-actions">
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
  const cashBersih = cash - totalPengeluaran;

  const recap = {};
  const recapModifier = {};
  trxList.forEach(t => (t.items || []).forEach(i => {
    if (!recap[i.name]) recap[i.name] = { qty: 0, total: 0 };
    recap[i.name].qty += i.qty;
    recap[i.name].total += i.price * i.qty;
    (i.modifiers || []).forEach(mod => {
      if (!mod.price || mod.price <= 0) return;
      const key = mod.optionName;
      if (!recapModifier[key]) recapModifier[key] = { qty: 0, total: 0 };
      recapModifier[key].qty += i.qty;
      recapModifier[key].total += mod.price * i.qty;
    });
  }));
  const recapSorted = Object.entries(recap).sort((a, b) => b[1].qty - a[1].qty);
  const recapModSorted = Object.entries(recapModifier).sort((a, b) => b[1].qty - a[1].qty);
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
            <div class="detail-stat success"><span>Cash Bersih</span><strong>Rp ${Utils.formatRupiah(cashBersih)}</strong></div>
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

      ${recapModSorted.length > 0 ? `
        <div class="laporan-detail-section">
          <div class="laporan-section-title"><i class="fas fa-sliders-h"></i> Add-on / Modifier Terjual</div>
          <div class="recap-produk-list">
            ${recapModSorted.map(([name, d]) => `
              <div class="recap-produk-row">
                <div class="recap-produk-rank"><i class="fas fa-plus-circle text-primary" style="font-size:0.7rem"></i></div>
                <div class="recap-produk-info">
                  <div class="recap-produk-name">${name}</div>
                  <div class="recap-produk-bar-wrap">
                    <div class="recap-produk-bar" style="width:${Math.round((d.total/(recapModSorted[0][1].total||1))*100)}%;background:var(--info)"></div>
                  </div>
                </div>
                <div class="recap-produk-stats">
                  <span class="recap-produk-qty">${d.qty}x</span>
                  <span class="recap-produk-total">+Rp ${Utils.formatRupiah(d.total)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

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
    html: `<b>${label}</b><br><br>
      ${trxList.length} transaksi akan dihapus permanen.<br>
      <small style="color:#6c757d">
        <i class="fas fa-info-circle"></i>
        Stok bahan tidak diubah. Gunakan fitur ini untuk membersihkan data Firebase lama.
      </small>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc3545'
  });
  if (!result.isConfirmed) return;

  try {
    Utils.showToast('⏳ Menghapus data...', 'warning');

    const trxIds = [...trxList.map(t => t.id)];
    for (let i = 0; i < trxIds.length; i += 400) {
      const batch = dbCloud.batch();
      trxIds.slice(i, i + 400).forEach(id =>
        batch.delete(dbCloud.collection('transactions').doc(id))
      );
      await batch.commit();
    }

    const mutasiIds = (state.stockMutations || [])
      .filter(m => m.source === 'sale' && new Set(trxIds).has(m.transactionId))
      .map(m => m.id);
    for (let i = 0; i < mutasiIds.length; i += 400) {
      const b = dbCloud.batch();
      mutasiIds.slice(i, i + 400).forEach(id =>
        b.delete(dbCloud.collection('stock_mutations').doc(id))
      );
      await b.commit();
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
    const cashBersih = cash - totalPengeluaran;

    const recap = {};
    const recapModifier = {};
    trxList.forEach(t => (t.items || []).forEach(i => {
      if (!recap[i.name]) recap[i.name] = { qty: 0, total: 0 };
      recap[i.name].qty += i.qty;
      recap[i.name].total += i.price * i.qty;
      (i.modifiers || []).forEach(mod => {
        if (!mod.price || mod.price <= 0) return;
        const key = mod.optionName;
        if (!recapModifier[key]) recapModifier[key] = { qty: 0, total: 0 };
        recapModifier[key].qty += i.qty;
        recapModifier[key].total += mod.price * i.qty;
      });
    }));

    const lowStockBahan = (state.rawMaterials || [])
      .filter(b => b.stock <= (b.minStock || 5))
      .sort((a, b) => a.stock - b.stock);

    const GREEN    = [10, 122, 95];
    const GREEN_DK = [7, 89, 69];
    const GREEN_LT = [241, 250, 246];
    const DARK     = [15, 23, 42];
    const GRAY     = [100, 116, 139];
    const LGRAY    = [248, 250, 252];
    const BORDER   = [226, 232, 240];
    const WHITE    = [255, 255, 255];
    const RED      = [220, 38, 38];
    const RED_LT   = [254, 242, 242];
    const ORANGE   = [234, 88, 12];
    const BLUE_AC  = [59, 130, 246];
    const TEAL_AC  = [16, 185, 129];

    const ML = 12, MR = 12, PW = 210 - ML - MR;
    const modeLabel = { harian:'Harian', mingguan:'Mingguan', bulanan:'Bulanan', shift:'Per Shift' }[mode] || mode;

    doc.setFillColor(...GREEN);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setFillColor(...GREEN_DK);
    doc.rect(0, 32, 210, 2, 'F');

    doc.setTextColor(...WHITE);
    doc.setFontSize(17);
    doc.setFont(undefined, 'bold');
    doc.text('LAPORAN ' + modeLabel.toUpperCase(), 105, 12, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(180, 230, 210);
    doc.text(toko.nama || 'GARIS WAKTU', 105, 20, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setTextColor(160, 215, 195);
    doc.text(label, 105, 27, { align: 'center' });

    let y = 39;

    doc.setFillColor(...LGRAY);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.15);
    doc.rect(ML, y, PW, 7, 'FD');
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.text('Dicetak: ' + new Date().toLocaleString('id-ID'), ML + 3.5, y + 4.5);
    doc.text(trxList.length + ' Transaksi', 210 - MR - 3.5, y + 4.5, { align: 'right' });
    y += 11;

    const cards = [
      { label: 'Total Penjualan', value: 'Rp ' + Utils.formatRupiah(total), accent: GREEN },
      { label: 'CASH',            value: 'Rp ' + Utils.formatRupiah(cash),  accent: TEAL_AC },
      { label: 'QRIS',            value: 'Rp ' + Utils.formatRupiah(qris),  accent: BLUE_AC },
    ];
    if (totalPengeluaran > 0) {
      cards.push({ label: 'Pengeluaran', value: 'Rp ' + Utils.formatRupiah(totalPengeluaran), accent: RED });
      cards.push({ label: 'Cash Bersih',  value: 'Rp ' + Utils.formatRupiah(cashBersih),        accent: GREEN });
    }

    const nCols = cards.length <= 3 ? 3 : 4;
    const gap = 3.5;
    const cW = (PW - (nCols - 1) * gap) / nCols;
    const cH = 17;

    cards.forEach(function(card, i) {
      const col = i % nCols;
      const row = Math.floor(i / nCols);
      const cx = ML + col * (cW + gap);
      const cy = y + row * (cH + gap);

      doc.setFillColor(...WHITE);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      doc.roundedRect(cx, cy, cW, cH, 1.5, 1.5, 'FD');

      doc.setFillColor(...card.accent);
      doc.roundedRect(cx, cy, cW, 3, 1.5, 1.5, 'F');
      doc.rect(cx, cy + 1.5, cW, 1.5, 'F');

      doc.setFontSize(6.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...GRAY);
      doc.text(card.label, cx + cW / 2, cy + 7.5, { align: 'center' });

      doc.setFontSize(7.5);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...DARK);
      doc.text(card.value, cx + cW / 2, cy + 13.5, { align: 'center', maxWidth: cW - 3 });
    });

    const nRows = Math.ceil(cards.length / nCols);
    y += nRows * (cH + gap) + 3;

    const section = function(title, color) {
      if (y > 250) { doc.addPage(); y = 15; }
      doc.setFillColor(...color);
      doc.rect(ML, y, 3, 5.5, 'F');
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...DARK);
      doc.text(title, ML + 5.5, y + 4);
      y += 8;
    };

    const tblBase = {
      margin: { left: ML, right: MR, bottom: 14 },
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 1.8, bottom: 1.8, left: 3, right: 3 },
        lineColor: BORDER,
        lineWidth: 0.15,
        overflow: 'linebreak',
        minCellHeight: 5.5,
        textColor: DARK,
      },
      headStyles: {
        fontStyle: 'bold',
        textColor: WHITE,
        fontSize: 7.5,
        fillColor: GREEN,
        cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
        minCellHeight: 7,
      },
      alternateRowStyles: { fillColor: GREEN_LT },
    };

    const recapRows = Object.entries(recap)
      .sort(function(a, b) { return b[1].qty - a[1].qty; })
      .map(function(entry) {
        return [entry[0], entry[1].qty + ' pcs', 'Rp ' + Utils.formatRupiah(entry[1].total)];
      });

    if (recapRows.length > 0) {
      section('PRODUK TERJUAL', GREEN);
      doc.autoTable({
        ...tblBase,
        startY: y,
        head: [['Nama Produk', 'Terjual', 'Total (Base)']],
        body: recapRows,
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 26, halign: 'center' },
          2: { cellWidth: 40, halign: 'right' },
        },
        didParseCell: function(d) {
          if (d.section === 'body' && d.row.index === 0) {
            d.cell.styles.fontStyle = 'bold';
          }
        },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    const modRows = Object.entries(recapModifier)
      .sort(function(a, b) { return b[1].qty - a[1].qty; })
      .map(function(entry) {
        return [entry[0], entry[1].qty + 'x', '+Rp ' + Utils.formatRupiah(entry[1].total)];
      });

    if (modRows.length > 0) {
      const TEAL = [13, 148, 136];
      section('ADD-ON / MODIFIER TERJUAL', TEAL);
      doc.autoTable({
        ...tblBase,
        startY: y,
        head: [['Nama Add-on', 'Terjual', 'Pendapatan Tambahan']],
        body: modRows,
        headStyles: { ...tblBase.headStyles, fillColor: TEAL },
        alternateRowStyles: { fillColor: [240, 253, 250] },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 48, halign: 'right' },
        },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    if (pengeluaranList.length > 0) {
      section('PENGELUARAN', RED);
      doc.autoTable({
        ...tblBase,
        startY: y,
        head: [['Keterangan', 'Nominal']],
        body: pengeluaranList.map(function(p) {
          return [p.nama, 'Rp ' + Utils.formatRupiah(p.nominal)];
        }),
        headStyles: { ...tblBase.headStyles, fillColor: RED },
        alternateRowStyles: { fillColor: RED_LT },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 48, halign: 'right' },
        },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    if (lowStockBahan.length > 0) {
      section('BAHAN STOK MENIPIS', ORANGE);
      doc.autoTable({
        ...tblBase,
        startY: y,
        head: [['Nama Bahan', 'Stok', 'Min. Stok', 'Satuan', 'Status']],
        body: lowStockBahan.map(function(b) {
          return [
            b.name,
            String(b.stock ?? 0),
            String(b.minStock || 5),
            b.satuan || 'pcs',
            b.stock <= 0 ? 'Habis' : 'Menipis',
          ];
        }),
        headStyles: { ...tblBase.headStyles, fillColor: ORANGE },
        alternateRowStyles: { fillColor: [255, 247, 237] },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 26, halign: 'center' },
          3: { cellWidth: 22, halign: 'center' },
          4: { cellWidth: 26, halign: 'center' },
        },
        didParseCell: function(d) {
          if (d.section !== 'body') return;
          if (d.column.index === 4) {
            d.cell.styles.fontStyle = 'bold';
            d.cell.styles.textColor = d.cell.raw === 'Habis' ? RED : ORANGE;
          }
          if (d.column.index === 1 && parseFloat(d.cell.raw) <= 0) {
            d.cell.styles.textColor = RED;
            d.cell.styles.fontStyle = 'bold';
          }
        },
      });
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pH = doc.internal.pageSize.height;
      doc.setFillColor(...GREEN);
      doc.rect(0, pH - 9, 210, 9, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(6.5);
      doc.setFont(undefined, 'normal');
      doc.text(toko.nama || 'GARIS WAKTU', ML, pH - 3.2);
      doc.setFont(undefined, 'bold');
      doc.text(i + ' / ' + pageCount, 105, pH - 3.2, { align: 'center' });
      doc.setFont(undefined, 'normal');
      doc.setTextColor(180, 230, 210);
      doc.text(new Date().toLocaleDateString('id-ID'), 210 - MR, pH - 3.2, { align: 'right' });
    }

    const safeLabel = label.replace(/[^a-z0-9]/gi, '_').substring(0, 40);
    doc.save('laporan-' + mode + '-' + safeLabel + '.pdf');
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
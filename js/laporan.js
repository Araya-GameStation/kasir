let _laporanMode = 'harian';
let _laporanOffset = 0;

function renderLaporan() {
  state.currentView = 'laporan';
  const content = `
    <div class="stack-y">
      <div class="laporan-tab-bar">
        ${['harian','mingguan','bulanan','shift'].map(m => `
          <button class="tab-btn ${_laporanMode === m ? 'active' : ''}" onclick="window._setLaporanMode('${m}')">
            ${m === 'harian' ? 'Harian' : m === 'mingguan' ? 'Mingguan' : m === 'bulanan' ? 'Bulanan' : 'Per Shift'}
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

function _opDayStart(date) {
  const jb = _jamBuka();
  const d = new Date(date);
  d.setHours(jb.h, jb.m, 0, 0);
  return d;
}

function _toOpDay(date) {
  const jb = _jamBuka();
  const d = new Date(date);
  const cutoff = new Date(d);
  cutoff.setHours(jb.h, jb.m, 0, 0);
  if (d < cutoff) d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
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

function _allTrx() {
  return state.allTransactions || [];
}

function _allPengeluaran() {
  return state.pengeluaran || [];
}

function _buildLaporanContent() {
  if (_laporanMode === 'shift') return _buildShiftLaporan();
  if (_laporanMode === 'harian') return _buildHarianLaporan();
  if (_laporanMode === 'mingguan') return _buildMingguanLaporan();
  if (_laporanMode === 'bulanan') return _buildBulananLaporan();
  return '';
}

function _buildNavBar(label) {
  return `
    <div class="laporan-nav-bar">
      <button class="btn btn-secondary btn-sm" onclick="window._laporanNav(1)">
        <i class="fas fa-chevron-left"></i>
      </button>
      <span class="laporan-nav-label">${label}</span>
      <button class="btn btn-secondary btn-sm" onclick="window._laporanNav(-1)" ${_laporanOffset === 0 ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  `;
}

function _buildStatsCards(total, trxCount, cash, qris, pengeluaran) {
  const bersih = total - pengeluaran;
  return `
    <div class="stats-grid stats-grid-laporan">
      <div class="stat-card">
        <div class="stat-label">Total Penjualan</div>
        <div class="stat-value">Rp ${Utils.formatRupiah(total)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Transaksi</div>
        <div class="stat-value">${trxCount}x</div>
      </div>
      <div class="stat-card cash">
        <div class="stat-label">CASH</div>
        <div class="stat-value">Rp ${Utils.formatRupiah(cash)}</div>
      </div>
      <div class="stat-card qris">
        <div class="stat-label">QRIS</div>
        <div class="stat-value">Rp ${Utils.formatRupiah(qris)}</div>
      </div>
      ${pengeluaran > 0 ? `
        <div class="stat-card danger">
          <div class="stat-label">Pengeluaran</div>
          <div class="stat-value">-Rp ${Utils.formatRupiah(pengeluaran)}</div>
        </div>
        <div class="stat-card success">
          <div class="stat-label">Kas Bersih</div>
          <div class="stat-value">Rp ${Utils.formatRupiah(bersih)}</div>
        </div>
      ` : ''}
    </div>
  `;
}

function _buildRecapProduk(trxList) {
  const recap = {};
  trxList.forEach(t => (t.items || []).forEach(i => {
    const key = i.name;
    if (!recap[key]) recap[key] = { qty: 0, total: 0 };
    recap[key].qty += i.qty;
    recap[key].total += i.subtotal || ((i.price + (i.modifierTotal || 0)) * i.qty);
  }));
  const sorted = Object.entries(recap).sort((a, b) => b[1].total - a[1].total);
  if (sorted.length === 0) return '<p class="text-muted text-center">Belum ada data produk</p>';
  const max = sorted[0][1].total;
  return `
    <div class="recap-produk-list">
      ${sorted.map(([name, d], idx) => `
        <div class="recap-produk-row">
          <div class="recap-produk-rank">${idx + 1}</div>
          <div class="recap-produk-info">
            <div class="recap-produk-name">${name}</div>
            <div class="recap-produk-bar-wrap">
              <div class="recap-produk-bar" style="width:${max > 0 ? Math.round((d.total/max)*100) : 0}%"></div>
            </div>
          </div>
          <div class="recap-produk-stats">
            <span class="recap-produk-qty">${d.qty}x</span>
            <span class="recap-produk-total">Rp ${Utils.formatRupiah(d.total)}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function _buildBarChart(points, labelFn) {
  if (points.length === 0) return '<p class="text-muted text-center">Belum ada data</p>';
  const max = Math.max(...points.map(p => p.val), 1);
  return `
    <div class="laporan-bar-chart">
      ${points.map(p => `
        <div class="bar-chart-col">
          <div class="bar-chart-val">${p.val > 0 ? _shortRupiah(p.val) : ''}</div>
          <div class="bar-chart-bar-wrap">
            <div class="bar-chart-bar ${p.val === 0 ? 'bar-empty' : ''}"
              style="height:${max > 0 ? Math.round((p.val/max)*100) : 0}%">
            </div>
          </div>
          <div class="bar-chart-label">${labelFn(p)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function _shortRupiah(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'jt';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'rb';
  return String(n);
}

function _sumTrx(trxList) {
  const total = trxList.reduce((s, t) => s + (t.total || 0), 0);
  const cash = trxList.reduce((s, t) => s + (t.cashAmount || (t.metodeBayar === 'tunai' ? t.total : 0)), 0);
  const qris = trxList.reduce((s, t) => s + (t.qrisAmount || (t.metodeBayar === 'qris' ? t.total : 0)), 0);
  return { total, cash, qris };
}

function _exportBtn(label, fn) {
  return `
    <button class="btn btn-secondary btn-sm" onclick="${fn}">
      <i class="fas fa-file-export"></i> ${label}
    </button>
  `;
}

function _buildHarianLaporan() {
  const now = new Date();
  const targetOpDay = new Date(now);
  targetOpDay.setDate(targetOpDay.getDate() - _laporanOffset);
  targetOpDay.setHours(0, 0, 0, 0);

  const jb = _jamBuka();
  const dayStart = new Date(targetOpDay);
  dayStart.setHours(jb.h, jb.m, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const trxList = _allTrx().filter(t => {
    const d = _toDate(t.date);
    return d >= dayStart && d < dayEnd;
  });

  const pengeluaranList = _allPengeluaran().filter(p => {
    const d = _toDate(p.createdAt);
    return d >= dayStart && d < dayEnd;
  });
  const totalPengeluaran = pengeluaranList.reduce((s, p) => s + (p.nominal || 0), 0);
  const { total, cash, qris } = _sumTrx(trxList);

  const labelTgl = _formatTgl(targetOpDay) + ` (buka ${jb.h.toString().padStart(2,'0')}:${jb.m.toString().padStart(2,'0')})`;

  const allHours = Array.from({ length: 24 }, (_, i) => {
    const h = (jb.h + i) % 24;
    const hStart = new Date(dayStart);
    hStart.setHours(h, 0, 0, 0);
    if (h < jb.h) hStart.setDate(hStart.getDate() + 1);
    const hEnd = new Date(hStart);
    hEnd.setHours(hEnd.getHours() + 1);
    const val = trxList.filter(t => {
      const d = _toDate(t.date); return d >= hStart && d < hEnd;
    }).reduce((s, t) => s + t.total, 0);
    return { label: `${h.toString().padStart(2,'0')}`, val };
  });
  const lastDataIdx = allHours.map((p, i) => p.val > 0 ? i : -1).filter(i => i >= 0).pop() ?? -1;
  const hours = lastDataIdx >= 0
    ? allHours.slice(0, Math.min(lastDataIdx + 2, 24))
    : allHours.slice(0, 12);

  return `
    ${_buildNavBar(labelTgl)}
    ${_buildStatsCards(total, trxList.length, cash, qris, totalPengeluaran)}
    <div class="laporan-section">
      <div class="laporan-section-title"><i class="fas fa-chart-bar"></i> Penjualan per Jam</div>
      ${_buildBarChart(hours, p => p.label)}
    </div>
    <div class="laporan-section">
      <div class="laporan-section-title"><i class="fas fa-trophy"></i> Rekap Produk</div>
      ${_buildRecapProduk(trxList)}
    </div>
    <div class="laporan-export-row">
      ${_exportBtn('Export PDF', `window._exportLaporanPDF('harian','${targetOpDay.toISOString()}')`)}
    </div>
  `;
}

function _buildMingguanLaporan() {
  const now = new Date();
  const jb = _jamBuka();
  const todayOpDay = _toOpDay(now);
  const weekStart = new Date(todayOpDay);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (_laporanOffset * 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const wStartTs = new Date(weekStart); wStartTs.setHours(jb.h, jb.m, 0, 0);
  const wEndTs = new Date(weekEnd); wEndTs.setHours(jb.h, jb.m, 0, 0);

  const trxList = _allTrx().filter(t => {
    const d = _toDate(t.date); return d >= wStartTs && d < wEndTs;
  });
  const pengeluaranList = _allPengeluaran().filter(p => {
    const d = _toDate(p.createdAt); return d >= wStartTs && d < wEndTs;
  });
  const totalPengeluaran = pengeluaranList.reduce((s, p) => s + (p.nominal || 0), 0);
  const { total, cash, qris } = _sumTrx(trxList);

  const hariLabel = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i);
    const ds = new Date(d); ds.setHours(jb.h, jb.m, 0, 0);
    const de = new Date(ds); de.setDate(de.getDate() + 1);
    const val = trxList.filter(t => { const td = _toDate(t.date); return td >= ds && td < de; })
      .reduce((s, t) => s + t.total, 0);
    return { label: hariLabel[d.getDay()], val };
  });

  const label = `${_formatTgl(weekStart)} – ${_formatTgl(new Date(weekEnd.getTime() - 86400000))}`;
  return `
    ${_buildNavBar(label)}
    ${_buildStatsCards(total, trxList.length, cash, qris, totalPengeluaran)}
    <div class="laporan-section">
      <div class="laporan-section-title"><i class="fas fa-chart-bar"></i> Penjualan per Hari</div>
      ${_buildBarChart(days, p => p.label)}
    </div>
    <div class="laporan-section">
      <div class="laporan-section-title"><i class="fas fa-trophy"></i> Rekap Produk</div>
      ${_buildRecapProduk(trxList)}
    </div>
    <div class="laporan-export-row">
      ${_exportBtn('Export PDF', `window._exportLaporanPDF('mingguan','${weekStart.toISOString()}')`)}
    </div>
  `;
}

function _buildBulananLaporan() {
  const now = new Date();
  const jb = _jamBuka();
  const target = new Date(now.getFullYear(), now.getMonth() - _laporanOffset, 1);
  const mStart = new Date(target.getFullYear(), target.getMonth(), 1);
  mStart.setHours(jb.h, jb.m, 0, 0);
  const mEnd = new Date(target.getFullYear(), target.getMonth() + 1, 1);
  mEnd.setHours(jb.h, jb.m, 0, 0);

  const trxList = _allTrx().filter(t => {
    const d = _toDate(t.date); return d >= mStart && d < mEnd;
  });
  const pengeluaranList = _allPengeluaran().filter(p => {
    const d = _toDate(p.createdAt); return d >= mStart && d < mEnd;
  });
  const totalPengeluaran = pengeluaranList.reduce((s, p) => s + (p.nominal || 0), 0);
  const { total, cash, qris } = _sumTrx(trxList);

  const daysInMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(target.getFullYear(), target.getMonth(), i + 1);
    const ds = new Date(d); ds.setHours(jb.h, jb.m, 0, 0);
    const de = new Date(ds); de.setDate(de.getDate() + 1);
    const val = trxList.filter(t => { const td = _toDate(t.date); return td >= ds && td < de; })
      .reduce((s, t) => s + t.total, 0);
    return { label: String(i + 1), val };
  });

  const label = target.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  return `
    ${_buildNavBar(label)}
    ${_buildStatsCards(total, trxList.length, cash, qris, totalPengeluaran)}
    <div class="laporan-section">
      <div class="laporan-section-title"><i class="fas fa-chart-bar"></i> Penjualan per Tanggal</div>
      ${_buildBarChart(days, p => p.label)}
    </div>
    <div class="laporan-section">
      <div class="laporan-section-title"><i class="fas fa-trophy"></i> Rekap Produk</div>
      ${_buildRecapProduk(trxList)}
    </div>
    <div class="laporan-export-row">
      ${_exportBtn('Export PDF', `window._exportLaporanPDF('bulanan','${mStart.toISOString()}')`)}
    </div>
  `;
}

function _buildShiftLaporan() {
  const sessions = [...(state.allSessions || [])].sort((a, b) => {
    const da = _toDate(b.waktuBuka); const db = _toDate(a.waktuBuka); return da - db;
  });

  const pageSize = 10;
  const start = _laporanOffset * pageSize;
  const pageSessions = sessions.slice(start, start + pageSize);
  const totalPages = Math.ceil(sessions.length / pageSize);

  if (sessions.length === 0) {
    return `<div class="empty-state"><i class="fas fa-history"></i><p>Belum ada data shift</p></div>`;
  }

  const rows = pageSessions.map(s => {
    const wb = _toDate(s.waktuBuka);
    const wt = s.waktuTutup ? _toDate(s.waktuTutup) : null;
    const trxSesi = _allTrx().filter(t => t.sessionId === s.id);
    const { total, cash, qris } = _sumTrx(trxSesi);
    const pengeluaranSesi = _allPengeluaran().filter(p => p.sessionId === s.id);
    const totalPengeluaran = pengeluaranSesi.reduce((sum, p) => sum + (p.nominal || 0), 0);
    const isActive = s.status === 'active';

    return `
      <div class="shift-laporan-card card ${isActive ? 'shift-active-card' : ''}">
        <div class="shift-laporan-header">
          <div class="shift-laporan-info">
            <div class="shift-laporan-title">
              <span class="session-badge session-badge-primary">SHIFT ${s.shift}</span>
              ${isActive ? '<span class="badge badge-success">AKTIF</span>' : ''}
            </div>
            <div class="shift-laporan-meta">
              <i class="fas fa-user"></i> ${s.kasir || '-'}
            </div>
            <div class="shift-laporan-meta">
              <i class="fas fa-clock"></i>
              ${wb.toLocaleString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
              ${wt ? ` → ${wt.toLocaleString('id-ID', { hour:'2-digit', minute:'2-digit' })}` : ' → sekarang'}
            </div>
          </div>
          <div class="shift-laporan-summary">
            <div class="shift-stat"><span>Transaksi</span><strong>${trxSesi.length}x</strong></div>
            <div class="shift-stat"><span>Total</span><strong>Rp ${Utils.formatRupiah(total)}</strong></div>
            <div class="shift-stat"><span>Cash</span><strong>Rp ${Utils.formatRupiah(cash)}</strong></div>
            <div class="shift-stat"><span>QRIS</span><strong>Rp ${Utils.formatRupiah(qris)}</strong></div>
            ${totalPengeluaran > 0 ? `<div class="shift-stat text-danger"><span>Pengeluaran</span><strong>-Rp ${Utils.formatRupiah(totalPengeluaran)}</strong></div>` : ''}
          </div>
        </div>
        <div class="shift-laporan-top-produk">
          ${_buildRecapProduk(trxSesi)}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="laporan-shift-pagination">
      <button class="btn btn-secondary btn-sm" onclick="window._laporanNav(1)" ${start + pageSize >= sessions.length ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i> Lebih lama
      </button>
      <span class="text-muted">Hal ${Math.floor(_laporanOffset) + 1} / ${totalPages}</span>
      <button class="btn btn-secondary btn-sm" onclick="window._laporanNav(-1)" ${_laporanOffset === 0 ? 'disabled' : ''}>
        Terbaru <i class="fas fa-chevron-right"></i>
      </button>
    </div>
    <div class="stack-y">
      ${rows}
    </div>
  `;
}

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
  if (el) {
    el.innerHTML = _buildLaporanContent();
  } else {
    renderLaporan();
  }
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const mode = btn.textContent.trim();
    const modeMap = { 'Harian': 'harian', 'Mingguan': 'mingguan', 'Bulanan': 'bulanan', 'Per Shift': 'shift' };
    btn.classList.toggle('active', modeMap[mode] === _laporanMode);
  });
}

window._exportLaporanPDF = async function(mode, isoDate) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const toko = state.settings?.toko || {};
    const jb = _jamBuka();

    let trxList = [];
    let label = '';
    const refDate = new Date(isoDate);

    if (mode === 'harian') {
      const dayStart = new Date(refDate); dayStart.setHours(jb.h, jb.m, 0, 0);
      const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
      trxList = _allTrx().filter(t => { const d = _toDate(t.date); return d >= dayStart && d < dayEnd; });
      label = _formatTgl(refDate);
    } else if (mode === 'mingguan') {
      const wEnd = new Date(refDate); wEnd.setDate(wEnd.getDate() + 7); wEnd.setHours(jb.h, jb.m, 0, 0);
      const wStart = new Date(refDate); wStart.setHours(jb.h, jb.m, 0, 0);
      trxList = _allTrx().filter(t => { const d = _toDate(t.date); return d >= wStart && d < wEnd; });
      label = `${_formatTgl(refDate)} – ${_formatTgl(new Date(wEnd.getTime() - 86400000))}`;
    } else if (mode === 'bulanan') {
      const mEnd = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1); mEnd.setHours(jb.h, jb.m, 0, 0);
      trxList = _allTrx().filter(t => { const d = _toDate(t.date); return d >= refDate && d < mEnd; });
      label = refDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }

    const { total, cash, qris } = _sumTrx(trxList);
    const recap = {};
    trxList.forEach(t => (t.items || []).forEach(i => {
      if (!recap[i.name]) recap[i.name] = { qty: 0, total: 0 };
      recap[i.name].qty += i.qty;
      recap[i.name].total += i.subtotal || (i.price * i.qty);
    }));

    let y = 15;
    doc.setFontSize(14); doc.setFont(undefined, 'bold');
    doc.text(toko.nama || 'GARIS WAKTU', 105, y, { align: 'center' }); y += 7;
    doc.setFontSize(10); doc.setFont(undefined, 'normal');
    doc.text(`Laporan ${mode.charAt(0).toUpperCase() + mode.slice(1)}: ${label}`, 105, y, { align: 'center' }); y += 5;
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 105, y, { align: 'center' }); y += 8;
    doc.line(15, y, 195, y); y += 6;

    doc.setFont(undefined, 'bold');
    doc.text('Ringkasan', 15, y); y += 6;
    doc.setFont(undefined, 'normal');
    const summary = [
      ['Total Penjualan', `Rp ${Utils.formatRupiah(total)}`],
      ['Total Transaksi', `${trxList.length}x`],
      ['CASH', `Rp ${Utils.formatRupiah(cash)}`],
      ['QRIS', `Rp ${Utils.formatRupiah(qris)}`],
    ];
    summary.forEach(([k, v]) => {
      doc.text(k, 20, y); doc.text(v, 195, y, { align: 'right' }); y += 5;
    });
    y += 4;

    const recapRows = Object.entries(recap).sort((a, b) => b[1].total - a[1].total).map(([name, d]) => [
      name, String(d.qty), `Rp ${Utils.formatRupiah(d.total)}`
    ]);

    doc.autoTable({
      startY: y,
      head: [['Produk', 'Qty', 'Total']],
      body: recapRows,
      margin: { left: 15, right: 15 },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [10, 122, 95] }
    });

    doc.save(`laporan-${mode}-${label.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    Utils.showToast('PDF berhasil diunduh', 'success');
  } catch (err) {
    Utils.showToast('Gagal export PDF: ' + err.message, 'error');
  }
};

window.renderLaporan = renderLaporan;

let lastHistoryScrollPosition = 0;

function renderHistory() {
    if (!state.currentSession) {
        renderNoSession();
        return;
    }

    const mainContent = document.querySelector('main');
    if (mainContent) {
        lastHistoryScrollPosition = mainContent.scrollTop;
    }

    state.currentView = "history";
    const totalIncome = state.transactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransaksi = state.transactions.length;
    const totalCASH = state.transactions.reduce((sum, t) => sum + (t.cashAmount || (t.metodeBayar === 'tunai' ? t.total : 0)), 0);
    const totalQRIS = state.transactions.reduce((sum, t) => sum + (t.qrisAmount || (t.metodeBayar === 'qris' ? t.total : 0)), 0);
    const recap = {};
    state.transactions.forEach(t => t.items.forEach(i => {
        if (!recap[i.name]) recap[i.name] = { qty: 0, total: 0 };
        recap[i.name].qty += i.qty;
        recap[i.name].total += i.price * i.qty;
    }));
    const sortedTransactions = SortableTable.sort(state.transactions, 'transactions');
    const content = `
    <div class="stack-y">
      <div class="session-header">
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="session-badge" style="box-shadow:var(--neu-inset);color:var(--primary-light);">SHIFT ${state.currentSession.shift}</span>
        </div>
        <span>Buka: ${(() => { const wb = state.currentSession.waktuBuka; const d = wb?.seconds ? new Date(wb.seconds * 1000) : wb?.toDate ? wb.toDate() : new Date(wb); return isNaN(d) ? "-" : d.toLocaleString("id-ID"); })()}</span>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Penjualan</div>
          <div class="stat-value">Rp ${Utils.formatRupiah(totalIncome)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Transaksi</div>
          <div class="stat-value">${totalTransaksi}</div>
        </div>
        <div class="stat-card cash">
          <div class="stat-label">CASH</div>
          <div class="stat-value">Rp ${Utils.formatRupiah(totalCASH)}</div>
        </div>
        <div class="stat-card qris">
          <div class="stat-label">QRIS</div>
          <div class="stat-value">Rp ${Utils.formatRupiah(totalQRIS)}</div>
        </div>
      </div>
      <div class="recap-section">
        <h3><i class="fas fa-chart-bar"></i> Rekap Produk</h3>
        <div class="recap-scroll-container">
          <div class="recap-grid scrollable">
            ${Object.keys(recap).length === 0 ?
            '<p class="text-muted">Belum ada data</p>' :
            Object.keys(recap).sort().map(name => `
                <div class="recap-item">
                  <div class="recap-name">${name}</div>
                  <div class="recap-detail">
                    <span>${recap[name].qty} pcs</span>
                    <span>Rp ${Utils.formatRupiah(recap[name].total)}</span>
                  </div>
                </div>
              `).join('')}
          </div>
        </div>
      </div>
      <div class="action-buttons">
        <button class="btn btn-secondary" onclick="toggleSelectAll()">
          ${state.selectedHistory.size === state.transactions.length ? 'Batal Pilih' : 'Pilih Semua'}
        </button>
        <button class="btn btn-secondary ${state.selectedHistory.size > 0 ? 'btn-danger' : ''}" 
                onclick="deleteSelected()" ${state.selectedHistory.size === 0 ? 'disabled' : ''}>
          <i class="fas fa-trash"></i> Hapus ${state.selectedHistory.size > 0 ? `(${state.selectedHistory.size})` : ''}
        </button>
        <button class="btn btn-warning" onclick="const b=this;Utils.setButtonLoading(b,true);cetakRekapSesi().finally(()=>Utils.setButtonLoading(b,false))">
          <i class="fas fa-print"></i> Cetak
        </button>
      </div>
      <h3><i class="fas fa-history"></i> Riwayat Transaksi</h3>
      ${state.transactions.length === 0 ?
            '<p class="text-center text-muted">Belum ada transaksi</p>' :
            `<table class="w-full">
        <thead class="neu-table-head">
          <tr>
            <th class="p-3 text-left cursor-pointer" onclick="sortTransactions('date')">
              Waktu <i class="fas ${SortableTable.getSortIcon('transactions', 'date')}"></i>
            </th>
            <th class="p-3 text-left cursor-pointer" onclick="sortTransactions('mejaNama')">
              Meja <i class="fas ${SortableTable.getSortIcon('transactions', 'mejaNama')}"></i>
            </th>
            <th class="p-3 text-left cursor-pointer" onclick="sortTransactions('total')">
              Total <i class="fas ${SortableTable.getSortIcon('transactions', 'total')}"></i>
            </th>
            <th class="p-3 text-left">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${sortedTransactions.map(t => {
                const tgl = new Date(t.date.seconds ? t.date.seconds * 1000 : t.date);
                return `
              <tr class="neu-table-row">
                <td class="p-3">
                  <input type="checkbox" ${state.selectedHistory.has(t.id) ? 'checked' : ''} 
                         onchange="toggleSelect('${t.id}')" onclick="event.stopPropagation()">
                  <span class="ml-2">${tgl.toLocaleTimeString('id-ID')}</span>
                </td>
                <td class="p-3">${t.mejaNama || 'Take Away'}</td>
                <td class="p-3 font-bold text-primary">Rp ${Utils.formatRupiah(t.total)}</td>
                <td class="p-3">
                  <button class="btn btn-icon-sm" onclick="showDetailModal('${t.id}'); event.stopPropagation()">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button class="btn btn-icon-sm" onclick="const b=this;Utils.setButtonLoading(b,true);reprintReceipt('${t.id}').finally(()=>Utils.setButtonLoading(b,false));event.stopPropagation()">
                    <i class="fas fa-print"></i>
                  </button>
                </td>
              </tr>
            `;
            }).join('')}
        </tbody>
      </table>`}
    </div>
  `;
    app.innerHTML = Layout.renderMain(content);

    requestAnimationFrame(() => {
        const newMainContent = document.querySelector('main');
        if (newMainContent && lastHistoryScrollPosition > 0) {
            newMainContent.scrollTop = lastHistoryScrollPosition;
        }
    });
}

function showDetailModal(trxId) {
    const mainContent = document.querySelector('main');
    if (mainContent) {
        lastHistoryScrollPosition = mainContent.scrollTop;
    }

    const trx = state.transactions.find(t => t.id === trxId);
    if (!trx) return;
    const tgl = new Date(trx.date.seconds ? trx.date.seconds * 1000 : trx.date);

    const itemsHTML = trx.items.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${item.name}</td>
      <td class="text-center">${item.qty}</td>
      <td class="text-right">Rp ${Utils.formatRupiah(item.price)}</td>
      <td class="text-right td-bold">Rp ${Utils.formatRupiah(item.price * item.qty)}</td>
    </tr>
  `).join('');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
    <div class="modal modal-lg modal-detail-trx">
      <h3><i class="fas fa-receipt"></i> Detail Transaksi</h3>

      <div class="trx-info-box">
        <div class="trx-info-grid">
          <div>
            <div class="trx-info-label">Tanggal</div>
            <div class="trx-info-value">${tgl.toLocaleDateString('id-ID')}</div>
          </div>
          <div>
            <div class="trx-info-label">Waktu</div>
            <div class="trx-info-value">${tgl.toLocaleTimeString('id-ID')}</div>
          </div>
          <div>
            <div class="trx-info-label">Kasir</div>
            <div class="trx-info-value">${trx.kasir}</div>
          </div>
          <div>
            <div class="trx-info-label">Meja</div>
            <div class="trx-info-value">${trx.mejaNama || 'Take Away'}</div>
          </div>
        </div>
      </div>

      <h4 class="section-title-sm">🛒 Daftar Pesanan</h4>
      <table class="detail-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Menu</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Harga</th>
            <th class="text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
        <tfoot>
          <tr class="tfoot-total">
            <td colspan="4" class="text-right td-bold">Total</td>
            <td class="text-right td-total-value">Rp ${Utils.formatRupiah(trx.total)}</td>
          </tr>
          <tr>
            <td colspan="4" class="text-right">Bayar</td>
            <td class="text-right">Rp ${Utils.formatRupiah(trx.paid)}</td>
          </tr>
          <tr>
            <td colspan="4" class="text-right">Kembalian</td>
            <td class="text-right ${trx.change >= 0 ? 'text-success' : 'text-danger'}">Rp ${Utils.formatRupiah(trx.change)}</td>
          </tr>
        </tfoot>
      </table>

      <div class="payment-info-box">
        <div class="payment-info-row">
          <span>Metode Pembayaran:</span>
          <span class="method-badge">
            ${trx.metodeBayar === 'tunai' ? 'CASH' : trx.metodeBayar === 'qris' ? 'QRIS' : 'CASH + QRIS'}
          </span>
        </div>
        ${trx.metodeBayar === 'mixed' ? `
          <div class="payment-info-mixed">
            <span>💵 CASH: Rp ${Utils.formatRupiah(trx.cashAmount || 0)}</span>
            <span>📱 QRIS: Rp ${Utils.formatRupiah(trx.qrisAmount || 0)}</span>
          </div>
        ` : ''}
      </div>

      <div class="modal-footer-actions">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Tutup</button>
        <button class="btn btn-primary" onclick="reprintReceipt('${trx.id}'); this.closest('.modal-overlay').remove()">
          <i class="fas fa-print"></i> Cetak Ulang
        </button>
      </div>
    </div>
  `;
    document.body.appendChild(modal);
}

function sortTransactions(field) {
    const mainContent = document.querySelector('main');
    if (mainContent) {
        lastHistoryScrollPosition = mainContent.scrollTop;
    }
    SortableTable.toggle('transactions', field);
    renderHistory();
}

function toggleSelect(id) {
    const mainContent = document.querySelector('main');
    if (mainContent) {
        lastHistoryScrollPosition = mainContent.scrollTop;
    }
    if (state.selectedHistory.has(id)) state.selectedHistory.delete(id);
    else state.selectedHistory.add(id);
    renderHistory();
}

function toggleSelectAll() {
    const mainContent = document.querySelector('main');
    if (mainContent) {
        lastHistoryScrollPosition = mainContent.scrollTop;
    }
    if (state.selectedHistory.size === state.transactions.length) state.selectedHistory.clear();
    else state.transactions.forEach(t => state.selectedHistory.add(t.id));
    renderHistory();
}

async function deleteSelected() {
    if (state.selectedHistory.size === 0) return;
    if (!await Utils.showConfirm(`Hapus ${state.selectedHistory.size} transaksi?`)) return;

    const mainContent = document.querySelector('main');
    if (mainContent) {
        lastHistoryScrollPosition = mainContent.scrollTop;
    }

    try {
        const jumlah = state.selectedHistory.size;
        await Promise.all([...state.selectedHistory].map(id => dbCloud.collection("transactions").doc(id).delete()));
        state.selectedHistory.clear();
        Utils.showToast(`${jumlah} transaksi dihapus`);
        renderHistory();
    } catch (error) {
        Utils.showToast("Gagal: " + error.message, 'error');
    }
}

async function reprintReceipt(trxId) {
    const mainContent = document.querySelector('main');
    if (mainContent) {
        lastHistoryScrollPosition = mainContent.scrollTop;
    }
    try {
        const trx = state.transactions.find(t => t.id === trxId);
        if (!trx) return;
        if (typeof window.printStruk === 'function') await window.printStruk(trx);
    } catch (error) {
        console.error('reprintReceipt error:', error);
        Utils.showToast('Gagal cetak ulang: ' + error.message, 'error');
    }
}

async function cetakRekapSesi() {
    const mainContent = document.querySelector('main');
    if (mainContent) {
        lastHistoryScrollPosition = mainContent.scrollTop;
    }
    try {
        if (typeof window.printRekapSesi === 'function') {
            await window.printRekapSesi(state.currentSession, state.transactions);
        }
    } catch (error) {
        console.error('cetakRekapSesi error:', error);
        Utils.showToast('Gagal cetak rekap: ' + error.message, 'error');
    }
}

window.renderHistory = renderHistory;
window.showDetailModal = showDetailModal;
window.sortTransactions = sortTransactions;
window.toggleSelect = toggleSelect;
window.toggleSelectAll = toggleSelectAll;
window.deleteSelected = deleteSelected;
window.reprintReceipt = reprintReceipt;
window.cetakRekapSesi = cetakRekapSesi;
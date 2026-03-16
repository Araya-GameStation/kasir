function renderHistory() {
  if (!state.currentSession) {
    renderNoSession();
    return;
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

  app.innerHTML = `
    <div class="pos-container">
      ${getSidebarHTML()}
      <main class="main-content smart-layout">
        <div class="smart-header">
          <div class="session-header">
            <span class="session-badge">SHIFT ${state.currentSession.shift}</span>
            <span>Buka: ${new Date(state.currentSession.waktuBuka.seconds * 1000).toLocaleString('id-ID')}</span>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total Penjualan</div>
              <div class="stat-value">Rp ${formatRupiah(totalIncome)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Transaksi</div>
              <div class="stat-value">${totalTransaksi}</div>
            </div>
            <div class="stat-card cash">
              <div class="stat-label">CASH</div>
              <div class="stat-value">Rp ${formatRupiah(totalCASH)}</div>
            </div>
            <div class="stat-card qris">
              <div class="stat-label">QRIS</div>
              <div class="stat-value">Rp ${formatRupiah(totalQRIS)}</div>
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
                      <span>Rp ${formatRupiah(recap[name].total)}</span>
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
            <button class="btn btn-warning" onclick="cetakRekapSesi()">
              <i class="fas fa-print"></i> Cetak
            </button>
          </div>
        </div>
        
        <div class="smart-scroll">
          <h3><i class="fas fa-history"></i> Riwayat Transaksi</h3>
          
          ${state.transactions.length === 0 ?
      '<p class="text-center text-muted">Belum ada transaksi</p>' :
      state.transactions.map(t => {
        const tgl = new Date(t.date.seconds ? t.date.seconds * 1000 : t.date);
        return `
                <div class="transaction-card">
                  <div class="transaction-header">
                    <div class="transaction-info">
                      <input type="checkbox" ${state.selectedHistory.has(t.id) ? 'checked' : ''} 
                             onchange="toggleSelect('${t.id}')" onclick="event.stopPropagation()">
                      <div>
                        <div class="transaction-time">${tgl.toLocaleTimeString('id-ID')} ${t.mejaNama ? `• ${t.mejaNama}` : ''}</div>
                        <div class="transaction-meta">${t.items.length} item • ${t.metodeBayar === 'tunai' ? 'CASH' : t.metodeBayar === 'qris' ? 'QRIS' : 'CAMPUR'}</div>
                      </div>
                    </div>
                    <div class="transaction-amount">
                      <div class="transaction-total">Rp ${formatRupiah(t.total)}</div>
                      <div class="transaction-actions">
                        <button class="btn btn-icon" onclick="showDetailModal('${t.id}'); event.stopPropagation()">
                          <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-icon" onclick="reprintReceipt('${t.id}'); event.stopPropagation()">
                          <i class="fas fa-print"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  ${state.expandedHistory === t.id ? `
                    <div class="transaction-detail">
                      <div class="detail-grid">
                        <div><i class="fas fa-money-bill-wave"></i> CASH: Rp ${formatRupiah(t.cashAmount || (t.metodeBayar === 'tunai' ? t.total : 0))}</div>
                        <div><i class="fas fa-qrcode"></i> QRIS: Rp ${formatRupiah(t.qrisAmount || (t.metodeBayar === 'qris' ? t.total : 0))}</div>
                        <div><i class="fas fa-calculator"></i> Total: Rp ${formatRupiah(t.total)}</div>
                        <div><i class="fas fa-credit-card"></i> Bayar: Rp ${formatRupiah(t.paid)}</div>
                      </div>
                    </div>
                  ` : ''}
                </div>
              `;
      }).join('')}
        </div>
      </main>
    </div>
  `;
}

function showDetailModal(trxId) {
  const trx = state.transactions.find(t => t.id === trxId);
  if (!trx) return;

  const tgl = new Date(trx.date.seconds ? trx.date.seconds * 1000 : trx.date);

  const itemsHTML = trx.items.map((item, index) => `
    <tr>
      <td style="padding: 8px 0;">${index + 1}</td>
      <td style="padding: 8px 0;">${item.name}</td>
      <td style="padding: 8px 0; text-align: center;">${item.qty}</td>
      <td style="padding: 8px 0; text-align: right;">Rp ${formatRupiah(item.price)}</td>
      <td style="padding: 8px 0; text-align: right; font-weight: 600;">Rp ${formatRupiah(item.price * item.qty)}</td>
    </tr>
  `).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal modal-lg" style="max-width: 700px;">
      <h3><i class="fas fa-receipt"></i> Detail Transaksi</h3>
      
      <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div>
            <div style="color: var(--text-light); font-size: 12px;">Tanggal</div>
            <div style="font-weight: 600;">${tgl.toLocaleDateString('id-ID')}</div>
          </div>
          <div>
            <div style="color: var(--text-light); font-size: 12px;">Waktu</div>
            <div style="font-weight: 600;">${tgl.toLocaleTimeString('id-ID')}</div>
          </div>
          <div>
            <div style="color: var(--text-light); font-size: 12px;">Kasir</div>
            <div style="font-weight: 600;">${trx.kasir}</div>
          </div>
          <div>
            <div style="color: var(--text-light); font-size: 12px;">Meja</div>
            <div style="font-weight: 600;">${trx.mejaNama || 'Take Away'}</div>
          </div>
        </div>
      </div>
      
      <h4 style="margin-bottom: 12px;">🛒 Daftar Pesanan</h4>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="border-bottom: 2px solid var(--border);">
            <th style="text-align: left; padding: 8px 0;">No</th>
            <th style="text-align: left; padding: 8px 0;">Menu</th>
            <th style="text-align: center; padding: 8px 0;">Qty</th>
            <th style="text-align: right; padding: 8px 0;">Harga</th>
            <th style="text-align: right; padding: 8px 0;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
        <tfoot>
          <tr style="border-top: 2px solid var(--border);">
            <td colspan="4" style="text-align: right; padding: 12px 0; font-weight: 600;">Total</td>
            <td style="text-align: right; padding: 12px 0; font-weight: 700; color: var(--primary);">Rp ${formatRupiah(trx.total)}</td>
          </tr>
          <tr>
            <td colspan="4" style="text-align: right; padding: 4px 0;">Bayar</td>
            <td style="text-align: right; padding: 4px 0;">Rp ${formatRupiah(trx.paid)}</td>
          </tr>
          <tr>
            <td colspan="4" style="text-align: right; padding: 4px 0;">Kembalian</td>
            <td style="text-align: right; padding: 4px 0; color: ${trx.change >= 0 ? 'var(--success)' : 'var(--danger)'};">Rp ${formatRupiah(trx.change)}</td>
          </tr>
        </tfoot>
      </table>
      
      <div style="background: #f1f5f9; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>Metode Pembayaran:</span>
          <span style="font-weight: 600; background: var(--primary); color: white; padding: 4px 12px; border-radius: 20px;">
            ${trx.metodeBayar === 'tunai' ? 'CASH' : trx.metodeBayar === 'qris' ? 'QRIS' : 'CASH + QRIS'}
          </span>
        </div>
        ${trx.metodeBayar === 'mixed' ? `
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 8px;">
            <span>💵 CASH: Rp ${formatRupiah(trx.cashAmount || 0)}</span>
            <span>📱 QRIS: Rp ${formatRupiah(trx.qrisAmount || 0)}</span>
          </div>
        ` : ''}
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Tutup</button>
        <button class="btn btn-primary" onclick="reprintReceipt('${trx.id}'); this.closest('.modal-overlay').remove()">
          <i class="fas fa-print"></i> Cetak Ulang
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function toggleDetail(id) {
  state.expandedHistory = state.expandedHistory === id ? null : id;
  renderHistory();
}

function toggleSelect(id) {
  if (state.selectedHistory.has(id)) state.selectedHistory.delete(id);
  else state.selectedHistory.add(id);
  renderHistory();
}

function toggleSelectAll() {
  if (state.selectedHistory.size === state.transactions.length) state.selectedHistory.clear();
  else state.transactions.forEach(t => state.selectedHistory.add(t.id));
  renderHistory();
}

async function deleteSelected() {
  if (state.selectedHistory.size === 0) return;
  if (!await showConfirm(`Hapus ${state.selectedHistory.size} transaksi?`)) return;

  try {
    await Promise.all([...state.selectedHistory].map(id => dbCloud.collection("transactions").doc(id).delete()));
    state.selectedHistory.clear();
    showToast(`${state.selectedHistory.size} transaksi dihapus`);
    renderHistory();
  } catch (error) {
    showToast("Gagal: " + error.message, 'error');
  }
}

async function reprintReceipt(trxId) {
  const trx = state.transactions.find(t => t.id === trxId);
  if (!trx) return;
  if (typeof window.printStruk === 'function') await window.printStruk(trx);
}

async function cetakRekapSesi() {
  if (typeof window.printRekapSesi === 'function') {
    await window.printRekapSesi(state.currentSession, state.transactions);
  }
}

window.renderHistory = renderHistory;
window.toggleDetail = toggleDetail;
window.toggleSelect = toggleSelect;
window.toggleSelectAll = toggleSelectAll;
window.deleteSelected = deleteSelected;
window.reprintReceipt = reprintReceipt;
window.cetakRekapSesi = cetakRekapSesi;
window.showDetailModal = showDetailModal;

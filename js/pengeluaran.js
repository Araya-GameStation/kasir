
function bukaModalPengeluaran() {
    if (!state.currentSession) {
        Utils.showToast('Buka shift dulu untuk mencatat pengeluaran', 'warning');
        return;
    }
    if (document.getElementById('modal-pengeluaran')) return;

    const sesiId = state.currentSession.id;
    const list   = state.pengeluaran?.filter(p => p.sessionId === sesiId) || [];
    const total  = list.reduce((s, p) => s + (p.nominal || 0), 0);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modal-pengeluaran';
    modal.innerHTML = `
      <div class="modal" style="max-width:480px;width:90%;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <h3 style="margin:0;display:flex;align-items:center;gap:8px;">
            <i class="fas fa-money-bill-wave" style="color:var(--danger)"></i>
            Pengeluaran
          </h3>
          <button class="btn-icon-sm" onclick="tutupModalPengeluaran()" title="Tutup">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
          <input type="text" id="inputNamaPengeluaran" class="form-input"
                 placeholder="Nama pengeluaran..."
                 style="flex:2;min-width:140px;"
                 onkeydown="if(event.key==='Enter')document.getElementById('inputNominalPengeluaran').focus()">
          <input type="number" id="inputNominalPengeluaran" class="form-input"
                 placeholder="Nominal (Rp)"
                 style="flex:1;min-width:120px;"
                 onkeydown="if(event.key==='Enter'){const b=document.getElementById('btnTambahPengeluaran');Utils.setButtonLoading(b,true);tambahPengeluaran().finally(()=>Utils.setButtonLoading(b,false))}">
          <button id="btnTambahPengeluaran" class="btn btn-primary"
                  onclick="const b=this;Utils.setButtonLoading(b,true);tambahPengeluaran().finally(()=>Utils.setButtonLoading(b,false))">
            <i class="fas fa-plus"></i> Tambah
          </button>
        </div>

        <div id="list-pengeluaran" style="max-height:300px;overflow-y:auto;">
          ${renderListPengeluaran(list)}
        </div>

        <div class="pengeluaran-total-row" style="${list.length > 0 ? '' : 'display:none'}margin-top:14px;padding-top:14px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-weight:700;">
          <span>Total Pengeluaran</span>
          <span style="color:var(--danger);font-size:16px;">Rp ${Utils.formatRupiah(total)}</span>
        </div>
      </div>
    `;

    modal.addEventListener('click', e => {
        if (e.target === modal) tutupModalPengeluaran();
    });

    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('inputNamaPengeluaran')?.focus(), 100);
}

function renderListPengeluaran(list) {
    if (!list || list.length === 0) {
        return '<p class="text-muted" style="text-align:center;padding:24px 0;font-size:13px;">Belum ada pengeluaran</p>';
    }
    return list.map(p => `
      <div class="recap-item" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;" data-id="${p.id}">
        <div style="flex:1;min-width:0;">
          <div class="recap-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.nama}</div>
          <div style="font-size:12px;color:var(--danger);font-weight:600;">
            Rp ${Utils.formatRupiah(p.nominal)}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;margin-left:8px;">
          <button class="btn-icon-sm"
                  onclick="mulaiEditPengeluaran('${p.id}','${p.nama.replace(/'/g,"\\'").replace(/"/g,'&quot;')}',${p.nominal})"
                  title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-icon-sm btn-icon-danger"
                  onclick="const b=this;Utils.setButtonLoading(b,true);hapusPengeluaran('${p.id}').finally(()=>Utils.setButtonLoading(b,false))"
                  title="Hapus">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
}

function refreshListPengeluaran() {
    const sesiId = state.currentSession?.id;
    const list   = state.pengeluaran?.filter(p => p.sessionId === sesiId) || [];
    const total  = list.reduce((s, p) => s + (p.nominal || 0), 0);

    const listEl = document.getElementById('list-pengeluaran');
    if (listEl) listEl.innerHTML = renderListPengeluaran(list);

    const totalRow = document.querySelector('.pengeluaran-total-row');
    if (totalRow) {
        totalRow.style.display = list.length > 0 ? 'flex' : 'none';
        const span = totalRow.querySelector('span:last-child');
        if (span) span.textContent = 'Rp ' + Utils.formatRupiah(total);
    }

    const badge = document.getElementById('badge-pengeluaran');
    if (badge) {
        badge.textContent = list.length;
        badge.style.display = list.length > 0 ? '' : 'none';
    }
}

function tutupModalPengeluaran() {
    const modal = document.getElementById('modal-pengeluaran');
    if (modal) {
        modal.style.animation = 'fadeOut 0.2s ease forwards';
        setTimeout(() => modal.remove(), 200);
    }
}

async function tambahPengeluaran() {
    if (!state.currentSession) return;
    const nama       = document.getElementById('inputNamaPengeluaran')?.value?.trim();
    const nominalRaw = document.getElementById('inputNominalPengeluaran')?.value;
    const nominal    = parseFloat(nominalRaw);

    if (!nama) { Utils.showToast('Nama pengeluaran harus diisi', 'warning'); return; }
    if (!nominalRaw || isNaN(nominal) || nominal <= 0) {
        Utils.showToast('Nominal harus lebih dari 0', 'warning'); return;
    }
    try {
        await dbCloud.collection('pengeluaran').add({
            nama, nominal,
            sessionId: state.currentSession.id,
            kasir: state.user?.email || 'unknown',
            createdAt: new Date()
        });
        document.getElementById('inputNamaPengeluaran').value = '';
        document.getElementById('inputNominalPengeluaran').value = '';
        document.getElementById('inputNamaPengeluaran')?.focus();
        Utils.showToast('Pengeluaran ditambahkan', 'success');
    } catch (error) {
        console.error('tambahPengeluaran:', error);
        Utils.showToast('Gagal: ' + error.message, 'error');
    }
}

function mulaiEditPengeluaran(id, namaLama, nominalLama) {
    const listEl = document.getElementById('list-pengeluaran');
    if (!listEl) return;
    const item = listEl.querySelector(`[data-id="${id}"]`);
    if (!item) return;

    item.innerHTML = `
      <div style="display:flex;gap:8px;width:100%;flex-wrap:wrap;">
        <input type="text" id="editNama_${id}" class="form-input" value="${namaLama}"
               style="flex:2;min-width:120px;padding:6px 10px;">
        <input type="number" id="editNominal_${id}" class="form-input" value="${nominalLama}"
               style="flex:1;min-width:100px;padding:6px 10px;"
               onkeydown="if(event.key==='Enter'){const b=this.nextElementSibling;Utils.setButtonLoading(b,true);simpanEditPengeluaran('${id}').finally(()=>Utils.setButtonLoading(b,false))}">
        <button class="btn btn-primary" style="padding:6px 12px;"
                onclick="const b=this;Utils.setButtonLoading(b,true);simpanEditPengeluaran('${id}').finally(()=>Utils.setButtonLoading(b,false))">
          <i class="fas fa-check"></i>
        </button>
        <button class="btn-icon-sm" onclick="refreshListPengeluaran()" title="Batal" style="align-self:center;">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    setTimeout(() => document.getElementById(`editNama_${id}`)?.focus(), 50);
}

async function simpanEditPengeluaran(id) {
    const nama       = document.getElementById(`editNama_${id}`)?.value?.trim();
    const nominalRaw = document.getElementById(`editNominal_${id}`)?.value;
    const nominal    = parseFloat(nominalRaw);

    if (!nama) { Utils.showToast('Nama harus diisi', 'warning'); return; }
    if (!nominalRaw || isNaN(nominal) || nominal <= 0) {
        Utils.showToast('Nominal harus lebih dari 0', 'warning'); return;
    }
    try {
        await dbCloud.collection('pengeluaran').doc(id).update({ nama, nominal });
        Utils.showToast('Pengeluaran diperbarui', 'success');
    } catch (error) {
        console.error('simpanEditPengeluaran:', error);
        Utils.showToast('Gagal: ' + error.message, 'error');
    }
}

async function hapusPengeluaran(id) {
    if (!await Utils.showConfirm('Hapus pengeluaran ini?')) return;
    try {
        await dbCloud.collection('pengeluaran').doc(id).delete();
        Utils.showToast('Pengeluaran dihapus', 'success');
    } catch (error) {
        console.error('hapusPengeluaran:', error);
        Utils.showToast('Gagal: ' + error.message, 'error');
    }
}

window.bukaModalPengeluaran   = bukaModalPengeluaran;
window.tutupModalPengeluaran  = tutupModalPengeluaran;
window.tambahPengeluaran      = tambahPengeluaran;
window.mulaiEditPengeluaran   = mulaiEditPengeluaran;
window.simpanEditPengeluaran  = simpanEditPengeluaran;
window.hapusPengeluaran       = hapusPengeluaran;
window.refreshListPengeluaran = refreshListPengeluaran;

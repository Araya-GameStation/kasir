const listeners = [];

function addListener(unsubscribe) {
    listeners.push(unsubscribe);
}

function cleanupListeners() {
    listeners.forEach(unsubscribe => unsubscribe());
    listeners.length = 0;
}

function _cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

window.Utils = {
    hitungStokProduk(produk) {
        if (!produk.resep || produk.resep.length === 0) {
            return produk.useStock ? produk.stock : null;
        }
        let maxPorsi = Infinity;
        for (const bahan of produk.resep) {
            const bahanData = window.state.rawMaterials.find(b => b.id === bahan.bahanId);
            if (!bahanData) {
                return 0;
            }
            const porsiDariBahan = Math.floor(bahanData.stock / bahan.qty);
            maxPorsi = Math.min(maxPorsi, porsiDariBahan);
        }
        return maxPorsi;
    },
    formatRupiah(num) {
        return new Intl.NumberFormat("id-ID").format(num || 0);
    },
    formatInputRupiah(input) {
        let value = input.value.replace(/\D/g, "");
        if (!value) {
            input.value = "";
            return;
        }
        input.value = new Intl.NumberFormat("id-ID").format(parseInt(value));
    },

    setButtonLoading(btn, loading) {
        if (!btn) return;
        if (loading) {
            btn._originalHTML = btn.innerHTML;
            btn._originalDisabled = btn.disabled;
            btn.disabled = true;
            btn.classList.add('btn-loading-disabled');
            const text = btn.textContent.trim();
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin btn-spinner ' + (text ? 'btn-spinner-mr' : '') + '"></i>' + text;
        } else {
            if (btn._originalHTML !== undefined) {
                btn.innerHTML = btn._originalHTML;
                btn.disabled = btn._originalDisabled || false;
                delete btn._originalHTML;
                delete btn._originalDisabled;
            }
            btn.classList.remove('btn-loading-disabled');
        }
    },
    showToast(message, type = 'success') {
        const iconMap = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
            error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>',
            info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
        };
        const icon = iconMap[type] || iconMap.info;
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            showClass: { popup: 'swal2-show' },
            hideClass: { popup: 'swal2-hide' },
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });
        Toast.fire({
            html: `<span class="custom-toast-icon" data-type="${type}">${icon}</span><span class="custom-toast-msg">${message}</span>`,
        });
    },
    async showConfirm(message) {
        const result = await Swal.fire({
            title: 'Konfirmasi',
            text: message,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: _cssVar('--swal-confirm'),
            cancelButtonColor:  _cssVar('--swal-cancel'),
            confirmButtonText: 'Ya, Lanjutkan',
            cancelButtonText: 'Batal',
            background: _cssVar('--swal-bg'),
            color:      _cssVar('--swal-text'),
            backdrop:   _cssVar('--swal-backdrop'),
        });
        return result.isConfirmed;
    },
    async showModal(options) {
        window._modalAction = 'cancel';
        const nonCancelBtns = (options.buttons || []).filter(b => b.action !== 'cancel');
        const cancelBtn = (options.buttons || []).find(b => b.action === 'cancel');
        const primaryBtn = nonCancelBtns[0];
        const footerBtns = nonCancelBtns.slice(1).map(b =>
            `<button class="swal2-confirm swal2-styled swal-action-btn ${b.class || ''}" onclick="window._modalAction='${b.action}';${b.onClick ? 'const _ob=options.buttons.find(x=>x.action===\'' + b.action + '\');if(_ob?.onClick)_ob.onClick();' : ''}Swal.clickConfirm()">${b.text}</button>`
        ).join('');
        const result = await Swal.fire({
            title: options.title,
            html: options.content + (footerBtns ? `<div class="swal-footer-btns">${footerBtns}</div>` : ''),
            icon: options.icon || undefined,
            showCancelButton: !!cancelBtn,
            showConfirmButton: !!primaryBtn,
            confirmButtonText: primaryBtn?.text || 'Simpan',
            cancelButtonText:  cancelBtn?.text  || 'Batal',
            confirmButtonColor: _cssVar('--swal-confirm'),
            cancelButtonColor:  _cssVar('--swal-cancel'),
            background: _cssVar('--swal-bg'),
            color:      _cssVar('--swal-text'),
            backdrop:   _cssVar('--swal-backdrop'),
            preConfirm: () => {
                if (window._modalAction === 'cancel') window._modalAction = primaryBtn?.action || 'save';
                const btn = (options.buttons || []).find(b => b.action === window._modalAction);
                if (btn?.onClick) btn.onClick();
                return true;
            }
        });
        const action = result.isConfirmed ? window._modalAction : 'cancel';
        delete window._modalAction;
        return action;
    },
    async showPrompt(message, defaultValue = '') {
        const result = await Swal.fire({
            title: message,
            input: 'text',
            inputValue: defaultValue,
            showCancelButton: true,
            confirmButtonColor: _cssVar('--swal-confirm'),
            cancelButtonColor:  _cssVar('--swal-cancel'),
            confirmButtonText: 'OK',
            cancelButtonText: 'Batal',
            background: _cssVar('--swal-bg'),
            color:      _cssVar('--swal-text'),
            backdrop:   _cssVar('--swal-backdrop'),
            inputValidator: (value) => {
                if (!value) return 'Input tidak boleh kosong';
            }
        });
        if (result.isConfirmed) return result.value;
        return null;
    }
};
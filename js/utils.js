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
    showToast(message, type = 'success') {
        const bgMap = {
            success: _cssVar('--toast-success-bg'),
            warning: _cssVar('--toast-warning-bg'),
            error:   _cssVar('--toast-error-bg'),
            info:    _cssVar('--toast-info-bg'),
        };
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });
        Toast.fire({
            icon: type,
            title: message,
            background: bgMap[type] || bgMap.info,
            color: _cssVar('--toast-text'),
            iconColor: _cssVar('--toast-text'),
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
            `<button class="swal2-confirm swal2-styled ${b.class || ''}" style="margin:0 4px;" onclick="window._modalAction='${b.action}';${b.onClick ? 'const _ob=options.buttons.find(x=>x.action===\'' + b.action + '\');if(_ob?.onClick)_ob.onClick();' : ''}Swal.clickConfirm()">${b.text}</button>`
        ).join('');
        const result = await Swal.fire({
            title: options.title,
            html: options.content + (footerBtns ? `<div style="margin-top:8px">${footerBtns}</div>` : ''),
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
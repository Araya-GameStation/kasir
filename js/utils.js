const listeners = [];

function addListener(unsubscribe) { listeners.push(unsubscribe); }
function cleanupListeners() { listeners.forEach(u => u()); listeners.length = 0; }
function _cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

(function _initTopProgress() {
    const bar = document.createElement('div');
    bar.id = 'top-progress-bar';
    bar.innerHTML = '<div class="top-progress-fill"></div>';
    document.body.appendChild(bar);
    let timer = null;
    window._startTopProgress = function() {
        clearTimeout(timer);
        bar.classList.remove('done');
        bar.classList.add('active');
    };
    window._doneTopProgress = function() {
        bar.classList.add('done');
        timer = setTimeout(() => bar.classList.remove('active','done'), 500);
    };
})();

window.Utils = {
    hitungStokProduk(produk) {
        if (!produk.resep || produk.resep.length === 0) {
            return produk.useStock ? produk.stock : null;
        }
        let maxPorsi = Infinity;
        for (const bahan of produk.resep) {
            const bahanData = window.state.rawMaterials.find(b => b.id === bahan.bahanId);
            if (!bahanData) return 0;
            maxPorsi = Math.min(maxPorsi, Math.floor(bahanData.stock / bahan.qty));
        }
        return maxPorsi;
    },

    formatRupiah(num) { return new Intl.NumberFormat("id-ID").format(num || 0); },

    formatInputRupiah(input) {
        let value = input.value.replace(/\D/g, "");
        if (!value) { input.value = ""; return; }
        input.value = new Intl.NumberFormat("id-ID").format(parseInt(value));
    },

    setButtonLoading(btn, loading) {
        if (!btn) return;
        if (loading) {
            btn._originalHTML    = btn.innerHTML;
            btn._originalDisabled = btn.disabled;
            btn.disabled = true;
            btn.classList.add('btn-loading-disabled');
            btn.innerHTML = `
                <span class="btn-dots-loader">
                    <span></span><span></span><span></span>
                </span>`;
        } else {
            if (btn._originalHTML !== undefined) {
                btn.innerHTML  = btn._originalHTML;
                btn.disabled   = btn._originalDisabled || false;
                delete btn._originalHTML;
                delete btn._originalDisabled;
            }
            btn.classList.remove('btn-loading-disabled');
        }
    },

    showToast(message, type = 'success') {
        const iconMap = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
            error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>',
            info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
        };
        const colors = { success:'#10b981', error:'#ef4444', warning:'#f59e0b', info:'#3b82f6' };
        const container = document.getElementById('toast-container') || (() => {
            const el = document.createElement('div');
            el.id = 'toast-container';
            document.body.appendChild(el);
            return el;
        })();

        const toast = document.createElement('div');
        toast.className = `app-toast app-toast-${type}`;
        toast.innerHTML = `
            <span class="app-toast-icon" style="color:${colors[type]||colors.info}">${iconMap[type]||iconMap.info}</span>
            <span class="app-toast-msg">${message}</span>
            <span class="app-toast-progress" style="--toast-color:${colors[type]||colors.info}"></span>`;
        container.appendChild(toast);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => toast.classList.add('show'));
        });

        setTimeout(() => {
            toast.classList.add('hide');
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        }, 3000);
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
        const cancelBtn     = (options.buttons || []).find(b => b.action === 'cancel');
        const primaryBtn    = nonCancelBtns[0];
        const footerBtns = nonCancelBtns.slice(1).map(function(b) {
            var onclickExtra = b.onClick
                ? "const _ob=options.buttons.find(x=>x.action=='" + b.action + "');if(_ob&&_ob.onClick)_ob.onClick();"
                : '';
            var cls = b.class || '';
            return '<button class="swal2-confirm swal2-styled swal-action-btn ' + cls + '"'
                + ' onclick="window._modalAction=\'' + b.action + '\';' + onclickExtra + 'Swal.clickConfirm()">'
                + b.text + '</button>';
        }).join('');
        const result = await Swal.fire({
            title: options.title,
            html: options.content + (footerBtns ? `<div class="swal-footer-btns">${footerBtns}</div>` : ''),
            icon: options.icon || undefined,
            showCancelButton:    !!cancelBtn,
            showConfirmButton:   !!primaryBtn,
            confirmButtonText:   primaryBtn?.text || 'Simpan',
            cancelButtonText:    cancelBtn?.text  || 'Batal',
            confirmButtonColor:  _cssVar('--swal-confirm'),
            cancelButtonColor:   _cssVar('--swal-cancel'),
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
            inputValidator: (value) => { if (!value) return 'Input tidak boleh kosong'; }
        });
        if (result.isConfirmed) return result.value;
        return null;
    }
};

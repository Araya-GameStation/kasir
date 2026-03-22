const app = document.getElementById("app");
let sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
let _isRendering = false;
let _lastView = null;

window.triggerPageTransition = function() {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const el = document.querySelector('.main-inner');
            if (!el) return;
            el.classList.remove('page-enter');
            void el.offsetWidth;
            el.classList.add('page-enter');
        });
    });
};

window.navigateTo = function(view) {
    if (_lastView === view) return;
    _lastView = view;
    state.currentView = view;
    if (view === 'kasir')            window.renderKasir?.();
    else if (view === 'history')     window.renderHistory?.();
    else if (view === 'menuManager') window.renderMenuManager?.();
    else if (view === 'bahanManager') window.renderBahanManager?.();
    else if (view === 'settings')    window.renderSettings?.();
    setTimeout(() => window.triggerPageTransition(), 50);
};

function createState(initialState) {
    const handlers = {
        set(target, property, value) {
            if (target[property] === value) return true;
            target[property] = value;

            const shouldRender = [
                'currentView', 'cart', 'selectedCategory', 'selectedTable',
                'selectedPaymentMethod', 'cashAmount', 'qrisAmount',
                'transactions', 'selectedHistory', 'selectedMenus'
            ].includes(property);

            if (!_isRendering && shouldRender) {
                _isRendering = true;
                requestAnimationFrame(() => {
                    window.safeRender();
                    _isRendering = false;
                });
            }
            return true;
        }
    };
    return new Proxy(initialState, handlers);
}

let state = createState({
    user: null,
    cart: [],
    menus: [],
    categories: [],
    selectedCategory: "ALL",
    selectedMenus: new Set(),
    transactions: [],
    expandedHistory: null,
    selectedHistory: new Set(),
    currentView: "kasir",
    currentCategoryId: null,
    currentSession: null,
    sessions: [],
    rawMaterials: [],
    stockMutations: [],
    tables: [],
    selectedTable: null,
    settings: null,
    offlineQueue: [],
    pengeluaran: [],
    selectedPaymentMethod: 'tunai',
    cashAmount: 0,
    qrisAmount: 0,
    lastCategoryScroll: 0,
    lastMenuScroll: 0
});

window.app = app;
window.state = state;
window.sidebarCollapsed = sidebarCollapsed;

window.toggleSidebar = function () {
    sidebarCollapsed = !sidebarCollapsed;
    window.sidebarCollapsed = sidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
    window.safeRender();
}

window.safeRender = function () {
    if (_isRendering) return;
    _isRendering = true;

    const viewChanged = _lastView !== state.currentView;
    if (viewChanged) _lastView = state.currentView;

    requestAnimationFrame(() => {
        try {
            if (state.currentView === "kasir" && typeof window.renderKasir === 'function') {
                window.renderKasir();
            } else if (state.currentView === "history" && typeof window.renderHistory === 'function') {
                window.renderHistory();
            } else if (state.currentView === "menuManager" && typeof window.renderMenuManager === 'function') {
                window.renderMenuManager();
            } else if (state.currentView === "openCategory" && typeof window.openCategory === 'function') {
                window.openCategory(state.currentCategoryId);
            } else if (state.currentView === "bahanManager" && typeof window.renderBahanManager === 'function') {
                window.renderBahanManager();
            } else if (state.currentView === "settings" && typeof window.renderSettings === 'function') {
                window.renderSettings();
            }
            if (viewChanged) setTimeout(() => window.triggerPageTransition(), 50);
        } catch (error) {
        } finally {
            _isRendering = false;
        }
    });
}
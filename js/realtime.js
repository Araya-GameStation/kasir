function startRealtimeCategories() {
    const unsubscribe = dbCloud.collection("categories").onSnapshot(async snap => {
        state.categories = [];
        snap.forEach(doc => state.categories.push({ id: doc.id, ...doc.data() }));
        const systemCats = state.categories.filter(c => c.system === true);
        if (systemCats.length === 0) {
            await dbCloud.collection("categories").add({ name: "LAINNYA", system: true });
        } else if (systemCats.length > 1) {
            const toDelete = systemCats.slice(1);
            await Promise.all(toDelete.map(c => dbCloud.collection("categories").doc(c.id).delete()));
        }
        safeRender();
    });
    addListener(unsubscribe);
}

function startRealtimeMenus() {
    const unsubscribe = dbCloud.collection("menus").onSnapshot(snap => {
        state.menus = [];
        snap.forEach(doc => state.menus.push({ id: doc.id, ...doc.data() }));
        safeRender();
    });
    addListener(unsubscribe);
}

function startRealtimeTransactions() {
    const unsubscribe = dbCloud.collection("transactions").orderBy("date", "desc").onSnapshot(snap => {
        state.allTransactions = [];
        snap.forEach(doc => state.allTransactions.push({ id: doc.id, ...doc.data() }));
        if (state.currentSession) {
            state.transactions = state.allTransactions.filter(t => t.sessionId === state.currentSession.id);
        } else {
            state.transactions = [];
        }
        if (state.currentView === "history") renderHistory();
    });
    addListener(unsubscribe);
}

function startRealtimeRawMaterials() {
    const unsubscribe = dbCloud.collection("raw_materials").onSnapshot(async snap => {
        const beforeCount = state.rawMaterials.length;
        state.rawMaterials = [];
        snap.forEach(doc => state.rawMaterials.push({ id: doc.id, ...doc.data() }));
        const adaPerubahan = beforeCount !== state.rawMaterials.length ||
            snap.docChanges().some(change =>
                change.type === 'modified' &&
                change.doc.data().stock !== change.doc.data()._previousStock
            );
        if (adaPerubahan && typeof window.updateAllProductStocks === 'function') {
            await window.updateAllProductStocks();
        }
        checkLowStockAlert();
        if (state.currentView === "bahanManager") renderBahanManager();
        if (state.currentView === "kasir") renderKasir();
    });
    addListener(unsubscribe);
}

function startRealtimeStockMutations() {
    const unsubscribe = dbCloud.collection("stock_mutations")
        .orderBy("createdAt", "desc")
        .limit(100)
        .onSnapshot(snap => {
            state.stockMutations = [];
            snap.forEach(doc => state.stockMutations.push({ id: doc.id, ...doc.data() }));
        });
    addListener(unsubscribe);
}

function startRealtimeTables() {
    const unsubscribe = dbCloud.collection("tables").onSnapshot(snap => {
        state.tables = [];
        snap.forEach(doc => state.tables.push({ id: doc.id, ...doc.data() }));
        safeRender();
    });
    addListener(unsubscribe);
}

function checkLowStockAlert() {
    const lowStock = state.rawMaterials.filter(m => m.stock <= (m.minStock || 5));
    if (lowStock.length > 0 && state.currentView !== 'bahanManager') {
        const lastAlert = localStorage.getItem('lastLowStockAlert');
        const now = Date.now();
        if (!lastAlert || (now - parseInt(lastAlert)) > 3600000) {
            Utils.showToast(`${lowStock.length} bahan menipis`, 'warning');
            localStorage.setItem('lastLowStockAlert', now.toString());
        }
    }
}

async function updateAllProductStocks() {
    const batch = dbCloud.batch();
    let updatedCount = 0;
    for (const produk of state.menus) {
        if (produk.resep && produk.resep.length > 0 && !produk.useStock) {
            const stokBaru = Utils.hitungStokProduk(produk);
            if (produk.stokOtomatis !== stokBaru) {
                batch.update(dbCloud.collection("menus").doc(produk.id), {
                    stokOtomatis: stokBaru,
                    stock: stokBaru
                });
                updatedCount++;
            }
        }
    }
    if (updatedCount > 0) {
        try {
            await batch.commit();
        } catch (error) {
            console.error('updateAllProductStocks error:', error);
        }
    }
}

window.startRealtimeCategories = startRealtimeCategories;
window.startRealtimeMenus = startRealtimeMenus;
window.startRealtimeTransactions = startRealtimeTransactions;
window.startRealtimeRawMaterials = startRealtimeRawMaterials;
window.startRealtimeStockMutations = startRealtimeStockMutations;
window.startRealtimeTables = startRealtimeTables;
window.updateAllProductStocks = updateAllProductStocks;
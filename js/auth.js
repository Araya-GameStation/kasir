firebase.auth().onAuthStateChanged(async function (user) {
    state.user = user;
    if (!user) {
        renderLogin();
    } else {
        await initializeApp();
        startRealtimeCategories();
        startRealtimeMenus();
        startRealtimeTransactions();
        startRealtimeRawMaterials();
        startRealtimeStockMutations();
        startRealtimeTables();
        renderKasir();
    }
});

function renderLogin() {
    app.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <span class="brand-title">GARIS WAKTU</span>
        <p class="brand-subtitle">Sistem Kasir dengan manajemen stok bahan baku dan resep</p>
        <input id="email" type="email" class="login-input" placeholder="Email" autocomplete="email">
        <input id="password" type="password" class="login-input" placeholder="Password" autocomplete="current-password">
        <button class="btn-login" onclick="login()">MASUK</button>
        <p class="brand-footer">VERSI 2.0.0</p>
      </div>
    </div>
  `;
}

function login() {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;
    firebase.auth().signInWithEmailAndPassword(email, pass)
        .catch(e => Utils.showToast(e.message, 'error'));
}

function logout() {
    if (state.currentSession) {
        Utils.showConfirm("Shift masih aktif! Tutup shift terlebih dahulu.").then(ok => {
            if (ok) tutupShift();
        });
        return;
    }
    cleanupListeners();
    firebase.auth().signOut();
}

async function initializeApp() {
    try {
        await loadSettings();
        await loadTables();
        await checkActiveSession();
    } catch (error) {
        console.error('initializeApp error:', error);
        Utils.showToast('Gagal memuat aplikasi: ' + error.message, 'error');
    }
}

async function loadSettings() {
    try {
        const snapshot = await dbCloud.collection("settings").doc("toko").get();
        if (snapshot.exists) {
            state.settings = snapshot.data();
        } else {
            const defaultSettings = {
                toko: { nama: "GARIS WAKTU", alamat: "JL A YANI KM 14,8", telepon: "085147520182" },
                struk: { header: "TERIMA KASIH", footer: ["IG: @arayagamestation"], showMeja: true },
                meja: { aktif: true }
            };
            await dbCloud.collection("settings").doc("toko").set(defaultSettings);
            state.settings = defaultSettings;
        }
    } catch (error) {
        console.error(error);
    }
}

async function loadTables() {
    try {
        const snapshot = await dbCloud.collection("tables").get();
        if (snapshot.empty) {
            const defaultTables = [
                { nomor: "TA", nama: "Take Away", aktif: true }
            ];
            for (const table of defaultTables) {
                await dbCloud.collection("tables").add(table);
            }
            state.tables = defaultTables;
        } else {
            state.tables = [];
            snapshot.forEach(doc => state.tables.push({ id: doc.id, ...doc.data() }));
        }
    } catch (error) {
        console.error(error);
    }
}

async function checkActiveSession() {
    try {
        const savedSession = localStorage.getItem("activeSession");
        if (savedSession) {
            const parsed = JSON.parse(savedSession);
            const doc = await dbCloud.collection("sessions").doc(parsed.id).get();
            if (doc.exists && doc.data().status === "active") {
                state.currentSession = { id: parsed.id, ...doc.data() };
                return;
            }
        }
        const snapshot = await dbCloud.collection("sessions")
            .where("status", "==", "active")
            .where("kasir", "==", state.user.email)
            .limit(1).get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            state.currentSession = { id: doc.id, ...doc.data() };
            localStorage.setItem("activeSession", JSON.stringify(state.currentSession));
        }
    } catch (error) {
        console.error(error);
    }
}

function getShiftWaktu() {
    const jam = new Date().getHours();
    if (jam < 9) return "PAGI";
    if (jam < 15) return "SIANG";
    if (jam < 18) return "SORE";
    return "MALAM";
}

async function bukaShift() {
    const session = {
        kasir: state.user?.email || 'unknown',
        waktuBuka: new Date(),
        modalAwal: 0,
        totalPenjualan: 0,
        jumlahTransaksi: 0,
        status: "active",
        shift: getShiftWaktu()
    };
    try {
        const doc = await dbCloud.collection("sessions").add(session);
        state.currentSession = { id: doc.id, ...session };
        localStorage.setItem("activeSession", JSON.stringify(state.currentSession));
        Utils.showToast(`Shift ${session.shift} dibuka`);
        renderKasir();
    } catch (error) {
        console.error('Error buka shift:', error);
        Utils.showToast("Gagal buka shift: " + error.message, 'error');
    }
}

async function tutupShift() {
    if (!state.currentSession) return;
    const transaksiSesi = state.transactions.filter(t => t.sessionId === state.currentSession.id);
    const totalPenjualan = transaksiSesi.reduce((sum, t) => sum + t.total, 0);
    const totalCash = transaksiSesi.reduce((sum, t) => sum + (t.cashAmount || (t.metodeBayar === 'tunai' ? t.total : 0)), 0);
    const totalQRIS = transaksiSesi.reduce((sum, t) => sum + (t.qrisAmount || (t.metodeBayar === 'qris' ? t.total : 0)), 0);
    const uangDiLaci = state.currentSession.modalAwal + totalCash;
    const result = await Utils.showModal({
        title: `Rekap Shift ${state.currentSession.shift}`,
        content: `
      <div class="rekap-card">
        <div><span>Transaksi</span><strong> ${transaksiSesi.length}x</strong></div>
        <div><span>CASH</span><strong> Rp ${Utils.formatRupiah(totalCash)}</strong></div>
        <div><span>QRIS</span><strong> Rp ${Utils.formatRupiah(totalQRIS)}</strong></div>
        <div><span>Total</span><strong> Rp ${Utils.formatRupiah(totalPenjualan)}</strong></div>
      </div>
    `,
        buttons: [
            { text: 'Batal', action: 'cancel', class: 'btn-secondary' },
            { text: 'Cetak Rekap', action: 'print', class: 'btn-warning' },
            { text: 'Tutup Shift', action: 'close', class: 'btn-primary' }
        ]
    });
    if (result === 'print') {
        if (typeof window.printRekapSesi === 'function') {
            await window.printRekapSesi(state.currentSession, transaksiSesi);
        }
        return;
    }
    if (result !== 'close') return;
    const rekap = {
        waktuTutup: new Date(),
        totalPenjualan, totalCash, totalQRIS,
        jumlahTransaksi: transaksiSesi.length,
        uangDiLaci, status: "closed"
    };
    try {
        await dbCloud.collection("sessions").doc(state.currentSession.id).update(rekap);
        localStorage.removeItem("activeSession");
        state.currentSession = null;
        state.transactions = [];
        Utils.showToast("Shift ditutup");
        renderKasir();
    } catch (error) {
        Utils.showToast("Gagal: " + error.message, 'error');
    }
}

window.login = login;
window.logout = logout;
window.bukaShift = bukaShift;
window.tutupShift = tutupShift;
let printerDevice = null;
let printerCharacteristic = null;
let printQueue = JSON.parse(localStorage.getItem('printQueue') || '[]');

function formatRupiah(num) {
  return new Intl.NumberFormat("id-ID").format(num || 0);
}

async function connectPrinter() {
  try {
    printerDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [0x18F0]
    });

    printerDevice.addEventListener('gattserverdisconnected', onPrinterDisconnected);
    
    const server = await printerDevice.gatt.connect();
    const service = await server.getPrimaryService(0x18F0);
    printerCharacteristic = await service.getCharacteristic(0x2AF1);
    
    showToast("Printer terhubung: " + printerDevice.name, "success");
    
    processPrintQueue();
    
    return true;
  } catch (e) {
    console.error("Printer error:", e);
    showToast("Gagal connect printer: " + e.message, "error");
    return false;
  }
}

function onPrinterDisconnected() {
  showToast("Printer terputus", "warning");
  printerDevice = null;
  printerCharacteristic = null;
}

async function disconnectPrinter() {
  if (printerDevice && printerDevice.gatt.connected) {
    printerDevice.gatt.disconnect();
    printerDevice = null;
    printerCharacteristic = null;
    showToast("Printer diputuskan", "success");
  }
}

async function writeInChunks(data) {
  const chunkSize = 100;
  const delay = 10;

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);

    try {
      if (printerCharacteristic.writeValueWithoutResponse) {
        await printerCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await printerCharacteristic.writeValue(chunk);
      }
    } catch (e) {
      console.error("Write error:", e);
      throw e;
    }

    await new Promise(r => setTimeout(r, delay));
  }
}

async function printStruk(trx) {
  if (!printerDevice || !printerDevice.gatt.connected) {
    addToPrintQueue(trx);
    showPrintDialog(trx);
    return false;
  }

  if (!printerCharacteristic) return false;

  try {
    const now = new Date();
    const encoder = new TextEncoder();
    let bytes = [];

    bytes.push(0x1B, 0x40);
    
    bytes.push(...encoder.encode("\n"));

    bytes.push(0x1B, 0x61, 0x01);
    bytes.push(0x1B, 0x45, 0x01);
    bytes.push(0x1D, 0x21, 0x11);
    
    const namaToko = window.state?.settings?.toko?.nama || "GARIS WAKTU";
    bytes.push(...encoder.encode(namaToko + "\n"));

    bytes.push(0x1D, 0x21, 0x00);
    bytes.push(0x1B, 0x45, 0x00);

    const alamat = window.state?.settings?.toko?.alamat || "JL A YANI KM 14,8 KEL GAMBUT\nKEC GAMBUT KAB BANJAR 70652";
    bytes.push(...encoder.encode(alamat + "\n"));

    const telepon = window.state?.settings?.toko?.telepon || "085147520182";
    bytes.push(...encoder.encode("Telp: " + telepon + "\n"));

    bytes.push(...encoder.encode("================================\n"));

    const tanggalLengkap = now.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Makassar"
    });

    const jam = now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Makassar"
    });

    bytes.push(0x1B, 0x61, 0x00);
    bytes.push(...encoder.encode(tanggalLengkap + " " + jam + "\n"));

    bytes.push(...encoder.encode("No: " + (trx.id?.substring(0, 8) || "000000") + "\n"));

    if (trx.mejaNama && window.state?.settings?.struk?.showMeja !== false) {
      bytes.push(...encoder.encode("Meja " + (trx.mejaNomor || "") + ": " + trx.mejaNama + "\n"));
    }

    bytes.push(...encoder.encode("================================\n"));

    trx.items.forEach(i => {
      bytes.push(...encoder.encode(i.name + "\n"));
      
      const qtyPrice = i.qty + " x " + formatRupiah(i.price);
      const totalPrice = formatRupiah(i.price * i.qty);
      const itemSpacing = 32 - qtyPrice.length - totalPrice.length;
      const itemLine = qtyPrice + " ".repeat(Math.max(0, itemSpacing)) + totalPrice;
      
      bytes.push(...encoder.encode(itemLine + "\n"));
      
      if (window.state?.settings?.struk?.showHargaSatuan) {
        bytes.push(...encoder.encode("  @" + formatRupiah(i.price) + "\n"));
      }
    });

    bytes.push(...encoder.encode("================================\n"));

    const totalLine = "TOTAL";
    const bayarLine = "BAYAR";
    const kembaliLine = "KEMBALI";

    const totalSpacing = 32 - totalLine.length - formatRupiah(trx.total).length;
    const bayarSpacing = 32 - bayarLine.length - formatRupiah(trx.paid).length;
    const kembaliSpacing = 32 - kembaliLine.length - formatRupiah(trx.change).length;

    bytes.push(0x1B, 0x45, 0x01);
    bytes.push(...encoder.encode(
      totalLine + " ".repeat(Math.max(0, totalSpacing)) + formatRupiah(trx.total) + "\n"
    ));
    bytes.push(0x1B, 0x45, 0x00);

    bytes.push(...encoder.encode(
      bayarLine + " ".repeat(Math.max(0, bayarSpacing)) + formatRupiah(trx.paid) + "\n"
    ));

    bytes.push(...encoder.encode(
      kembaliLine + " ".repeat(Math.max(0, kembaliSpacing)) + formatRupiah(trx.change) + "\n"
    ));

    bytes.push(...encoder.encode("================================\n"));

    if (window.state?.settings?.struk?.header) {
      bytes.push(0x1B, 0x61, 0x01);
      bytes.push(...encoder.encode(window.state.settings.struk.header + "\n"));
    }

    if (window.state?.settings?.struk?.footer?.length) {
      bytes.push(0x1B, 0x61, 0x01);
      window.state.settings.struk.footer.forEach(line => {
        bytes.push(...encoder.encode(line + "\n"));
      });
    }

    if (!window.state?.settings?.struk?.footer?.length) {
      bytes.push(0x1B, 0x61, 0x01);
      bytes.push(...encoder.encode("Terima Kasih\n"));
      bytes.push(...encoder.encode("Atas Kunjungan Anda\n"));
      bytes.push(...encoder.encode("WA: 085147520182\n"));
      bytes.push(...encoder.encode("IG: @arayagamestation\n"));
    }

    bytes.push(...encoder.encode("================================\n"));
    bytes.push(...encoder.encode("\n\n\n\n"));

    await writeInChunks(new Uint8Array(bytes));
    
    showToast("Struk berhasil dicetak", "success");
    return true;
    
  } catch (error) {
    console.error("Print error:", error);
    showToast("Gagal mencetak: " + error.message, "error");
    
    addToPrintQueue(trx);
    return false;
  }
}

async function printRekapSesi(session, transactions) {
  if (!printerDevice || !printerDevice.gatt.connected) {
    showToast("Printer tidak terhubung", "error");
    return false;
  }

  try {
    const encoder = new TextEncoder();
    let bytes = [];

    bytes.push(0x1B, 0x40);
    
    bytes.push(...encoder.encode("\n\n"));
    bytes.push(0x1B, 0x61, 0x01);
    bytes.push(0x1B, 0x45, 0x01);
    bytes.push(...encoder.encode("REKAP SHIFT\n"));
    bytes.push(0x1B, 0x45, 0x00);
    
    bytes.push(...encoder.encode("================================\n"));
    
    bytes.push(0x1B, 0x61, 0x00);
    bytes.push(...encoder.encode("Kasir: " + (session.namaKasir || session.kasir) + "\n"));
    bytes.push(...encoder.encode("Shift: " + session.shift + "\n"));
    
    const waktuBuka = new Date(session.waktuBuka.seconds * 1000);
    bytes.push(...encoder.encode("Buka: " + waktuBuka.toLocaleString('id-ID') + "\n"));
    
    if (session.waktuTutup) {
      const waktuTutup = new Date(session.waktuTutup.seconds * 1000);
      bytes.push(...encoder.encode("Tutup: " + waktuTutup.toLocaleString('id-ID') + "\n"));
    }
    
    bytes.push(...encoder.encode("================================\n"));
    
    bytes.push(...encoder.encode("RINGKASAN:\n"));
    bytes.push(...encoder.encode("Transaksi: " + transactions.length + "x\n"));
    
    const totalPenjualan = transactions.reduce((sum, t) => sum + t.total, 0);
    bytes.push(...encoder.encode("Total: Rp " + formatRupiah(totalPenjualan) + "\n"));
    
    const totalCash = transactions.reduce((sum, t) => sum + (t.cashAmount || (t.metodeBayar === 'tunai' ? t.total : 0)), 0);
    const totalQRIS = transactions.reduce((sum, t) => sum + (t.qrisAmount || (t.metodeBayar === 'qris' ? t.total : 0)), 0);
    
    bytes.push(...encoder.encode("Cash: Rp " + formatRupiah(totalCash) + "\n"));
    bytes.push(...encoder.encode("QRIS: Rp " + formatRupiah(totalQRIS) + "\n"));
    
    bytes.push(...encoder.encode("================================\n"));
    
    bytes.push(...encoder.encode("PRODUK TERJUAL:\n"));
    
    const recap = {};
    transactions.forEach(t => {
      t.items.forEach(i => {
        if (!recap[i.name]) recap[i.name] = 0;
        recap[i.name] += i.qty;
      });
    });
    
    Object.keys(recap).sort().forEach(name => {
      bytes.push(...encoder.encode(name + ": " + recap[name] + " pcs\n"));
    });
    
    bytes.push(...encoder.encode("================================\n"));
    bytes.push(...encoder.encode("\n\n\n"));
    
    await writeInChunks(new Uint8Array(bytes));
    showToast("Rekap shift dicetak", "success");
    
  } catch (error) {
    showToast("Gagal cetak rekap: " + error.message, "error");
  }
}

function addToPrintQueue(trx) {
  const queueItem = {
    id: trx.id || 'trx_' + Date.now(),
    data: trx,
    status: "pending",
    createdAt: new Date().toISOString(),
    attempts: 0
  };
  
  printQueue.push(queueItem);
  localStorage.setItem("printQueue", JSON.stringify(printQueue));
  
  showPrintNotification(queueItem);
}

function showPrintNotification(queueItem) {
  const container = document.getElementById('print-notifications');
  if (!container) return;
  
  const notif = document.createElement('div');
  notif.className = 'print-notification';
  notif.id = 'print-notif-' + queueItem.id;
  notif.innerHTML = `
    <div class="print-notification-content">
      <div class="print-notification-icon">
        <i class="fas fa-print"></i>
      </div>
      <div class="print-notification-info">
        <div class="print-notification-title">Struk Pending</div>
        <div class="print-notification-meta">
          Rp ${formatRupiah(queueItem.data.total)} • ${new Date(queueItem.createdAt).toLocaleTimeString()}
        </div>
      </div>
      <div class="print-notification-actions">
        <button class="print-notification-btn" onclick="connectAndPrint('${queueItem.id}')">
          <i class="fas fa-bluetooth"></i> Connect
        </button>
        <button class="print-notification-btn print-notification-btn-danger" onclick="removeFromQueue('${queueItem.id}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `;
  
  container.appendChild(notif);
  
  setTimeout(() => {
    const notifElement = document.getElementById('print-notif-' + queueItem.id);
    if (notifElement) {
      notifElement.style.animation = 'slideOutRight 0.3s ease forwards';
      setTimeout(() => {
        if (notifElement.parentNode) notifElement.remove();
      }, 300);
    }
  }, 10000);
}

async function connectAndPrint(queueId) {
  const connected = await connectPrinter();
  if (connected) {
    const queueItem = printQueue.find(q => q.id === queueId);
    if (queueItem) {
      await printStruk(queueItem.data);
      removeFromQueue(queueId);
    }
  }
}

function removeFromQueue(queueId) {
  printQueue = printQueue.filter(q => q.id !== queueId);
  localStorage.setItem("printQueue", JSON.stringify(printQueue));
  
  const notif = document.getElementById('print-notif-' + queueId);
  if (notif) {
    notif.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => {
      if (notif.parentNode) notif.remove();
    }, 300);
  }
}

async function processPrintQueue() {
  if (!printerDevice || !printerDevice.gatt.connected) return;
  
  for (const item of [...printQueue]) {
    if (item.status === "pending") {
      item.attempts++;
      const success = await printStruk(item.data);
      if (success) {
        removeFromQueue(item.id);
      }
    }
  }
}

function showPrintDialog(trx) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'print-dialog';
  modal.innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-icon">
        <i class="fas fa-print"></i>
      </div>
      
      <h3>Printer Tidak Terdeteksi</h3>
      
      <p class="modal-description">
        Transaksi berhasil disimpan, namun printer Bluetooth belum terkoneksi.
      </p>
      
      <div class="printer-options">
        <button class="printer-option" onclick="connectAndPrintFromDialog('${trx.id}')">
          <div class="printer-option-icon">
            <i class="fas fa-bluetooth"></i>
          </div>
          <div class="printer-option-content">
            <div class="printer-option-title">Cari & Hubungkan Printer</div>
            <div class="printer-option-desc">Cari printer dan cetak sekarang</div>
          </div>
          <i class="fas fa-chevron-right"></i>
        </button>
        
        <button class="printer-option" onclick="printLater('${trx.id}')">
          <div class="printer-option-icon" style="background: var(--warning);">
            <i class="fas fa-clock"></i>
          </div>
          <div class="printer-option-content">
            <div class="printer-option-title">Print Nanti</div>
            <div class="printer-option-desc">Simpan ke antrian</div>
          </div>
          <i class="fas fa-chevron-right"></i>
        </button>
        
        <button class="printer-option" onclick="closePrintDialog()">
          <div class="printer-option-icon" style="background: var(--text-light);">
            <i class="fas fa-check"></i>
          </div>
          <div class="printer-option-content">
            <div class="printer-option-title">Lanjut Tanpa Print</div>
            <div class="printer-option-desc">Transaksi selesai</div>
          </div>
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
      
      <button class="btn btn-secondary modal-close" onclick="closePrintDialog()">
        <i class="fas fa-times"></i> Tutup
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

async function connectAndPrintFromDialog(trxId) {
  const connected = await connectPrinter();
  if (connected) {
    const trx = window.state?.transactions?.find(t => t.id === trxId) || 
                window.state?.allTransactions?.find(t => t.id === trxId);
    if (trx) {
      await printStruk(trx);
      showToast('Struk berhasil dicetak', 'success');
    }
  }
  closePrintDialog();
}

function printLater(trxId) {
  const trx = window.state?.transactions?.find(t => t.id === trxId) ||
              window.state?.allTransactions?.find(t => t.id === trxId);
  if (trx) {
    addToPrintQueue(trx);
    showToast('⏰ Struk disimpan ke antrian', 'success');
  }
  closePrintDialog();
}

function closePrintDialog() {
  const modal = document.getElementById('print-dialog');
  if (modal) {
    modal.style.animation = 'fadeOut 0.2s ease forwards';
    setTimeout(() => {
      if (modal.parentNode) modal.remove();
    }, 200);
  }
}

window.connectPrinter = connectPrinter;
window.disconnectPrinter = disconnectPrinter;
window.printStruk = printStruk;
window.printRekapSesi = printRekapSesi;
window.connectAndPrint = connectAndPrint;
window.removeFromQueue = removeFromQueue;
window.connectAndPrintFromDialog = connectAndPrintFromDialog;
window.printLater = printLater;
window.closePrintDialog = closePrintDialog;
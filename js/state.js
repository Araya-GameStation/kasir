const app = document.getElementById("app");
let sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';

let state = {
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
  selectedPaymentMethod: 'tunai',
  cashAmount: 0,
  qrisAmount: 0
};

function formatRupiah(num) {
  return new Intl.NumberFormat("id-ID").format(num || 0);
}

function formatInputRupiah(input) {
  let value = input.value.replace(/\D/g, "");
  if (!value) {
    input.value = "";
    return;
  }
  input.value = new Intl.NumberFormat("id-ID").format(parseInt(value));
}

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showModal(options) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal ${options.size || 'modal-sm'}">
        ${options.title ? `<h3>${options.title}</h3>` : ''}
        <div class="modal-content">${options.content}</div>
        <div class="modal-actions">
          ${options.buttons ? options.buttons.map(btn => `
            <button class="btn ${btn.class || 'btn-secondary'}" data-action="${btn.action}">${btn.text}</button>
          `).join('') : ''}
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        
        const buttonConfig = options.buttons?.find(b => b.action === action);
        
        if (buttonConfig?.onClick) {
          buttonConfig.onClick();
        }

        let shouldClose = true;
        if (buttonConfig?.beforeClose) {
          shouldClose = buttonConfig.beforeClose();
        }
        
        if (shouldClose) {
          document.body.removeChild(modal);
          resolve(action);
        }
      });
    });
  });
}

async function showConfirm(message) {
  return await showModal({
    title: 'Konfirmasi',
    content: `<p>${message}</p>`,
    buttons: [
      { text: 'Batal', action: 'cancel', class: 'btn-secondary' },
      { text: 'Ya', action: 'confirm', class: 'btn-primary' }
    ]
  }) === 'confirm';
}

async function showPrompt(message, defaultValue = '') {
  let inputValue = null;
  
  const result = await showModal({
    title: message,
    content: `<input type="text" id="prompt-input" class="form-input" value="${defaultValue}">`,
    buttons: [
      { 
        text: 'Batal', 
        action: 'cancel', 
        class: 'btn-secondary',
        beforeClose: () => true
      },
      { 
        text: 'OK', 
        action: 'ok', 
        class: 'btn-primary',
        beforeClose: () => {
          const input = document.getElementById('prompt-input');
          if (input) {
            inputValue = input.value;
          }
          return true;
        }
      }
    ]
  });
  
  if (result === 'ok') {
    return inputValue;
  }
  return null;
}

window.app = app;
window.state = state;
window.sidebarCollapsed = sidebarCollapsed;
window.formatRupiah = formatRupiah;
window.formatInputRupiah = formatInputRupiah;
window.showToast = showToast;
window.showModal = showModal;
window.showConfirm = showConfirm;
window.showPrompt = showPrompt;
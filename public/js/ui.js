export const PROVINCES = [
  'Gauteng',
  'Free State',
  'KwaZulu-Natal',
  'Western Cape',
  'Eastern Cape',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape'
];

export const PACKAGING_SIZES = ['SMALL', 'MEDIUM', 'LARGE'];
export const PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'CREDIT'];
export const SETTLEMENT_METHODS = ['CASH', 'MOBILE_MONEY'];
export const PAYMENT_STATUSES = ['PAID', 'PARTIALLY_PAID', 'UNPAID'];

const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
  suppliers: '<path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-5h6v5"/><path d="M9 10h.01M15 10h.01M9 13h.01M15 13h.01"/>',
  fruits: '<path d="M12 8c-3.2-2.4-8-.2-8 4.6 0 4.3 3.4 7.9 5.4 7.9 1.1 0 1.7-.6 2.6-.6s1.5.6 2.6.6c2 0 5.4-3.6 5.4-7.9 0-4.8-4.8-7-8-4.6Z"/><path d="M12 8c0-2.4 1.3-4 3.8-4.5"/>',
  vendors: '<path d="M16 21v-1.6a4.4 4.4 0 0 0-4.4-4.4H7.4A4.4 4.4 0 0 0 3 19.4V21"/><circle cx="9.5" cy="7.5" r="3.5"/><path d="M21 21v-1.6a4.4 4.4 0 0 0-3.3-4.3"/><path d="M15.5 4.1a3.5 3.5 0 0 1 0 6.8"/>',
  purchases: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M3 4h2l2.3 9.9a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 2-1.6L20.5 8H6"/><path d="M12 7v5M9.5 9.5h5"/>',
  sales: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  payments: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.3"/><path d="M6.5 14.5h5"/>',
  reports: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.4-3.4"/>',
  eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  alert: '<path d="M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  box: '<path d="m12 3 8.5 4.6v8.8L12 21l-8.5-4.6V7.6L12 3Z"/><path d="m3.5 7.6 8.5 4.7 8.5-4.7M12 21v-8.7"/>',
  money: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.7"/><path d="M6 9.5h.01M18 14.5h.01"/>',
  phone: '<path d="M6.5 3h3l1.5 4-2 1.5a13 13 0 0 0 6.5 6.5L17 13l4 1.5v3a2.5 2.5 0 0 1-2.7 2.5A17.5 17.5 0 0 1 4 6.7 2.5 2.5 0 0 1 6.5 3Z"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 6.7"/><path d="M20 4v7h-7"/>',
  users: '<path d="M17 21v-1.8a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V21"/><circle cx="9.5" cy="7" r="3.5"/><path d="M22 21v-1.8a4 4 0 0 0-3-3.9"/><path d="M16 3.6a3.5 3.5 0 0 1 0 6.8"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/>',
  location: '<path d="M20 10c0 5.5-8 11-8 11s-8-5.5-8-11a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.7"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  bank: '<path d="m3 9 9-6 9 6"/><path d="M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 21h18"/>',
  leaf: '<path d="M20 4C10 4 4 9 4 16c0 3 2 4 4 4 7 0 12-6 12-16Z"/><path d="M4 20C7 14 11 10 17 7"/>'
};

export function icon(name, size = 18, className = '') {
  return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function money(value) {
  const number = Number(value) || 0;
  return `M ${number.toLocaleString('en-LS', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function quantity(value) {
  return Number(value || 0).toLocaleString('en-LS');
}

function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

export function formatDate(value, withTime = false) {
  if (!value) return '—';
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const text = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  if (!withTime) return text;
  return `${text}, ${date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
}

export function formatDateTime(value) {
  return formatDate(value, true);
}

export function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function sizeLabel(size) {
  const labels = { SMALL: 'Small', MEDIUM: 'Medium', LARGE: 'Large' };
  return labels[size] || size || '—';
}

export function sizeBadge(size) {
  if (!size) return '<span class="text-muted">—</span>';
  return `<span class="badge ${size.toLowerCase()}-size">${sizeLabel(size)}</span>`;
}

export function methodLabel(method) {
  const labels = {
    CASH: 'Cash',
    MOBILE_MONEY: 'Mobile money',
    CREDIT: 'Credit'
  };
  return labels[method] || method || '—';
}

export function statusBadge(status) {
  if (!status) return '<span class="badge neutral">—</span>';
  const normalised = String(status).toUpperCase();
  const labels = {
    PAID: 'Paid',
    PARTIALLY_PAID: 'Partially paid',
    UNPAID: 'Unpaid',
    ACTIVE: 'Active',
    INACTIVE: 'Inactive'
  };
  let css = 'neutral';
  if (normalised === 'PAID' || normalised === 'ACTIVE') css = normalised === 'PAID' ? 'paid' : 'active';
  else if (normalised === 'PARTIALLY_PAID') css = 'partial';
  else if (normalised === 'UNPAID') css = 'unpaid';
  else if (normalised === 'INACTIVE') css = 'inactive';
  return `<span class="badge ${css}">${labels[normalised] || escapeHtml(status)}</span>`;
}

export function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

export function loadingState(message = 'Loading...') {
  return `<div class="loading-state"><div class="spinner"></div><span>${escapeHtml(message)}</span></div>`;
}

export function errorState(message, title = 'Something went wrong') {
  return `
    <div class="error-state">
      <div class="error-icon">${icon('alert', 22)}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      <button type="button" class="btn btn-secondary" data-retry>${icon('refresh', 16)} Try again</button>
    </div>`;
}

export function emptyState(title = 'Nothing here yet', text = '', iconName = 'box') {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon(iconName, 21)}</div>
      <strong>${escapeHtml(title)}</strong>
      ${text ? `<p>${escapeHtml(text)}</p>` : ''}
    </div>`;
}

export function tableEmpty(colspan, title = 'No records found', text = '', iconName = 'box') {
  return `<tr><td colspan="${colspan}" style="padding:0">${emptyState(title, text, iconName)}</td></tr>`;
}

export function formAlert(message) {
  return `<div class="form-alert" role="alert">${escapeHtml(message)}</div>`;
}

export function formDataToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function setButtonBusy(button, text = 'Saving...') {
  if (!button) return;
  button.dataset.originalHtml = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> ${escapeHtml(text)}`;
}

export function resetButton(button) {
  if (!button) return;
  button.disabled = false;
  if (button.dataset.originalHtml) {
    button.innerHTML = button.dataset.originalHtml;
    delete button.dataset.originalHtml;
  }
}

/* ---------- Modal ---------- */

let activeModal = null;
let escapeListener = null;

export function openModal({ title, subtitle = '', body = '', footer = '', size = 'md', onClose = null }) {
  closeModal(true);

  const root = document.getElementById('modalRoot');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-backdrop" data-close></div>
    <section class="modal ${size === 'lg' ? 'modal-lg' : size === 'xl' ? 'modal-xl' : size === 'sm' ? 'modal-sm' : ''}"
             role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <header class="modal-header">
        <div>
          <h2>${escapeHtml(title)}</h2>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
        </div>
        <button type="button" class="modal-close" data-close aria-label="Close dialog">${icon('close', 17)}</button>
      </header>
      <div class="modal-body">${body}</div>
      ${footer ? `<footer class="modal-footer">${footer}</footer>` : ''}
    </section>`;

  root.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  overlay.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]')) closeModal();
  });

  escapeListener = (event) => {
    if (event.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', escapeListener);

  activeModal = { overlay, onClose };

  window.setTimeout(() => {
    const focusable = overlay.querySelector('input:not([type="hidden"]), select, textarea, button');
    focusable?.focus();
  }, 60);

  return overlay;
}

export function closeModal(silent = false) {
  if (!activeModal) return;
  const { overlay, onClose } = activeModal;
  activeModal = null;

  overlay.remove();
  document.body.style.overflow = '';

  if (escapeListener) {
    document.removeEventListener('keydown', escapeListener);
    escapeListener = null;
  }

  if (!silent && typeof onClose === 'function') onClose();
}

export function confirmDialog({
  title = 'Confirm action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = true
}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };

    const overlay = openModal({
      title,
      size: 'sm',
      body: `
        <div class="confirm-body">
          <div class="confirm-icon ${danger ? '' : 'info'}">${icon(danger ? 'alert' : 'info', 21)}</div>
          <div>${escapeHtml(message)}</div>
        </div>`,
      footer: `
        <button type="button" class="btn btn-secondary" data-cancel>${escapeHtml(cancelText)}</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm>${escapeHtml(confirmText)}</button>`,
      onClose: () => finish(false)
    });

    overlay.querySelector('[data-confirm]').addEventListener('click', () => {
      finish(true);
      closeModal();
    });
    overlay.querySelector('[data-cancel]').addEventListener('click', () => {
      finish(false);
      closeModal();
    });
  });
}

/* ---------- Toasts ---------- */

export function toast(message, type = 'success', title = null) {
  const root = document.getElementById('toastRoot');
  if (!root) return;

  const element = document.createElement('div');
  element.className = `toast ${type}`;
  const iconName = type === 'error' ? 'alert' : type === 'info' ? 'info' : 'check';
  const defaultTitle = type === 'error' ? 'Action failed' : type === 'info' ? 'Notice' : 'Success';

  element.innerHTML = `
    <span class="toast-icon">${icon(iconName, 18)}</span>
    <div>
      <strong>${escapeHtml(title || defaultTitle)}</strong>
      <p>${escapeHtml(message)}</p>
    </div>`;

  element.addEventListener('click', () => element.remove());
  root.appendChild(element);

  window.setTimeout(() => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(6px)';
    element.style.transition = 'opacity .2s ease, transform .2s ease';
    window.setTimeout(() => element.remove(), 220);
  }, 4500);
}

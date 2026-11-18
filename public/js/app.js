import dashboard from './pages/dashboard.js';
import suppliers from './pages/suppliers.js';
import fruits from './pages/fruits.js';
import vendors from './pages/vendors.js';
import purchases from './pages/purchases.js';
import sales from './pages/sales.js';
import payments from './pages/payments.js';
import reports from './pages/reports.js';
import { icon, loadingState, errorState } from './ui.js';

const pages = { dashboard, suppliers, fruits, vendors, purchases, sales, payments, reports };

const pageMeta = {
  dashboard: {
    title: 'Dashboard',
    eyebrow: 'Overview · Daily operations',
    subtitle: 'A clear view of the farm distribution operation.'
  },
  suppliers: {
    title: 'Suppliers',
    eyebrow: 'Directory · South African growers',
    subtitle: 'Manage fruit suppliers across South African provinces.'
  },
  fruits: {
    title: 'Fruits & Stock',
    eyebrow: 'Catalogue · Prices and stock',
    subtitle: 'Packaging prices and separate stock levels for every fruit.'
  },
  vendors: {
    title: 'Vendors',
    eyebrow: 'Directory · Lesotho buyers',
    subtitle: 'Street vendors and small retailers buying from Batloung Farm.'
  },
  purchases: {
    title: 'Purchases',
    eyebrow: 'Inbound · Supplier purchases',
    subtitle: 'Record supplier purchases and automatically increase stock.'
  },
  sales: {
    title: 'Sales',
    eyebrow: 'Outbound · Vendor sales',
    subtitle: 'Sell fruit by packaging size and track payment status.'
  },
  payments: {
    title: 'Payments',
    eyebrow: 'Reconciliation · Cash and mobile money',
    subtitle: 'Cash, mobile money and outstanding vendor balances.'
  },
  reports: {
    title: 'Reports',
    eyebrow: 'Insights · Performance review',
    subtitle: ''
  }
};

const navGroups = [
  {
    label: 'Overview',
    items: [{ page: 'dashboard', label: 'Dashboard', icon: 'dashboard' }]
  },
  {
    label: 'Operations',
    items: [
      { page: 'suppliers', label: 'Suppliers', icon: 'suppliers' },
      { page: 'fruits', label: 'Fruits & Stock', icon: 'fruits' },
      { page: 'vendors', label: 'Vendors', icon: 'vendors' }
    ]
  },
  {
    label: 'Transactions',
    items: [
      { page: 'purchases', label: 'Purchases', icon: 'purchases' },
      { page: 'sales', label: 'Sales', icon: 'sales' },
      { page: 'payments', label: 'Payments', icon: 'payments' }
    ]
  },
  {
    label: 'Insights',
    items: [{ page: 'reports', label: 'Reports', icon: 'reports' }]
  }
];

const navRoot = document.getElementById('mainNav');
const topNavRoot = document.getElementById('topNav');
const pageRoot = document.getElementById('page');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const pageEyebrow = document.getElementById('pageEyebrow');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const menuToggle = document.getElementById('menuToggle');

const flatNav = navGroups.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label }))
);

navRoot.innerHTML = navGroups
  .map(
    (group) => `
      <span class="nav-section-label">${group.label}</span>
      ${group.items
        .map(
          (item) => `
            <a class="nav-link" href="/${item.page}" data-nav data-page="${item.page}">
              ${icon(item.icon, 19)}
              <span>${item.label}</span>
            </a>`
        )
        .join('')}`
  )
  .join('');

topNavRoot.innerHTML = flatNav
  .map(
    (item, index) => `
      <a class="top-link" href="/${item.page}" data-nav data-page="${item.page}" title="${item.group} · ${item.label}">
        <span class="top-link-index">${String(index + 1).padStart(2, '0')}</span>
        <span class="top-link-label">${item.label}</span>
      </a>`
  )
  .join('');

document.getElementById('sidebarCardIcon').innerHTML = icon('leaf', 18);
document.getElementById('menuIcon').innerHTML = icon('menu', 20);
document.getElementById('todayChip').textContent = new Date().toLocaleDateString('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});

function currentPageName() {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (!path || path === '/') return 'dashboard';
  const name = path.replace(/^\//, '');
  return pages[name] ? name : 'dashboard';
}

function setActiveNav(page) {
  document.querySelectorAll('.nav-link, .top-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.page === page);
  });
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
}

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('show');
}

async function renderCurrentPage() {
  const page = currentPageName();
  const meta = pageMeta[page];

  setActiveNav(page);
  pageTitle.textContent = meta.title;
  pageEyebrow.textContent = meta.eyebrow;
  pageSubtitle.textContent = meta.subtitle;
  pageSubtitle.hidden = !meta.subtitle;
  document.title = `${meta.title} · Batloung Farm`;

  pageRoot.classList.remove('page-enter');
  void pageRoot.offsetWidth;
  pageRoot.classList.add('page-enter');
  pageRoot.innerHTML = loadingState('Loading data...');

  try {
    await pages[page].render(pageRoot);
  } catch (error) {
    console.error(error);
    pageRoot.innerHTML = errorState(error.message || 'Unable to load this page.');
  }
}

function navigate(page, { replace = false } = {}) {
  if (!pages[page]) page = 'dashboard';
  const path = `/${page}`;
  if (window.location.pathname !== path) {
    if (replace) window.history.replaceState({}, '', path);
    else window.history.pushState({}, '', path);
  }
  closeSidebar();
  renderCurrentPage();
}

document.addEventListener('click', (event) => {
  const navLink = event.target.closest('[data-nav]');
  if (navLink) {
    const href = navLink.getAttribute('href');
    if (href && href.startsWith('/')) {
      event.preventDefault();
      navigate(href.replace(/^\//, '') || 'dashboard');
      return;
    }
  }

  if (event.target.closest('[data-retry]')) {
    renderCurrentPage();
  }
});

menuToggle.addEventListener('click', () => {
  if (sidebar.classList.contains('open')) closeSidebar();
  else openSidebar();
});
sidebarOverlay.addEventListener('click', closeSidebar);

window.addEventListener('popstate', () => {
  closeSidebar();
  renderCurrentPage();
});

const initialPage = currentPageName();
if (window.location.pathname === '/') {
  window.history.replaceState({}, '', '/dashboard');
}
setActiveNav(initialPage);
renderCurrentPage();

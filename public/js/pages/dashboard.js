import { api } from '../api.js';
import {
  icon,
  money,
  quantity,
  formatDate,
  statusBadge,
  sizeBadge,
  escapeHtml,
  tableEmpty,
  errorState,
  openModal
} from '../ui.js';
import { showSaleDetails } from '../actions.js';

export default {
  async render(el) {
    let dashboard;
    try {
      const response = await api.get('/reports/dashboard');
      dashboard = response.data;
    } catch (error) {
      el.innerHTML = errorState(error.message, 'Dashboard unavailable');
      return;
    }

    const lowStockRows = dashboard.lowStock.length
      ? dashboard.lowStock
          .map(
            (item) => `
            <tr>
              <td class="table-strong">${escapeHtml(item.fruit_name)}</td>
              <td>${sizeBadge(item.packaging_size)}</td>
              <td><span class="chip ${Number(item.available_quantity) <= 5 ? 'warn' : ''}">${quantity(item.available_quantity)} boxes left</span></td>
            </tr>`
          )
          .join('')
      : tableEmpty(3, 'Stock levels are healthy', 'No fruit is at or below the low-stock threshold.', 'check');

    const recentRows = dashboard.recentSales.length
      ? dashboard.recentSales
          .map(
            (sale) => `
            <tr>
              <td class="table-strong">#${sale.sale_id}</td>
              <td>
                <div class="table-title">
                  <span class="avatar-sm">${escapeHtml(sale.vendor_name.slice(0, 2).toUpperCase())}</span>
                  <span>${escapeHtml(sale.vendor_name)}</span>
                </div>
              </td>
              <td class="nowrap">${formatDate(sale.sale_date)}</td>
              <td class="num money">${money(sale.total_amount)}</td>
              <td>${statusBadge(sale.payment_status)}</td>
              <td><div class="actions"><button class="action-btn" data-open-sale="${sale.sale_id}" title="View sale">${icon('eye', 15)}</button></div></td>
            </tr>`
          )
          .join('')
      : tableEmpty(6, 'No sales yet', 'Record your first sale to see it here.', 'sales');

    el.innerHTML = `
      <section class="ledger-hero">
        <div class="ledger-hero-main">
          <span class="ledger-kicker">${icon('leaf', 13)} Field note · ${formatDate(new Date())}</span>
          <h2>Every box accounted for, <em>from farm gate to market stall.</em></h2>
          <p>Batloung Farm buys fruit across South Africa and distributes it in Lesotho. Stock, sales, vendors and payments are kept in one continuous ledger.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="/sales" data-nav>${icon('plus', 16)} New sale</a>
            <a class="btn btn-secondary" href="/purchases" data-nav>${icon('purchases', 16)} Record purchase</a>
            <a class="btn btn-secondary" href="/vendors" data-nav>${icon('vendors', 16)} Add vendor</a>
          </div>
        </div>
        <aside class="ledger-hero-side">
          <span class="ledger-side-label">Revenue today</span>
          <strong class="ledger-hero-figure">${money(dashboard.today_revenue)}</strong>
          <span class="ledger-side-note">${formatDate(new Date())} · Maseru ledger</span>
          <dl class="ledger-hero-stats">
            <div><dt>Boxes on hand</dt><dd>${quantity(dashboard.total_boxes)}</dd></div>
            <div><dt>Outstanding</dt><dd>${money(dashboard.total_outstanding)}</dd></div>
            <div><dt>Low-stock lines</dt><dd>${quantity(dashboard.low_stock_count)}</dd></div>
          </dl>
        </aside>
      </section>

      <div class="stat-grid">
        <article class="stat-card">
          <span class="stat-index">01</span>
          <div class="stat-top"><span class="stat-label">Stock on hand</span></div>
          <div class="stat-value">${quantity(dashboard.total_boxes)}</div>
          <div class="stat-meta">Boxes across all fruits and packaging sizes</div>
        </article>
        <article class="stat-card ${Number(dashboard.low_stock_count) > 0 ? 'red' : ''}">
          <span class="stat-index">02</span>
          <div class="stat-top"><span class="stat-label">Low stock alerts</span></div>
          <div class="stat-value">${quantity(dashboard.low_stock_count)}</div>
          <div class="stat-meta">Fruit and packaging combinations needing attention</div>
        </article>
        <article class="stat-card blue">
          <span class="stat-index">03</span>
          <div class="stat-top"><span class="stat-label">Revenue this month</span></div>
          <div class="stat-value">${money(dashboard.month_revenue)}</div>
          <div class="stat-meta">All-time revenue: ${money(dashboard.total_revenue)}</div>
        </article>
        <article class="stat-card ${Number(dashboard.total_outstanding) > 0 ? 'amber' : ''}">
          <span class="stat-index">04</span>
          <div class="stat-top"><span class="stat-label">Outstanding payments</span></div>
          <div class="stat-value">${money(dashboard.total_outstanding)}</div>
          <div class="stat-meta">Collected to date: ${money(dashboard.total_collected)}</div>
        </article>
      </div>

      <div class="ledger-grid">
        <section class="card ledger-card">
          <div class="card-header">
            <div>
              <span class="card-index">01 / Watchlist</span>
              <h2>Low stock watchlist</h2>
              <p>Packaging balances at or below the reorder threshold.</p>
            </div>
            <div class="card-actions"><button type="button" class="btn btn-secondary btn-sm" id="viewLowStock">Open ledger ${icon('arrowRight', 14)}</button></div>
          </div>
          <div class="table-wrap ledger-table">
            <table>
              <thead><tr><th>Fruit</th><th>Pack</th><th>Available</th></tr></thead>
              <tbody>${lowStockRows}</tbody>
            </table>
          </div>
        </section>

        <section class="card ledger-card">
          <div class="card-header">
            <div>
              <span class="card-index">02 / Movements</span>
              <h2>Recent sales</h2>
              <p>The latest transactions recorded for Batloung Farm.</p>
            </div>
            <div class="card-actions"><button type="button" class="btn btn-secondary btn-sm" id="viewRecentSales">Open ledger ${icon('arrowRight', 14)}</button></div>
          </div>
          <div class="table-wrap ledger-table">
            <table>
              <thead><tr><th>Sale</th><th>Vendor</th><th>Date</th><th class="num">Total</th><th>Status</th><th></th></tr></thead>
              <tbody>${recentRows}</tbody>
            </table>
          </div>
        </section>
      </div>

      <div class="grid-3 ledger-meta-grid">
        <section class="card">
          <div class="card-header">
            <div>
              <span class="card-index">03 / Network</span>
              <h2>Distribution network</h2>
              <p>Current records in the system.</p>
            </div>
          </div>
          <div class="detail-grid">
            <div class="detail-item"><span class="label">Suppliers</span><span class="value">${quantity(dashboard.suppliers)}</span></div>
            <div class="detail-item"><span class="label">Fruit types</span><span class="value">${quantity(dashboard.fruits)}</span></div>
            <div class="detail-item"><span class="label">Vendors</span><span class="value">${quantity(dashboard.vendors)}</span></div>
            <div class="detail-item"><span class="label">Sales recorded</span><span class="value">${quantity(dashboard.sales)}</span></div>
          </div>
        </section>
        <section class="card">
          <div class="card-header">
            <div>
              <span class="card-index">04 / Today</span>
              <h2>Today at a glance</h2>
              <p>Live sales performance.</p>
            </div>
          </div>
          <div class="detail-grid">
            <div class="detail-item span-2"><span class="label">Revenue today</span><span class="value ledger-inline-figure">${money(dashboard.today_revenue)}</span></div>
            <div class="detail-item"><span class="label">Purchases</span><span class="value">${quantity(dashboard.purchases)}</span></div>
            <div class="detail-item"><span class="label">Sales</span><span class="value">${quantity(dashboard.sales)}</span></div>
          </div>
        </section>
        <section class="card">
          <div class="card-header">
            <div>
              <span class="card-index">05 / Actions</span>
              <h2>Quick links</h2>
              <p>Common administrator tasks.</p>
            </div>
          </div>
          <div class="stack" style="gap:8px">
            <a class="btn btn-secondary btn-block" href="/suppliers" data-nav>${icon('suppliers', 16)} Manage suppliers</a>
            <a class="btn btn-secondary btn-block" href="/purchases" data-nav>${icon('purchases', 16)} Record a purchase</a>
            <a class="btn btn-secondary btn-block" href="/payments" data-nav>${icon('payments', 16)} Follow up payments</a>
            <a class="btn btn-secondary btn-block" href="/reports" data-nav>${icon('reports', 16)} Open reports</a>
          </div>
        </section>
      </div>`;

    el.querySelector('#viewLowStock').addEventListener('click', () => {
      openModal({
        title: 'Low stock watchlist',
        subtitle: `${dashboard.lowStock.length} line(s) at or below the reorder threshold`,
        size: 'lg',
        body: `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Fruit</th><th>Packaging</th><th>Available</th></tr></thead>
              <tbody>${lowStockRows}</tbody>
            </table>
          </div>`,
        footer: `<button type="button" class="btn btn-secondary" data-close>Close</button>`
      });
    });

    el.querySelector('#viewRecentSales').addEventListener('click', () => {
      const overlay = openModal({
        title: 'Recent sales',
        subtitle: `The latest ${dashboard.recentSales.length} sale(s) recorded`,
        size: 'xl',
        body: `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Sale</th><th>Vendor</th><th>Date</th><th class="num">Total</th><th>Status</th><th></th></tr></thead>
              <tbody>${recentRows}</tbody>
            </table>
          </div>`,
        footer: `<button type="button" class="btn btn-secondary" data-close>Close</button>`
      });

      overlay.querySelectorAll('[data-open-sale]').forEach((button) => {
        button.addEventListener('click', () => {
          showSaleDetails(Number(button.dataset.openSale), { onUpdated: () => this.render(el) });
        });
      });
    });
  }
};

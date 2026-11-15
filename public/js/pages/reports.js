import { api, buildQuery } from '../api.js';
import {
  icon,
  money,
  quantity,
  escapeHtml,
  sizeBadge,
  todayISO,
  loadingState,
  openModal,
  toast,
  setButtonBusy,
  resetButton
} from '../ui.js';

function firstOfMonthISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function fruitBars(rows) {
  const maxBoxes = Math.max(...rows.map((row) => Number(row.total_boxes)), 1);
  return `
    <div class="bar-list">
      ${rows
        .map(
          (row, index) => `
          <div class="bar-row">
            <div class="bar-label"><span class="rank ${index === 0 ? 'top' : ''}">${index + 1}</span><span>${escapeHtml(row.fruit_name)}</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.max((Number(row.total_boxes) / maxBoxes) * 100, 3)}%"></div></div>
            <div class="bar-value">${quantity(row.total_boxes)} boxes</div>
          </div>`
        )
        .join('')}
    </div>`;
}

function fruitTable(rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Rank</th><th>Fruit</th><th class="num">Boxes sold</th><th class="num">Revenue</th></tr></thead>
        <tbody>
          ${rows
            .map(
              (row, index) => `
              <tr>
                <td><span class="rank ${index === 0 ? 'top' : ''}">${index + 1}</span></td>
                <td class="table-strong">${escapeHtml(row.fruit_name)}</td>
                <td class="num">${quantity(row.total_boxes)}</td>
                <td class="num money">${money(row.revenue)}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

function vendorTable(rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Rank</th><th>Vendor</th><th class="num">Orders</th><th class="num">Boxes</th><th class="num">Revenue</th></tr></thead>
        <tbody>
          ${rows
            .map(
              (vendor, index) => `
              <tr>
                <td><span class="rank ${index === 0 ? 'top' : ''}">${index + 1}</span></td>
                <td>
                  <span class="table-strong">${escapeHtml(vendor.vendor_name)}</span>
                  <span class="table-sub">${escapeHtml(vendor.phone_number)}</span>
                </td>
                <td class="num">${quantity(vendor.order_count)}</td>
                <td class="num">${quantity(vendor.total_boxes)}</td>
                <td class="num money">${money(vendor.revenue)}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

function stockTable(rows) {
  if (!rows.length) {
    return `<div class="empty-state"><div class="empty-icon">${icon('box', 21)}</div><strong>No stock records</strong><p>This packaging size has no stock rows.</p></div>`;
  }

  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Fruit</th><th>Packaging</th><th class="num">Available boxes</th><th class="num">Selling price</th><th class="num">Stock value</th></tr></thead>
        <tbody>
          ${rows
            .map(
              (row) => `
              <tr>
                <td class="table-strong">${escapeHtml(row.fruit_name)}</td>
                <td>${sizeBadge(row.packaging_size)}</td>
                <td class="num">${quantity(row.available_quantity)}</td>
                <td class="num">${row.selling_price ? money(row.selling_price) : '—'}</td>
                <td class="num money">${money(row.stock_value)}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

export default {
  async render(el) {
    let topFruitRows = [];
    let topVendorRows = [];
    let stockRows = [];

    el.innerHTML = `
      <section class="card" style="margin-bottom:18px">
        <div class="card-header">
          <div><h2>Sales revenue by date range</h2><p id="revenueRange">Revenue for the selected period.</p></div>
        </div>
        <form class="report-date-form" id="revenueForm">
          <div class="form-field">
            <label for="revenueStart">Start date</label>
            <input id="revenueStart" name="start_date" type="date" value="${firstOfMonthISO()}" required>
          </div>
          <div class="form-field">
            <label for="revenueEnd">End date</label>
            <input id="revenueEnd" name="end_date" type="date" value="${todayISO()}" required>
          </div>
          <button type="submit" class="btn btn-primary" id="runRevenueBtn">${icon('reports', 16)} Calculate revenue</button>
        </form>
        <div id="revenueResult">${loadingState('Calculating revenue...')}</div>
      </section>

      <div class="grid-2" style="margin-bottom:18px">
        <section class="card">
          <div class="card-header">
            <div><h2>Five most frequently sold fruits</h2><p>Ranked by total boxes sold across all packaging sizes.</p></div>
            <div class="card-actions">
              <button type="button" class="btn btn-secondary btn-sm" id="viewFruitsReport">${icon('eye', 15)} View report</button>
            </div>
          </div>
          <div id="topFruitsSummary">${loadingState('Loading top fruits...')}</div>
        </section>

        <section class="card">
          <div class="card-header">
            <div><h2>Vendors by boxes purchased</h2><p>Ranked by the number of boxes bought from the farm.</p></div>
            <div class="card-actions">
              <button type="button" class="btn btn-secondary btn-sm" id="viewVendorsReport">${icon('eye', 15)} View report</button>
            </div>
          </div>
          <div id="topVendorsSummary">${loadingState('Loading vendor ranking...')}</div>
        </section>
      </div>

      <section class="card">
        <div class="card-header">
          <div><h2>Current stock levels</h2><p id="stockSummary">Stock separated by fruit and packaging size.</p></div>
          <div class="card-actions">
            <button type="button" class="btn btn-secondary btn-sm" id="viewStockReport">${icon('eye', 15)} View stock report</button>
          </div>
        </div>
        <div id="stockOverview">${loadingState('Loading stock report...')}</div>
      </section>`;

    const revenueResult = el.querySelector('#revenueResult');
    const revenueRange = el.querySelector('#revenueRange');
    const revenueForm = el.querySelector('#revenueForm');
    const runRevenueButton = el.querySelector('#runRevenueBtn');
    const topFruitsSummary = el.querySelector('#topFruitsSummary');
    const topVendorsSummary = el.querySelector('#topVendorsSummary');
    const stockOverview = el.querySelector('#stockOverview');
    const stockSummary = el.querySelector('#stockSummary');

    async function loadRevenue(startDate, endDate) {
      revenueResult.innerHTML = loadingState('Calculating revenue...');
      try {
        const response = await api.get(
          `/reports/revenue${buildQuery({ start_date: startDate, end_date: endDate })}`
        );
        const data = response.data;
        revenueRange.textContent = `Revenue from ${startDate || 'the beginning'} to ${endDate || 'today'}.`;
        revenueResult.innerHTML = `
          <div class="report-result">
            <div class="report-metric"><span class="label">Total revenue</span><span class="value">${money(data.total_revenue)}</span></div>
            <div class="report-metric"><span class="label">Sales recorded</span><span class="value">${quantity(data.sale_count)}</span></div>
            <div class="report-metric"><span class="label">Amount collected</span><span class="value">${money(data.amount_collected)}</span></div>
            <div class="report-metric"><span class="label">Outstanding</span><span class="value text-danger">${money(data.outstanding)}</span></div>
          </div>
          <p class="form-help" style="margin-top:10px">Average sale value: ${money(data.average_sale)}</p>`;
      } catch (error) {
        revenueResult.innerHTML = `<div class="form-alert">${escapeHtml(error.message)}</div>`;
      }
    }

    async function loadTopFruits() {
      try {
        const response = await api.get('/reports/top-fruits?limit=5');
        topFruitRows = response.data;
        if (!topFruitRows.length) {
          topFruitsSummary.innerHTML = `<div class="empty-state"><div class="empty-icon">${icon('fruits', 21)}</div><strong>No sales data yet</strong><p>Record sales to generate this report.</p></div>`;
          return;
        }

        const top = topFruitRows[0];
        const totalBoxes = topFruitRows.reduce((sum, row) => sum + Number(row.total_boxes), 0);
        const totalRevenue = topFruitRows.reduce((sum, row) => sum + Number(row.revenue), 0);
        topFruitsSummary.innerHTML = `
          <div class="summary-strip">
            <div><span class="label">Top fruit</span><span class="value small">${escapeHtml(top.fruit_name)}</span></div>
            <div><span class="label">Boxes sold</span><span class="value">${quantity(totalBoxes)}</span></div>
            <div><span class="label">Revenue</span><span class="value small">${money(totalRevenue)}</span></div>
          </div>
          <div class="payment-note">${icon('info', 15)} Open the report to see all five fruit rankings and revenue.</div>`;
      } catch (error) {
        topFruitsSummary.innerHTML = `<div class="form-alert">${escapeHtml(error.message)}</div>`;
      }
    }

    async function loadTopVendors() {
      try {
        const response = await api.get('/reports/top-vendors?limit=5');
        topVendorRows = response.data;
        if (!topVendorRows.length) {
          topVendorsSummary.innerHTML = `<div class="empty-state"><div class="empty-icon">${icon('vendors', 21)}</div><strong>No vendor sales yet</strong><p>Record sales to generate this report.</p></div>`;
          return;
        }

        const top = topVendorRows[0];
        const totalBoxes = topVendorRows.reduce((sum, row) => sum + Number(row.total_boxes), 0);
        const totalRevenue = topVendorRows.reduce((sum, row) => sum + Number(row.revenue), 0);
        topVendorsSummary.innerHTML = `
          <div class="summary-strip">
            <div><span class="label">Top vendor</span><span class="value small">${escapeHtml(top.vendor_name)}</span></div>
            <div><span class="label">Boxes purchased</span><span class="value">${quantity(totalBoxes)}</span></div>
            <div><span class="label">Revenue</span><span class="value small">${money(totalRevenue)}</span></div>
          </div>
          <div class="payment-note">${icon('info', 15)} Open the report to see the complete vendor ranking.</div>`;
      } catch (error) {
        topVendorsSummary.innerHTML = `<div class="form-alert">${escapeHtml(error.message)}</div>`;
      }
    }

    async function loadStock() {
      stockOverview.innerHTML = loadingState('Loading stock report...');
      try {
        const response = await api.get('/reports/stock');
        stockRows = response.data;
        const totalBoxes = stockRows.reduce((sum, row) => sum + Number(row.available_quantity), 0);
        const totalValue = stockRows.reduce((sum, row) => sum + Number(row.stock_value), 0);
        stockSummary.textContent = `${stockRows.length} stock line(s) · ${quantity(totalBoxes)} boxes on hand · ${money(totalValue)} stock value.`;
        stockOverview.innerHTML = `
          <div class="summary-strip">
            <div><span class="label">Stock lines</span><span class="value">${quantity(stockRows.length)}</span></div>
            <div><span class="label">Boxes on hand</span><span class="value">${quantity(totalBoxes)}</span></div>
            <div><span class="label">Stock value</span><span class="value small">${money(totalValue)}</span></div>
          </div>
          <div class="payment-note">${icon('info', 15)} Open the stock report to filter by packaging size and inspect every stock line.</div>`;
      } catch (error) {
        stockOverview.innerHTML = `<div class="form-alert">${escapeHtml(error.message)}</div>`;
      }
    }

    function openFruitsReport() {
      if (!topFruitRows.length) {
        toast('There is no fruit sales data to report yet.', 'info');
        return;
      }

      const totalRevenue = topFruitRows.reduce((sum, row) => sum + Number(row.revenue), 0);
      openModal({
        title: 'Fruit sales report',
        subtitle: `Top ${topFruitRows.length} fruits by boxes sold · ${money(totalRevenue)} revenue`,
        size: 'lg',
        body: `${fruitBars(topFruitRows)}${fruitTable(topFruitRows)}`,
        footer: `<button type="button" class="btn btn-secondary" data-close>Close</button>`
      });
    }

    function openVendorsReport() {
      if (!topVendorRows.length) {
        toast('There is no vendor sales data to report yet.', 'info');
        return;
      }

      const top = topVendorRows[0];
      openModal({
        title: 'Vendor purchase report',
        subtitle: `${topVendorRows.length} vendors ranked by boxes purchased`,
        size: 'lg',
        body: `
          <div class="summary-strip" style="margin-bottom:16px">
            <div><span class="label">Top vendor</span><span class="value small">${escapeHtml(top.vendor_name)}</span></div>
            <div><span class="label">Boxes purchased</span><span class="value">${quantity(top.total_boxes)}</span></div>
            <div><span class="label">Revenue</span><span class="value small">${money(top.revenue)}</span></div>
          </div>
          ${vendorTable(topVendorRows)}`,
        footer: `<button type="button" class="btn btn-secondary" data-close>Close</button>`
      });
    }

    function openStockReport() {
      const overlay = openModal({
        title: 'Current stock report',
        subtitle: 'Every fruit and packaging size with its current quantity and value.',
        size: 'lg',
        body: `
          <div class="card-actions" style="margin-bottom:14px">
            <select class="select-control" id="modalStockSize" aria-label="Filter stock by packaging size">
              <option value="">All packaging sizes</option>
              <option value="SMALL">Small</option>
              <option value="MEDIUM">Medium</option>
              <option value="LARGE">Large</option>
            </select>
          </div>
          <div id="modalStockBody">${stockTable(stockRows)}</div>`,
        footer: `<button type="button" class="btn btn-secondary" data-close>Close</button>`
      });

      const sizeSelect = overlay.querySelector('#modalStockSize');
      const body = overlay.querySelector('#modalStockBody');
      sizeSelect.addEventListener('change', () => {
        const filtered = sizeSelect.value
          ? stockRows.filter((row) => row.packaging_size === sizeSelect.value)
          : stockRows;
        body.innerHTML = stockTable(filtered);
      });
    }

    revenueForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(revenueForm);
      const start = formData.get('start_date');
      const end = formData.get('end_date');
      if (start > end) {
        toast('Start date cannot be after the end date.', 'error');
        return;
      }
      setButtonBusy(runRevenueButton, 'Calculating...');
      await loadRevenue(start, end);
      resetButton(runRevenueButton);
    });

    el.querySelector('#viewFruitsReport').addEventListener('click', openFruitsReport);
    el.querySelector('#viewVendorsReport').addEventListener('click', openVendorsReport);
    el.querySelector('#viewStockReport').addEventListener('click', openStockReport);

    await Promise.all([
      loadRevenue(firstOfMonthISO(), todayISO()),
      loadTopFruits(),
      loadTopVendors(),
      loadStock()
    ]);
  }
};

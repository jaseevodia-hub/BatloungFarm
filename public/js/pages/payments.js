import { api } from '../api.js';
import {
  icon,
  money,
  quantity,
  escapeHtml,
  formatDate,
  formatDateTime,
  methodLabel,
  statusBadge,
  loadingState,
  tableEmpty,
  toast,
  openModal,
  closeModal,
  setButtonBusy,
  resetButton
} from '../ui.js';
import { openRecordPaymentModal } from '../actions.js';

export default {
  async render(el) {
    const refresh = () => this.render(el);
    let allPayments = [];
    let outstandingSales = [];
    let outstandingVendors = [];
    let summary = null;

    el.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-spacer"></div>
        <button type="button" class="btn btn-primary" id="recordPaymentBtn">${icon('money', 16)} Record payment</button>
      </div>
      <div id="paymentContent">${loadingState('Loading payments...')}</div>`;

    const contentRoot = el.querySelector('#paymentContent');
    const recordButton = el.querySelector('#recordPaymentBtn');

    function renderOutstandingVendorRows() {
      if (!outstandingVendors.length) {
        return tableEmpty(5, 'No outstanding balances', 'Every vendor sale has been paid in full.', 'check');
      }

      return outstandingVendors
        .map(
          (vendor) => `
          <tr>
            <td>
              <div class="table-title">
                <span class="avatar-sm">${escapeHtml(vendor.vendor_name.slice(0, 2).toUpperCase())}</span>
                <div>
                  <span class="table-strong">${escapeHtml(vendor.vendor_name)}</span>
                  <span class="table-sub">${escapeHtml(vendor.location)}</span>
                </div>
              </div>
            </td>
            <td class="nowrap">${escapeHtml(vendor.phone_number)}</td>
            <td class="num">${quantity(vendor.unpaid_sales)}</td>
            <td class="num"><span class="badge unpaid">${money(vendor.outstanding_balance)}</span></td>
            <td><div class="actions"><button class="action-btn" data-view-vendor="${vendor.vendor_id}" title="View outstanding sales">${icon('eye', 15)}</button></div></td>
          </tr>`
        )
        .join('');
    }

    function renderOutstandingSaleRows() {
      if (!outstandingSales.length) {
        return tableEmpty(8, 'No unpaid sales', 'All sales are fully paid.', 'check');
      }

      return outstandingSales
        .map(
          (sale) => `
          <tr>
            <td class="table-strong">#${sale.sale_id}</td>
            <td>
              <div class="table-title">
                <span class="avatar-sm">${escapeHtml(sale.vendor_name.slice(0, 2).toUpperCase())}</span>
                <div>
                  <span class="table-strong">${escapeHtml(sale.vendor_name)}</span>
                  <span class="table-sub">${escapeHtml(sale.phone_number)}</span>
                </div>
              </div>
            </td>
            <td class="nowrap">${formatDate(sale.sale_date)}</td>
            <td class="num">${money(sale.total_amount)}</td>
            <td class="num text-success">${money(sale.amount_paid)}</td>
            <td class="num text-danger" style="font-weight:700">${money(sale.balance)}</td>
            <td>${statusBadge(sale.payment_status)}</td>
            <td><div class="actions"><button class="action-btn money" data-pay-sale="${sale.sale_id}" data-balance="${sale.balance}" data-vendor="${escapeHtml(sale.vendor_name)}" title="Record payment">${icon('money', 15)}</button></div></td>
          </tr>`
        )
        .join('');
    }

    function historyTable(rows, filtered = false) {
      if (!rows.length) {
        return `<div class="table-wrap"><table><tbody>${tableEmpty(6, 'No payments found', filtered ? 'No payments match the current filters.' : 'Recorded payments will appear here.', 'payments')}</tbody></table></div>`;
      }

      return `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Sale</th><th>Vendor</th><th>Method</th><th>Reference</th><th class="num">Amount</th></tr></thead>
            <tbody>
              ${rows
                .map(
                  (payment) => `
                  <tr>
                    <td class="nowrap">${formatDateTime(payment.payment_date)}</td>
                    <td class="table-strong">#${payment.sale_id}</td>
                    <td>${escapeHtml(payment.vendor_name)}</td>
                    <td><span class="chip">${methodLabel(payment.payment_method)}</span></td>
                    <td class="text-muted">${escapeHtml(payment.reference || '—')}</td>
                    <td class="num money">${money(payment.amount)}</td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>`;
    }

    function renderPage() {
      contentRoot.innerHTML = `
        <div class="stat-grid">
          <article class="stat-card red">
            <div class="stat-top"><span class="stat-label">Total outstanding</span><span class="stat-icon">${icon('alert', 19)}</span></div>
            <div class="stat-value">${money(summary.total_outstanding)}</div>
            <div class="stat-meta">${quantity(summary.outstanding_sales)} sale(s) awaiting payment</div>
          </article>
          <article class="stat-card blue">
            <div class="stat-top"><span class="stat-label">Collected this month</span><span class="stat-icon">${icon('money', 19)}</span></div>
            <div class="stat-value">${money(summary.collected_this_month)}</div>
            <div class="stat-meta">Cash and mobile money receipts</div>
          </article>
          <article class="stat-card">
            <div class="stat-top"><span class="stat-label">Collected all time</span><span class="stat-icon">${icon('payments', 19)}</span></div>
            <div class="stat-value">${money(summary.total_collected)}</div>
            <div class="stat-meta">${quantity(summary.payment_count)} payment(s) recorded</div>
          </article>
          <article class="stat-card amber">
            <div class="stat-top"><span class="stat-label">Vendors with balance</span><span class="stat-icon">${icon('vendors', 19)}</span></div>
            <div class="stat-value">${quantity(outstandingVendors.length)}</div>
            <div class="stat-meta">Follow up on outstanding credit</div>
          </article>
        </div>

        <div class="grid-3" style="margin-top:18px">
          <section class="card">
            <div class="card-header">
              <div><h2>Vendor balances</h2><p>${outstandingVendors.length} vendor(s) with unpaid sales.</p></div>
              <div class="card-actions"><button type="button" class="btn btn-secondary btn-sm" id="viewVendorsOutstanding">${icon('eye', 15)} Open</button></div>
            </div>
            <div class="card-summary-value">
              <strong>${money(summary.total_outstanding)}</strong>
              <span>Total outstanding</span>
            </div>
          </section>

          <section class="card">
            <div class="card-header">
              <div><h2>Unpaid sales</h2><p>${quantity(summary.outstanding_sales)} sale(s) awaiting payment.</p></div>
              <div class="card-actions"><button type="button" class="btn btn-secondary btn-sm" id="viewUnpaidSales">${icon('eye', 15)} Open</button></div>
            </div>
            <div class="card-summary-value">
              <strong>${money(summary.total_outstanding)}</strong>
              <span>Balance to collect</span>
            </div>
          </section>

          <section class="card">
            <div class="card-header">
              <div><h2>Payment history</h2><p>${quantity(summary.payment_count)} payment(s) recorded.</p></div>
              <div class="card-actions"><button type="button" class="btn btn-secondary btn-sm" id="viewPaymentHistory">${icon('eye', 15)} Open</button></div>
            </div>
            <div class="card-summary-value">
              <strong>${money(summary.total_collected)}</strong>
              <span>Collected all time</span>
            </div>
          </section>
        </div>`;

      attachContentListeners();
    }

    function showVendorOutstanding(vendorId) {
      const vendor = outstandingVendors.find((item) => Number(item.vendor_id) === Number(vendorId));
      const sales = outstandingSales.filter((sale) => Number(sale.vendor_id) === Number(vendorId));

      if (!vendor || !sales.length) {
        toast('This vendor has no outstanding sales.', 'info');
        return;
      }

      const rows = sales
        .map(
          (sale) => `
          <tr>
            <td class="table-strong">#${sale.sale_id}</td>
            <td>${formatDate(sale.sale_date)}</td>
            <td class="num">${money(sale.total_amount)}</td>
            <td class="num text-success">${money(sale.amount_paid)}</td>
            <td class="num text-danger">${money(sale.balance)}</td>
            <td>${statusBadge(sale.payment_status)}</td>
            <td><div class="actions"><button class="action-btn money" data-pay-sale="${sale.sale_id}" data-balance="${sale.balance}" data-vendor="${escapeHtml(vendor.vendor_name)}" title="Record payment">${icon('money', 15)}</button></div></td>
          </tr>`
        )
        .join('');

      const overlay = openModal({
        title: vendor.vendor_name,
        subtitle: `${money(vendor.outstanding_balance)} outstanding across ${vendor.unpaid_sales} sale(s)`,
        size: 'lg',
        body: `
          <div class="detail-grid" style="margin-bottom:16px">
            <div class="detail-item"><span class="label">Phone</span><span class="value">${escapeHtml(vendor.phone_number)}</span></div>
            <div class="detail-item"><span class="label">Location</span><span class="value">${escapeHtml(vendor.location)}</span></div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Sale</th><th>Date</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Status</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`,
        footer: `<button type="button" class="btn btn-secondary" data-close>Close</button>`
      });

      attachSalePayButtons(overlay);
    }

    function openVendorsOutstanding() {
      const overlay = openModal({
        title: 'Vendor outstanding balances',
        subtitle: `${outstandingVendors.length} vendor(s) · ${money(summary.total_outstanding)} outstanding`,
        size: 'lg',
        body: `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Vendor</th><th>Phone</th><th class="num">Unpaid sales</th><th class="num">Outstanding</th><th></th></tr></thead>
              <tbody>${renderOutstandingVendorRows()}</tbody>
            </table>
          </div>`,
        footer: `<button type="button" class="btn btn-secondary" data-close>Close</button>`
      });

      overlay.querySelectorAll('[data-view-vendor]').forEach((button) => {
        button.addEventListener('click', () => {
          closeModal();
          showVendorOutstanding(button.dataset.viewVendor);
        });
      });
    }

    function openUnpaidSales() {
      const overlay = openModal({
        title: 'Sales awaiting payment',
        subtitle: `${outstandingSales.length} sale(s) · ${money(summary.total_outstanding)} outstanding`,
        size: 'xl',
        body: `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Sale</th><th>Vendor</th><th>Date</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Status</th><th></th></tr></thead>
              <tbody>${renderOutstandingSaleRows()}</tbody>
            </table>
          </div>`,
        footer: `<button type="button" class="btn btn-secondary" data-close>Close</button>`
      });

      attachSalePayButtons(overlay);
    }

    function openPaymentHistory() {
      const overlay = openModal({
        title: 'Payment history',
        subtitle: `${allPayments.length} payment(s) · ${money(summary.total_collected)} collected`,
        size: 'xl',
        body: `
          <div class="report-date-form" style="margin-bottom:14px">
            <div class="form-field" style="flex:1;min-width:240px">
              <label for="paymentSearchFilter">Search</label>
              <div class="search-box">${icon('search', 16)}<input id="paymentSearchFilter" type="search" placeholder="Sale #, vendor or reference" autocomplete="off"></div>
            </div>
            <div class="form-field">
              <label for="paymentHistoryMethodFilter">Payment method</label>
              <select id="paymentHistoryMethodFilter">
                <option value="">All payment methods</option>
                <option value="CASH">Cash</option>
                <option value="MOBILE_MONEY">Mobile money</option>
              </select>
            </div>
          </div>
          <div id="paymentHistoryTable"></div>`,
        footer: `<button type="button" class="btn btn-secondary" data-close>Close</button>`
      });

      const methodFilter = overlay.querySelector('#paymentHistoryMethodFilter');
      const searchFilter = overlay.querySelector('#paymentSearchFilter');
      const tableRoot = overlay.querySelector('#paymentHistoryTable');

      function renderHistory() {
        const term = searchFilter.value.trim().toLowerCase();
        const rows = allPayments.filter((payment) => {
          if (methodFilter.value && payment.payment_method !== methodFilter.value) return false;
          if (!term) return true;
          return [payment.sale_id, payment.vendor_name, payment.reference, payment.payment_method].some(
            (value) => String(value || '').toLowerCase().includes(term)
          );
        });
        tableRoot.innerHTML = historyTable(rows, Boolean(methodFilter.value || term));
      }

      methodFilter.addEventListener('change', renderHistory);
      searchFilter.addEventListener('input', renderHistory);
      renderHistory();
    }

    function attachSalePayButtons(root) {
      root.querySelectorAll('[data-pay-sale]').forEach((button) => {
        button.addEventListener('click', () => {
          openRecordPaymentModal({
            saleId: Number(button.dataset.paySale),
            balance: Number(button.dataset.balance),
            vendorName: button.dataset.vendor,
            onSuccess: refresh
          });
        });
      });
    }

    function openPaymentPicker() {
      if (!outstandingSales.length) {
        toast('There are no outstanding sales to pay.', 'info');
        return;
      }

      const options = outstandingSales
        .map(
          (sale) =>
            `<option value="${sale.sale_id}" data-balance="${sale.balance}">Sale #${sale.sale_id} — ${escapeHtml(sale.vendor_name)} — balance ${money(sale.balance)}</option>`
        )
        .join('');

      const overlay = openModal({
        title: 'Record payment',
        subtitle: 'Choose an outstanding sale and capture the amount received.',
        body: `
          <form id="pickerPaymentForm" class="form-grid">
            <div class="form-field span-2">
              <label for="pickerSale">Outstanding sale <span class="req">*</span></label>
              <select id="pickerSale" name="sale_id" required>${options}</select>
            </div>
            <div class="form-field">
              <label for="pickerAmount">Payment amount <span class="req">*</span></label>
              <div class="input-prefix"><span>M</span><input id="pickerAmount" name="amount" type="number" min="0.01" step="0.01" required></div>
            </div>
            <div class="form-field">
              <label for="pickerMethod">Payment method <span class="req">*</span></label>
              <select id="pickerMethod" name="payment_method" required>
                <option value="CASH">Cash</option>
                <option value="MOBILE_MONEY">Mobile money</option>
              </select>
            </div>
            <div class="form-field span-2">
              <label for="pickerReference">Reference</label>
              <input id="pickerReference" name="reference" maxlength="80" placeholder="e.g. M-PESA-1024">
            </div>
          </form>`,
        footer: `
          <button type="button" class="btn btn-secondary" data-close>Cancel</button>
          <button type="submit" form="pickerPaymentForm" class="btn btn-primary" id="savePickerPayment">${icon('check', 16)} Save payment</button>`
      });

      const form = overlay.querySelector('#pickerPaymentForm');
      const saleSelect = overlay.querySelector('#pickerSale');
      const amountInput = overlay.querySelector('#pickerAmount');
      const saveButton = overlay.querySelector('#savePickerPayment');

      function syncBalance() {
        const option = saleSelect.selectedOptions[0];
        amountInput.value = Number(option.dataset.balance).toFixed(2);
        amountInput.max = option.dataset.balance;
      }

      saleSelect.addEventListener('change', syncBalance);
      syncBalance();

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        setButtonBusy(saveButton, 'Saving...');
        try {
          const response = await api.post('/payments', {
            sale_id: Number(data.sale_id),
            amount: Number(data.amount),
            payment_method: data.payment_method,
            reference: data.reference
          });
          toast(response.message || 'Payment recorded.');
          closeModal();
          await refresh();
        } catch (error) {
          toast(error.message, 'error');
          resetButton(saveButton);
        }
      });
    }

    function attachContentListeners() {
      contentRoot.querySelector('#viewVendorsOutstanding').addEventListener('click', openVendorsOutstanding);
      contentRoot.querySelector('#viewUnpaidSales').addEventListener('click', openUnpaidSales);
      contentRoot.querySelector('#viewPaymentHistory').addEventListener('click', openPaymentHistory);
    }

    try {
      const [summaryResponse, vendorsResponse, salesResponse, paymentsResponse] = await Promise.all([
        api.get('/payments/summary'),
        api.get('/payments/outstanding'),
        api.get('/payments/outstanding-sales'),
        api.get('/payments')
      ]);
      summary = summaryResponse.data;
      outstandingVendors = vendorsResponse.data;
      outstandingSales = salesResponse.data;
      allPayments = paymentsResponse.data;
      renderPage();
    } catch (error) {
      contentRoot.innerHTML = `
        <div class="card">
          <div class="empty-state">
            <div class="empty-icon">${icon('alert', 21)}</div>
            <strong>Could not load payments</strong>
            <p>${escapeHtml(error.message)}</p>
            <button type="button" class="btn btn-secondary" data-retry>${icon('refresh', 16)} Try again</button>
          </div>
        </div>`;
      return;
    }

    recordButton.addEventListener('click', openPaymentPicker);
  }
};

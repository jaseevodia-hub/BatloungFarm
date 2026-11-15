import { api } from './api.js';
import {
  icon,
  money,
  formatDateTime,
  sizeBadge,
  statusBadge,
  methodLabel,
  openModal,
  closeModal,
  toast,
  setButtonBusy,
  resetButton,
  escapeHtml
} from './ui.js';

export async function showSaleDetails(saleId, { onUpdated } = {}) {
  let sale;
  try {
    const response = await api.get(`/sales/${saleId}`);
    sale = response.data;
  } catch (error) {
    toast(error.message, 'error');
    return;
  }

  const itemsRows = sale.items
    .map(
      (item) => `
        <tr>
          <td class="table-strong">${escapeHtml(item.fruit_name)}</td>
          <td>${sizeBadge(item.packaging_size)}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">${money(item.unit_price)}</td>
          <td class="num money">${money(item.line_total)}</td>
        </tr>`
    )
    .join('');

  const paymentsRows = sale.payments.length
    ? sale.payments
        .map(
          (payment) => `
          <tr>
            <td>${formatDateTime(payment.payment_date)}</td>
            <td>${methodLabel(payment.payment_method)}</td>
            <td class="text-muted">${escapeHtml(payment.reference || '—')}</td>
            <td class="num money">${money(payment.amount)}</td>
          </tr>`
        )
        .join('')
    : `<tr><td colspan="4" class="text-muted" style="text-align:center;padding:18px">No payments received yet.</td></tr>`;

  const balance = Number(sale.balance);

  const footer = `
    <button type="button" class="btn btn-secondary" data-close>Close</button>
    ${balance > 0 ? `<button type="button" class="btn btn-primary" data-record-payment>${icon('money', 16)} Record payment</button>` : ''}`;

  const overlay = openModal({
    title: `Sale #${sale.sale_id}`,
    subtitle: `${sale.vendor_name} · ${formatDateTime(sale.sale_date)}`,
    size: 'lg',
    body: `
      <div class="summary-strip">
        <div><span class="label">Total payable</span><span class="value">${money(sale.total_amount)}</span></div>
        <div><span class="label">Amount paid</span><span class="value text-success">${money(sale.amount_paid)}</span></div>
        <div><span class="label">Balance</span><span class="value ${balance > 0 ? 'text-danger' : 'text-success'}">${money(balance)}</span></div>
      </div>

      <div class="detail-grid" style="margin-bottom:16px">
        <div class="detail-item"><span class="label">Vendor</span><span class="value">${escapeHtml(sale.vendor_name)}</span></div>
        <div class="detail-item"><span class="label">Phone</span><span class="value">${escapeHtml(sale.phone_number)}</span></div>
        <div class="detail-item"><span class="label">Payment method</span><span class="value">${methodLabel(sale.payment_method)}</span></div>
        <div class="detail-item"><span class="label">Payment status</span><span class="value">${statusBadge(sale.payment_status)}</span></div>
      </div>

      <div class="card-header" style="margin-bottom:9px"><div><h3>Items sold</h3></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Fruit</th><th>Packaging</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Line total</th></tr></thead>
          <tbody>${itemsRows}</tbody>
        </table>
      </div>

      <div class="card-header" style="margin:18px 0 9px"><div><h3>Payment history</h3></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="num">Amount</th></tr></thead>
          <tbody>${paymentsRows}</tbody>
        </table>
      </div>`,
    footer
  });

  overlay.querySelector('[data-record-payment]')?.addEventListener('click', () => {
    openRecordPaymentModal({
      saleId: sale.sale_id,
      balance,
      vendorName: sale.vendor_name,
      onSuccess: () => onUpdated?.()
    });
  });
}

export function openRecordPaymentModal({ saleId, balance, vendorName = '', onSuccess } = {}) {
  const overlay = openModal({
    title: 'Record payment',
    subtitle: `Sale #${saleId}${vendorName ? ` · ${vendorName}` : ''}`,
    body: `
      <form id="paymentForm" class="form-grid">
        <div class="form-field span-2">
          <label>Outstanding balance</label>
          <div class="chip warn" style="align-self:flex-start;font-size:12.5px">${money(balance)}</div>
        </div>
        <div class="form-field">
          <label for="paymentAmount">Payment amount <span class="req">*</span></label>
          <div class="input-prefix"><span>M</span><input id="paymentAmount" name="amount" type="number" min="0.01" max="${balance}" step="0.01" value="${Number(balance).toFixed(2)}" required></div>
        </div>
        <div class="form-field">
          <label for="paymentMethod">Payment method <span class="req">*</span></label>
          <select id="paymentMethod" name="payment_method" required>
            <option value="CASH">Cash</option>
            <option value="MOBILE_MONEY">Mobile money</option>
          </select>
        </div>
        <div class="form-field span-2">
          <label for="paymentReference">Reference</label>
          <input id="paymentReference" name="reference" maxlength="80" placeholder="e.g. M-PESA-1024 or receipt number">
        </div>
      </form>`,
    footer: `
      <button type="button" class="btn btn-secondary" data-close>Cancel</button>
      <button type="submit" form="paymentForm" class="btn btn-primary" id="savePaymentBtn">${icon('check', 16)} Save payment</button>`
  });

  const form = overlay.querySelector('#paymentForm');
  const submitButton = overlay.querySelector('#savePaymentBtn');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const amount = Number(data.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast('Enter a payment amount greater than zero.', 'error');
      return;
    }
    if (amount > Number(balance)) {
      toast('Payment cannot exceed the outstanding balance.', 'error');
      return;
    }

    setButtonBusy(submitButton, 'Saving...');
    try {
      const response = await api.post('/payments', {
        sale_id: saleId,
        amount,
        payment_method: data.payment_method,
        reference: data.reference
      });
      toast(response.message || 'Payment recorded successfully.');
      closeModal();
      onSuccess?.();
    } catch (error) {
      toast(error.message, 'error');
      resetButton(submitButton);
    }
  });
}

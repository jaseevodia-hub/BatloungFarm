import { api } from '../api.js';
import {
  PACKAGING_SIZES,
  icon,
  money,
  quantity,
  sizeLabel,
  statusBadge,
  methodLabel,
  escapeHtml,
  formatDate,
  todayISO,
  dateInputValue,
  loadingState,
  tableEmpty,
  toast,
  openModal,
  closeModal,
  confirmDialog,
  setButtonBusy,
  resetButton,
  errorState
} from '../ui.js';
import { showSaleDetails, openRecordPaymentModal } from '../actions.js';

const PRICE_KEYS = { SMALL: 'small_price', MEDIUM: 'medium_price', LARGE: 'large_price' };
const STOCK_KEYS = { SMALL: 'small_stock', MEDIUM: 'medium_stock', LARGE: 'large_stock' };

export default {
  async render(el) {
    let allSales = [];
    let vendors = [];
    let fruits = [];
    let currentVendorId = '';
    let currentStatus = '';
    let currentSearch = '';

    el.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-spacer"></div>
        <button type="button" class="btn btn-primary" id="newSaleBtn">${icon('plus', 16)} Record sale</button>
      </div>
      <div id="saleContent">${loadingState('Loading sales...')}</div>`;

    const contentRoot = el.querySelector('#saleContent');
    const newButton = el.querySelector('#newSaleBtn');

    function saleRows(sales) {
      return sales
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
            <td class="num">${quantity(sale.total_boxes)}</td>
            <td class="num money">${money(sale.total_amount)}</td>
            <td class="num ${Number(sale.balance) > 0 ? 'text-danger' : ''}" style="font-weight:700">${money(sale.balance)}</td>
            <td class="nowrap"><span class="chip">${methodLabel(sale.payment_method)}</span></td>
            <td>${statusBadge(sale.payment_status)}</td>
            <td>
              <div class="actions">
                <button class="action-btn" data-action="view" data-id="${sale.sale_id}" title="View sale">${icon('eye', 15)}</button>
                <button class="action-btn" data-action="edit" data-id="${sale.sale_id}" title="Edit sale">${icon('edit', 15)}</button>
                <button class="action-btn danger" data-action="delete" data-id="${sale.sale_id}" title="Delete sale">${icon('trash', 15)}</button>
                ${Number(sale.balance) > 0 ? `<button class="action-btn money" data-action="pay" data-id="${sale.sale_id}" data-balance="${sale.balance}" data-vendor="${escapeHtml(sale.vendor_name)}" title="Record payment">${icon('money', 15)}</button>` : ''}
              </div>
            </td>
          </tr>`
        )
        .join('');
    }

    function saleTable(sales, filtered = false) {
      if (!sales.length) {
        return `<div class="table-wrap"><table><tbody>${tableEmpty(9, 'No sales found', filtered ? 'No sales match the current filters.' : 'Record a sale to start tracking vendor payments.', 'sales')}</tbody></table></div>`;
      }

      return `
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Sale</th><th>Vendor</th><th>Date</th><th class="num">Boxes</th><th class="num">Total</th><th class="num">Balance</th><th>Payment</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>${saleRows(sales)}</tbody>
          </table>
        </div>`;
    }

    function renderPage() {
      const totalValue = allSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
      const outstanding = allSales.reduce((sum, sale) => sum + Number(sale.balance), 0);
      const awaiting = allSales.filter((sale) => Number(sale.balance) > 0).length;

      contentRoot.innerHTML = `
        <div class="stat-grid">
          <article class="stat-card">
            <div class="stat-top"><span class="stat-label">Sales recorded</span><span class="stat-icon">${icon('sales', 19)}</span></div>
            <div class="stat-value">${quantity(allSales.length)}</div>
            <div class="stat-meta">Sales to street vendors</div>
          </article>
          <article class="stat-card blue">
            <div class="stat-top"><span class="stat-label">Total value</span><span class="stat-icon">${icon('money', 19)}</span></div>
            <div class="stat-value">${money(totalValue)}</div>
            <div class="stat-meta">Revenue from all sales</div>
          </article>
          <article class="stat-card ${outstanding > 0 ? 'red' : ''}">
            <div class="stat-top"><span class="stat-label">Outstanding</span><span class="stat-icon">${icon('alert', 19)}</span></div>
            <div class="stat-value">${money(outstanding)}</div>
            <div class="stat-meta">Balance still to collect</div>
          </article>
          <article class="stat-card amber">
            <div class="stat-top"><span class="stat-label">Awaiting payment</span><span class="stat-icon">${icon('payments', 19)}</span></div>
            <div class="stat-value">${quantity(awaiting)}</div>
            <div class="stat-meta">Sale(s) not fully paid</div>
          </article>
        </div>

        <div class="grid-2">
          <section class="card">
            <div class="card-header">
              <div><h2>Sales register</h2><p>${allSales.length} sale(s) · ${money(totalValue)} total value.</p></div>
              <div class="card-actions"><button type="button" class="btn btn-secondary btn-sm" id="openSalesRegister">${icon('eye', 15)} Open</button></div>
            </div>
            <div class="card-summary-value">
              <strong>${money(totalValue)}</strong>
              <span>Total sales value</span>
            </div>
          </section>

          <section class="card">
            <div class="card-header">
              <div><h2>Outstanding sales</h2><p>${awaiting} sale(s) awaiting payment.</p></div>
              <div class="card-actions"><button type="button" class="btn btn-secondary btn-sm" id="openOutstandingSales">${icon('eye', 15)} Open</button></div>
            </div>
            <div class="card-summary-value">
              <strong>${money(outstanding)}</strong>
              <span>Balance to collect</span>
            </div>
          </section>
        </div>`;

      contentRoot.querySelector('#openSalesRegister').addEventListener('click', () => openSalesRegister());
      contentRoot.querySelector('#openOutstandingSales').addEventListener('click', () => openSalesRegister({ onlyOutstanding: true }));
    }

    function openSalesRegister({ onlyOutstanding = false } = {}) {
      const overlay = openModal({
        title: onlyOutstanding ? 'Sales awaiting payment' : 'Sales register',
        subtitle: onlyOutstanding
          ? `${allSales.filter((sale) => Number(sale.balance) > 0).length} sale(s) with a balance still to collect.`
          : `${allSales.length} sale(s) · ${money(allSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0))} total value.`,
        size: 'xl',
        body: `
          <div class="report-date-form" style="margin-bottom:14px">
            <div class="form-field" style="flex:1;min-width:240px">
              <label for="saleSearchFilter">Search</label>
              <div class="search-box">${icon('search', 16)}<input id="saleSearchFilter" type="search" placeholder="Sale #, vendor or phone" autocomplete="off" value="${escapeHtml(currentSearch)}"></div>
            </div>
            <div class="form-field">
              <label for="saleVendorFilter">Vendor</label>
              <select id="saleVendorFilter">
                <option value="">All vendors</option>
                ${vendors
                  .map(
                    (vendor) =>
                      `<option value="${vendor.vendor_id}" ${String(vendor.vendor_id) === String(currentVendorId) ? 'selected' : ''}>${escapeHtml(vendor.vendor_name)}</option>`
                  )
                  .join('')}
              </select>
            </div>
            <div class="form-field">
              <label for="saleStatusFilter">Payment status</label>
              <select id="saleStatusFilter">
                <option value="">All payment statuses</option>
                <option value="PAID" ${currentStatus === 'PAID' ? 'selected' : ''}>Paid</option>
                <option value="PARTIALLY_PAID" ${currentStatus === 'PARTIALLY_PAID' ? 'selected' : ''}>Partially paid</option>
                <option value="UNPAID" ${currentStatus === 'UNPAID' ? 'selected' : ''}>Unpaid</option>
              </select>
            </div>
          </div>
          <div id="salesRegisterTable"></div>`,
        footer: `<button type="button" class="btn btn-secondary" data-close>Close</button>`
      });

      const vendorFilter = overlay.querySelector('#saleVendorFilter');
      const statusFilter = overlay.querySelector('#saleStatusFilter');
      const searchFilter = overlay.querySelector('#saleSearchFilter');
      const tableRoot = overlay.querySelector('#salesRegisterTable');

      function renderRegister() {
        currentVendorId = vendorFilter.value;
        currentStatus = statusFilter.value;
        currentSearch = searchFilter.value;
        const term = currentSearch.trim().toLowerCase();

        const filtered = allSales.filter((sale) => {
          if (currentVendorId && String(sale.vendor_id) !== String(currentVendorId)) return false;
          if (onlyOutstanding && Number(sale.balance) <= 0) return false;
          if (currentStatus && sale.payment_status !== currentStatus) return false;
          if (!term) return true;
          return [sale.sale_id, sale.vendor_name, sale.phone_number].some((value) =>
            String(value || '').toLowerCase().includes(term)
          );
        });

        tableRoot.innerHTML = saleTable(filtered, Boolean(currentVendorId || currentStatus || term));
      }

      vendorFilter.addEventListener('change', renderRegister);
      statusFilter.addEventListener('change', renderRegister);
      searchFilter.addEventListener('input', renderRegister);
      tableRoot.addEventListener('click', handleSaleAction);

      renderRegister();
    }

    async function handleSaleAction(event) {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const id = Number(button.dataset.id);

      if (button.dataset.action === 'view') {
        showSaleDetails(id, { onUpdated: load });
      }
      if (button.dataset.action === 'edit') {
        try {
          const response = await api.get(`/sales/${id}`);
          openSaleForm(response.data);
        } catch (error) {
          toast(error.message, 'error');
        }
      }
      if (button.dataset.action === 'delete') {
        await deleteSale(id);
      }
      if (button.dataset.action === 'pay') {
        openRecordPaymentModal({
          saleId: id,
          balance: Number(button.dataset.balance),
          vendorName: button.dataset.vendor,
          onSuccess: load
        });
      }
    }

    async function deleteSale(id) {
      const confirmed = await confirmDialog({
        title: 'Delete sale',
        message: 'Delete this sale? Its stock will be restored and all linked payments will be removed.',
        confirmText: 'Delete sale'
      });
      if (!confirmed) return;

      try {
        const response = await api.delete(`/sales/${id}`);
        toast(response.message || 'Sale deleted.');
        await load();
      } catch (error) {
        toast(error.message, 'error');
      }
    }

    function openSaleForm(sale = null) {
      const isEdit = Boolean(sale);

      if (!vendors.length) {
        toast('Register a vendor before recording a sale.', 'error');
        return;
      }
      if (!fruits.length) {
        toast('Add at least one available fruit with selling prices before recording a sale.', 'error');
        return;
      }

      const vendorOptions = vendors
        .map(
          (vendor) =>
            `<option value="${vendor.vendor_id}" ${Number(sale?.vendor_id) === Number(vendor.vendor_id) ? 'selected' : ''}>${escapeHtml(vendor.vendor_name)} — ${escapeHtml(vendor.phone_number)}</option>`
        )
        .join('');

      const fruitOptions = fruits
        .map((fruit) => `<option value="${fruit.fruit_id}">${escapeHtml(fruit.fruit_name)}</option>`)
        .join('');

      const sizeOptions = PACKAGING_SIZES.map(
        (size) => `<option value="${size}">${sizeLabel(size)}</option>`
      ).join('');

      const overlay = openModal({
        title: isEdit ? 'Edit sale' : 'Record sale',
        subtitle: isEdit
          ? `Update sale #${sale.sale_id}. Stock is adjusted automatically; payments stay on the Payments page.`
          : 'Selling prices come from each fruit packaging size. Stock is checked before the sale is saved.',
        size: 'xl',
        body: `
          <form id="saleForm">
            <div class="form-grid">
              <div class="form-field">
                <label for="saleVendor">Vendor <span class="req">*</span></label>
                <select id="saleVendor" name="vendor_id" required>
                  <option value="">Select vendor</option>
                  ${vendorOptions}
                </select>
              </div>
              <div class="form-field">
                <label for="saleDate">Sale date <span class="req">*</span></label>
                <input id="saleDate" name="sale_date" type="date" required value="${dateInputValue(sale?.sale_date) || todayISO()}">
              </div>
            </div>

            <div class="form-section-title" style="margin-top:17px">Fruit items</div>
            <div class="line-editor">
              <div class="line-editor-head">
                <span>Fruit</span><span>Packaging</span><span>Qty</span><span>Unit price</span><span>Line total</span><span></span>
              </div>
              <div id="saleItems"></div>
            </div>
            <div class="line-editor-foot">
              <button type="button" class="btn btn-secondary btn-sm" id="addSaleItem">${icon('plus', 14)} Add fruit item</button>
              <div class="editor-total">Sale total <strong id="saleTotal">M 0.00</strong></div>
            </div>

            ${isEdit ? `
            <div class="payment-note">${icon('info', 15)} Payments and outstanding balances are managed from the Payments page. Editing this sale keeps the amount already paid.</div>` : `
            <div class="payment-fields">
              <div class="form-field">
                <label for="salePaymentMethod">Payment method <span class="req">*</span></label>
                <select id="salePaymentMethod" name="payment_method" required>
                  <option value="CASH">Cash</option>
                  <option value="MOBILE_MONEY">Mobile money</option>
                  <option value="CREDIT">Credit (outstanding)</option>
                </select>
              </div>
              <div class="form-field">
                <label for="saleAmountPaid">Amount paid now</label>
                <div class="input-prefix"><span>M</span><input id="saleAmountPaid" name="amount_paid" type="number" min="0" step="0.01" value="0"></div>
                <span class="form-help" id="amountPaidHelp">Cash and mobile money sales are paid in full.</span>
              </div>
              <div class="form-field" id="depositMethodField" style="display:none">
                <label for="saleDepositMethod">Deposit paid via</label>
                <select id="saleDepositMethod" name="settlement_method">
                  <option value="CASH">Cash</option>
                  <option value="MOBILE_MONEY">Mobile money</option>
                </select>
              </div>
              <div class="form-field">
                <label>Balance after this payment</label>
                <div class="chip ${Number(0) > 0 ? 'warn' : ''}" id="saleBalanceChip" style="align-self:flex-start;min-height:40px;padding:10px 13px;font-size:13px">M 0.00</div>
              </div>
            </div>`}
          </form>`,
        footer: `
          <button type="button" class="btn btn-secondary" data-close>Cancel</button>
          <button type="submit" form="saleForm" class="btn btn-primary" id="saveSaleBtn">${icon('check', 16)} ${isEdit ? 'Save changes' : 'Record sale'}</button>`
      });

      const form = overlay.querySelector('#saleForm');
      const itemsContainer = overlay.querySelector('#saleItems');
      const addItemButton = overlay.querySelector('#addSaleItem');
      const totalDisplay = overlay.querySelector('#saleTotal');
      const paymentMethod = overlay.querySelector('#salePaymentMethod');
      const amountPaidInput = overlay.querySelector('#saleAmountPaid');
      const depositField = overlay.querySelector('#depositMethodField');
      const amountPaidHelp = overlay.querySelector('#amountPaidHelp');
      const balanceChip = overlay.querySelector('#saleBalanceChip');
      const saveButton = overlay.querySelector('#saveSaleBtn');

      let currentTotal = 0;
      let previousMethod = paymentMethod ? paymentMethod.value : null;

      function findFruit(id) {
        return fruits.find((fruit) => Number(fruit.fruit_id) === Number(id));
      }

      function updatePaymentState() {
        if (!paymentMethod || !amountPaidInput) return;

        const method = paymentMethod.value;
        const wholeSale = method !== 'CREDIT';

        amountPaidInput.disabled = wholeSale;
        depositField.style.display = wholeSale ? 'none' : '';
        amountPaidHelp.textContent = wholeSale
          ? 'Cash and mobile money sales are paid in full.'
          : 'Enter any deposit received now. Leave 0 for a fully unpaid credit sale.';

        if (wholeSale) {
          amountPaidInput.value = currentTotal.toFixed(2);
        } else {
          if (previousMethod !== 'CREDIT') {
            amountPaidInput.value = '0.00';
          }
          let paid = Number(amountPaidInput.value) || 0;
          if (paid > currentTotal) {
            paid = currentTotal;
            amountPaidInput.value = paid.toFixed(2);
          }
        }

        previousMethod = method;
        const paid = Number(amountPaidInput.value) || 0;
        const balance = Math.max(currentTotal - paid, 0);
        balanceChip.textContent = money(balance);
        balanceChip.classList.toggle('warn', balance > 0);
      }

      function recalculate() {
        currentTotal = 0;

        itemsContainer.querySelectorAll('.line-editor-row').forEach((row) => {
          const fruit = findFruit(row.querySelector('.item-fruit').value);
          const size = row.querySelector('.item-size').value;
          const qty = Number(row.querySelector('.item-qty').value) || 0;

          const price = fruit ? Number(fruit[PRICE_KEYS[size]] || 0) : 0;
          const stock = fruit ? Number(fruit[STOCK_KEYS[size]] || 0) : 0;
          const lineTotal = price * qty;

          row.querySelector('.line-unit-price').textContent = price ? money(price) : 'No price';
          row.querySelector('.line-total').textContent = money(lineTotal);

          const available = row.querySelector('.available');
          const state = row.querySelector('.stock-state');
          available.textContent = `${quantity(stock)} boxes available in ${sizeLabel(size).toLowerCase()}`;
          if (!price) {
            state.textContent = 'Selling price not configured';
            state.className = 'stock-state warn';
          } else if (qty > stock) {
            state.textContent = `Not enough stock (need ${qty})`;
            state.className = 'stock-state warn';
          } else {
            state.textContent = 'Stock available';
            state.className = 'stock-state';
          }

          currentTotal += lineTotal;
        });

        totalDisplay.textContent = money(currentTotal);
        updatePaymentState();
      }

      function addItemRow(item = null) {
        const row = document.createElement('div');
        row.className = 'line-editor-row';
        row.innerHTML = `
          <select class="item-fruit" required>${fruitOptions}</select>
          <select class="item-size" required>${sizeOptions}</select>
          <input class="item-qty" type="number" min="1" step="1" value="1" required aria-label="Quantity">
          <div class="line-unit-price">M 0.00</div>
          <div class="line-total">M 0.00</div>
          <button type="button" class="icon-btn remove-row" style="width:32px;height:32px" title="Remove item">${icon('trash', 15)}</button>
          <div class="line-availability"><span class="available"></span><span class="stock-state"></span></div>`;

        if (item) {
          row.querySelector('.item-fruit').value = item.fruit_id;
          row.querySelector('.item-size').value = item.packaging_size;
          row.querySelector('.item-qty').value = item.quantity;
        }

        itemsContainer.appendChild(row);
        row.querySelectorAll('select, input').forEach((input) => input.addEventListener('input', recalculate));
        row.querySelector('.remove-row').addEventListener('click', () => {
          if (itemsContainer.querySelectorAll('.line-editor-row').length === 1) {
            toast('A sale must contain at least one fruit item.', 'info');
            return;
          }
          row.remove();
          recalculate();
        });
        recalculate();
      }

      addItemButton.addEventListener('click', () => addItemRow());
      paymentMethod?.addEventListener('change', updatePaymentState);
      amountPaidInput?.addEventListener('input', updatePaymentState);
      if (sale?.items?.length) {
        sale.items.forEach((item) => addItemRow(item));
      } else {
        addItemRow();
      }

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const vendorId = form.querySelector('#saleVendor').value;
        const saleDate = form.querySelector('#saleDate').value;

        if (!vendorId) {
          toast('Select a vendor for this sale.', 'error');
          return;
        }

        const items = [];
        let valid = true;

        itemsContainer.querySelectorAll('.line-editor-row').forEach((row) => {
          const fruitId = Number(row.querySelector('.item-fruit').value);
          const packagingSize = row.querySelector('.item-size').value;
          const quantityValue = Number(row.querySelector('.item-qty').value);

          if (!fruitId || !packagingSize || !Number.isInteger(quantityValue) || quantityValue <= 0) {
            valid = false;
            return;
          }

          items.push({
            fruit_id: fruitId,
            packaging_size: packagingSize,
            quantity: quantityValue
          });
        });

        if (!valid || !items.length) {
          toast('Complete every fruit, packaging size and quantity.', 'error');
          return;
        }

        const payload = {
          vendor_id: Number(vendorId),
          sale_date: saleDate,
          items
        };

        if (isEdit) {
          payload.payment_method = sale.payment_method;
        } else {
          const method = paymentMethod.value;
          payload.payment_method = method;

          if (method === 'CREDIT') {
            payload.amount_paid = Number(amountPaidInput.value) || 0;
            payload.settlement_method = overlay.querySelector('#saleDepositMethod').value;
          }
        }

        setButtonBusy(saveButton, isEdit ? 'Saving...' : 'Recording sale...');
        try {
          const response = isEdit
            ? await api.put(`/sales/${sale.sale_id}`, payload)
            : await api.post('/sales', payload);
          toast(response.message || (isEdit ? 'Sale updated successfully.' : 'Sale recorded successfully.'));
          closeModal();
          await load();
        } catch (error) {
          toast(error.message, 'error');
          resetButton(saveButton);
        }
      });
    }

    async function load() {
      contentRoot.innerHTML = loadingState('Loading sales...');
      try {
        const response = await api.get('/sales');
        allSales = response.data;
        renderPage();
      } catch (error) {
        contentRoot.innerHTML = errorState(error.message, 'Could not load sales');
      }
    }

    newButton.addEventListener('click', () => openSaleForm());

    try {
      const [vendorsResponse, fruitsResponse] = await Promise.all([
        api.get('/vendors'),
        api.get('/fruits?status=AVAILABLE')
      ]);
      vendors = vendorsResponse.data;
      fruits = fruitsResponse.data;
    } catch (error) {
      toast(error.message, 'error');
    }

    await load();
  }
};

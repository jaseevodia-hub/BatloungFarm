import { api } from '../api.js';
import {
  PACKAGING_SIZES,
  icon,
  money,
  quantity,
  sizeLabel,
  sizeBadge,
  escapeHtml,
  formatDate,
  formatDateTime,
  todayISO,
  loadingState,
  tableEmpty,
  toast,
  openModal,
  closeModal,
  setButtonBusy,
  resetButton,
  errorState
} from '../ui.js';

export default {
  async render(el) {
    let allPurchases = [];
    let suppliers = [];
    let fruits = [];
    let currentSupplierId = '';

    el.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-spacer"></div>
        <button type="button" class="btn btn-primary" id="newPurchaseBtn">${icon('plus', 16)} Record purchase</button>
      </div>
      <div id="purchaseContent">${loadingState('Loading purchases...')}</div>`;

    const contentRoot = el.querySelector('#purchaseContent');
    const newButton = el.querySelector('#newPurchaseBtn');

    function purchaseRows(purchases) {
      return purchases
        .map(
          (purchase) => `
          <tr>
            <td class="table-strong">#${purchase.purchase_id}</td>
            <td>
              <div class="table-title">
                <span class="avatar-sm">${escapeHtml(purchase.business_name.slice(0, 2).toUpperCase())}</span>
                <div>
                  <span class="table-strong">${escapeHtml(purchase.business_name)}</span>
                  <span class="table-sub">${escapeHtml(purchase.province)}</span>
                </div>
              </div>
            </td>
            <td class="nowrap">${formatDate(purchase.purchase_date)}</td>
            <td class="num">${quantity(purchase.item_lines)}</td>
            <td class="num">${quantity(purchase.total_boxes)}</td>
            <td class="num money">${money(purchase.total_amount)}</td>
            <td><div class="actions"><button class="action-btn" data-action="view" data-id="${purchase.purchase_id}" title="View purchase">${icon('eye', 15)}</button></div></td>
          </tr>`
        )
        .join('');
    }

    function purchaseTable(purchases, filtered = false) {
      if (!purchases.length) {
        return `<div class="table-wrap"><table><tbody>${tableEmpty(7, 'No purchases found', filtered ? 'No purchases match the current filters.' : 'Record a purchase to increase fruit stock.', 'purchases')}</tbody></table></div>`;
      }

      return `
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Purchase</th><th>Supplier</th><th>Date</th><th class="num">Items</th><th class="num">Boxes</th><th class="num">Total</th><th></th></tr>
            </thead>
            <tbody>${purchaseRows(purchases)}</tbody>
          </table>
        </div>`;
    }

    function renderPage() {
      const totalValue = allPurchases.reduce(
        (sum, purchase) => sum + Number(purchase.total_amount),
        0
      );
      const totalBoxes = allPurchases.reduce(
        (sum, purchase) => sum + Number(purchase.total_boxes),
        0
      );
      const supplierCount = new Set(allPurchases.map((purchase) => purchase.supplier_id)).size;

      contentRoot.innerHTML = `
        <div class="stat-grid">
          <article class="stat-card">
            <div class="stat-top"><span class="stat-label">Purchases</span><span class="stat-icon">${icon('purchases', 19)}</span></div>
            <div class="stat-value">${quantity(allPurchases.length)}</div>
            <div class="stat-meta">Supplier orders recorded</div>
          </article>
          <article class="stat-card blue">
            <div class="stat-top"><span class="stat-label">Total value</span><span class="stat-icon">${icon('money', 19)}</span></div>
            <div class="stat-value">${money(totalValue)}</div>
            <div class="stat-meta">Spent with suppliers</div>
          </article>
          <article class="stat-card">
            <div class="stat-top"><span class="stat-label">Boxes received</span><span class="stat-icon">${icon('box', 19)}</span></div>
            <div class="stat-value">${quantity(totalBoxes)}</div>
            <div class="stat-meta">Added to fruit stock</div>
          </article>
          <article class="stat-card amber">
            <div class="stat-top"><span class="stat-label">Suppliers involved</span><span class="stat-icon">${icon('suppliers', 19)}</span></div>
            <div class="stat-value">${quantity(supplierCount)}</div>
            <div class="stat-meta">Suppliers with purchase records</div>
          </article>
        </div>

        <div class="grid-2">
          <section class="card">
            <div class="card-header">
              <div><h2>Purchase history</h2><p>${allPurchases.length} purchase(s) from ${supplierCount} supplier(s).</p></div>
              <div class="card-actions"><button type="button" class="btn btn-secondary btn-sm" id="openPurchaseHistory">${icon('eye', 15)} Open</button></div>
            </div>
            <div class="card-summary-value">
              <strong>${money(totalValue)}</strong>
              <span>Total purchase value</span>
            </div>
          </section>

          <section class="card">
            <div class="card-header">
              <div><h2>Stock received</h2><p>${quantity(totalBoxes)} box(es) received from suppliers.</p></div>
              <div class="card-actions"><button type="button" class="btn btn-primary btn-sm" id="openPurchaseForm">${icon('plus', 15)} Record</button></div>
            </div>
            <div class="card-summary-value">
              <strong>${quantity(totalBoxes)}</strong>
              <span>Boxes added to stock</span>
            </div>
          </section>
        </div>`;

      contentRoot.querySelector('#openPurchaseHistory').addEventListener('click', openPurchaseHistory);
      contentRoot.querySelector('#openPurchaseForm').addEventListener('click', openPurchaseForm);
    }

    function openPurchaseHistory() {
      const overlay = openModal({
        title: 'Purchase history',
        subtitle: `${allPurchases.length} purchase(s) · ${money(
          allPurchases.reduce((sum, purchase) => sum + Number(purchase.total_amount), 0)
        )} total value.`,
        size: 'xl',
        body: `
          <div class="report-date-form" style="margin-bottom:14px">
            <div class="form-field" style="flex:1;min-width:240px">
              <label for="purchaseSearchFilter">Search</label>
              <div class="search-box">${icon('search', 16)}<input id="purchaseSearchFilter" type="search" placeholder="Purchase #, supplier or province" autocomplete="off"></div>
            </div>
            <div class="form-field">
              <label for="purchaseSupplierFilter">Supplier</label>
              <select id="purchaseSupplierFilter">
                <option value="">All suppliers</option>
                ${suppliers
                  .map(
                    (supplier) =>
                      `<option value="${supplier.supplier_id}" ${String(supplier.supplier_id) === String(currentSupplierId) ? 'selected' : ''}>${escapeHtml(supplier.business_name)}</option>`
                  )
                  .join('')}
              </select>
            </div>
          </div>
          <div id="purchaseHistoryTable"></div>`,
        footer: `<button type="button" class="btn btn-secondary" data-close>Close</button>`
      });

      const supplierFilter = overlay.querySelector('#purchaseSupplierFilter');
      const searchFilter = overlay.querySelector('#purchaseSearchFilter');
      const tableRoot = overlay.querySelector('#purchaseHistoryTable');

      function renderHistory() {
        currentSupplierId = supplierFilter.value;
        const term = searchFilter.value.trim().toLowerCase();

        const filtered = allPurchases.filter((purchase) => {
          if (currentSupplierId && String(purchase.supplier_id) !== String(currentSupplierId)) return false;
          if (!term) return true;
          return [purchase.purchase_id, purchase.business_name, purchase.province].some((value) =>
            String(value || '').toLowerCase().includes(term)
          );
        });

        tableRoot.innerHTML = purchaseTable(filtered, Boolean(currentSupplierId || term));
      }

      supplierFilter.addEventListener('change', renderHistory);
      searchFilter.addEventListener('input', renderHistory);
      tableRoot.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action="view"]');
        if (button) viewPurchase(Number(button.dataset.id));
      });

      renderHistory();
    }

    async function viewPurchase(id) {
      try {
        const response = await api.get(`/purchases/${id}`);
        const purchase = response.data;
        const boxes = purchase.items.reduce((sum, item) => sum + Number(item.quantity), 0);

        const itemRows = purchase.items
          .map(
            (item) => `
            <tr>
              <td class="table-strong">${escapeHtml(item.fruit_name)}</td>
              <td>${sizeBadge(item.packaging_size)}</td>
              <td class="num">${quantity(item.quantity)}</td>
              <td class="num">${money(item.unit_cost)}</td>
              <td class="num money">${money(item.line_total)}</td>
            </tr>`
          )
          .join('');

        openModal({
          title: `Purchase #${purchase.purchase_id}`,
          subtitle: `${purchase.business_name} · ${formatDateTime(purchase.purchase_date)}`,
          size: 'lg',
          body: `
            <div class="summary-strip">
              <div><span class="label">Purchase total</span><span class="value">${money(purchase.total_amount)}</span></div>
              <div><span class="label">Boxes purchased</span><span class="value">${quantity(boxes)}</span></div>
              <div><span class="label">Item lines</span><span class="value">${quantity(purchase.items.length)}</span></div>
            </div>
            <div class="detail-grid" style="margin-bottom:16px">
              <div class="detail-item"><span class="label">Supplier</span><span class="value">${escapeHtml(purchase.business_name)}</span></div>
              <div class="detail-item"><span class="label">Province</span><span class="value">${escapeHtml(purchase.province)}</span></div>
              <div class="detail-item"><span class="label">Contact person</span><span class="value">${escapeHtml(purchase.contact_person)}</span></div>
              <div class="detail-item"><span class="label">Phone</span><span class="value">${escapeHtml(purchase.phone)}</span></div>
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Fruit</th><th>Packaging</th><th class="num">Qty</th><th class="num">Unit cost</th><th class="num">Line total</th></tr></thead>
                <tbody>${itemRows}</tbody>
              </table>
            </div>
            <div class="totals-box">
              <div class="totals-row grand"><span>Total purchase amount</span><strong>${money(purchase.total_amount)}</strong></div>
            </div>`,
          footer: `<button type="button" class="btn btn-secondary" data-close>Close</button>`
        });
      } catch (error) {
        toast(error.message, 'error');
      }
    }

    function openPurchaseForm() {
      if (!suppliers.length) {
        toast('Register a supplier before recording a purchase.', 'error');
        return;
      }
      if (!fruits.length) {
        toast('Add at least one active fruit before recording a purchase.', 'error');
        return;
      }

      const supplierOptions = suppliers
        .map(
          (supplier) =>
            `<option value="${supplier.supplier_id}">${escapeHtml(supplier.business_name)} — ${escapeHtml(supplier.province)}</option>`
        )
        .join('');

      const fruitOptions = fruits
        .map((fruit) => `<option value="${fruit.fruit_id}">${escapeHtml(fruit.fruit_name)}</option>`)
        .join('');

      const sizeOptions = PACKAGING_SIZES.map(
        (size) => `<option value="${size}">${sizeLabel(size)}</option>`
      ).join('');

      const overlay = openModal({
        title: 'Record purchase',
        subtitle: 'Purchase multiple fruits in one transaction. Stock increases automatically.',
        size: 'xl',
        body: `
          <form id="purchaseForm">
            <div class="form-grid">
              <div class="form-field">
                <label for="purchaseSupplier">Supplier <span class="req">*</span></label>
                <select id="purchaseSupplier" name="supplier_id" required>
                  <option value="">Select supplier</option>
                  ${supplierOptions}
                </select>
              </div>
              <div class="form-field">
                <label for="purchaseDate">Purchase date <span class="req">*</span></label>
                <input id="purchaseDate" name="purchase_date" type="date" required value="${todayISO()}">
              </div>
              <div class="form-field span-2">
                <span class="form-help">Enter the quantity, packaging size and unit cost for each fruit. The purchase total is calculated by the system.</span>
              </div>
            </div>

            <div class="form-section-title" style="margin-top:17px">Fruit items</div>
            <div class="line-editor">
              <div class="line-editor-head">
                <span>Fruit</span><span>Packaging</span><span>Qty</span><span>Unit cost (M)</span><span>Line total</span><span></span>
              </div>
              <div id="purchaseItems"></div>
            </div>
            <div class="line-editor-foot">
              <button type="button" class="btn btn-secondary btn-sm" id="addPurchaseItem">${icon('plus', 14)} Add fruit item</button>
              <div class="editor-total">Purchase total <strong id="purchaseTotal">M 0.00</strong></div>
            </div>
          </form>`,
        footer: `
          <button type="button" class="btn btn-secondary" data-close>Cancel</button>
          <button type="submit" form="purchaseForm" class="btn btn-primary" id="savePurchaseBtn">${icon('check', 16)} Record purchase</button>`
      });

      const form = overlay.querySelector('#purchaseForm');
      const itemsContainer = overlay.querySelector('#purchaseItems');
      const addItemButton = overlay.querySelector('#addPurchaseItem');
      const totalDisplay = overlay.querySelector('#purchaseTotal');
      const saveButton = overlay.querySelector('#savePurchaseBtn');

      function recalculate() {
        let total = 0;
        itemsContainer.querySelectorAll('.line-editor-row').forEach((row) => {
          const qty = Number(row.querySelector('.item-qty').value) || 0;
          const cost = Number(row.querySelector('.item-cost').value) || 0;
          const lineTotal = qty * cost;
          row.querySelector('.line-total').textContent = money(lineTotal);
          total += lineTotal;
        });
        totalDisplay.textContent = money(total);
      }

      function addItemRow() {
        const row = document.createElement('div');
        row.className = 'line-editor-row';
        row.innerHTML = `
          <select class="item-fruit" required>${fruitOptions}</select>
          <select class="item-size" required>${sizeOptions}</select>
          <input class="item-qty" type="number" min="1" step="1" value="1" required aria-label="Quantity">
          <input class="item-cost" type="number" min="0" step="0.01" placeholder="0.00" required aria-label="Unit cost">
          <div class="line-total">M 0.00</div>
          <button type="button" class="icon-btn remove-row" style="width:32px;height:32px" title="Remove item">${icon('trash', 15)}</button>`;

        itemsContainer.appendChild(row);
        row.querySelectorAll('input').forEach((input) => input.addEventListener('input', recalculate));
        row.querySelector('.remove-row').addEventListener('click', () => {
          if (itemsContainer.querySelectorAll('.line-editor-row').length === 1) {
            toast('A purchase must contain at least one fruit item.', 'info');
            return;
          }
          row.remove();
          recalculate();
        });
        recalculate();
      }

      addItemButton.addEventListener('click', addItemRow);
      addItemRow();

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const supplierId = form.querySelector('#purchaseSupplier').value;
        const purchaseDate = form.querySelector('#purchaseDate').value;

        if (!supplierId) {
          toast('Select a supplier for this purchase.', 'error');
          return;
        }

        const items = [];
        let valid = true;

        itemsContainer.querySelectorAll('.line-editor-row').forEach((row) => {
          const fruitId = Number(row.querySelector('.item-fruit').value);
          const packagingSize = row.querySelector('.item-size').value;
          const quantityValue = Number(row.querySelector('.item-qty').value);
          const unitCost = Number(row.querySelector('.item-cost').value);

          if (!fruitId || !packagingSize || !Number.isInteger(quantityValue) || quantityValue <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
            valid = false;
            return;
          }

          items.push({
            fruit_id: fruitId,
            packaging_size: packagingSize,
            quantity: quantityValue,
            unit_cost: unitCost
          });
        });

        if (!valid || !items.length) {
          toast('Complete every fruit, packaging, quantity and unit cost.', 'error');
          return;
        }

        setButtonBusy(saveButton, 'Recording...');
        try {
          const response = await api.post('/purchases', {
            supplier_id: Number(supplierId),
            purchase_date: purchaseDate,
            items
          });
          toast(response.message || 'Purchase recorded successfully.');
          closeModal();
          await load();
        } catch (error) {
          toast(error.message, 'error');
          resetButton(saveButton);
        }
      });
    }

    async function load() {
      contentRoot.innerHTML = loadingState('Loading purchases...');
      try {
        const response = await api.get('/purchases');
        allPurchases = response.data;
        renderPage();
      } catch (error) {
        contentRoot.innerHTML = errorState(error.message, 'Could not load purchases');
      }
    }

    newButton.addEventListener('click', openPurchaseForm);

    try {
      const [suppliersResponse, fruitsResponse] = await Promise.all([
        api.get('/suppliers'),
        api.get('/fruits?status=ACTIVE')
      ]);
      suppliers = suppliersResponse.data;
      fruits = fruitsResponse.data;
    } catch (error) {
      toast(error.message, 'error');
    }

    await load();
  }
};

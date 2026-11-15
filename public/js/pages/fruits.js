import { api } from '../api.js';
import {
  icon,
  money,
  quantity,
  sizeBadge,
  statusBadge,
  escapeHtml,
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

function priceCell(price, stock, threshold) {
  if (price === null || price === undefined) {
    return `<div class="price-stack"><strong class="text-muted">No price</strong><span>${quantity(stock)} boxes</span></div>`;
  }
  return `
    <div class="price-stack">
      <strong>${money(price)}</strong>
      <span class="${Number(stock) <= threshold ? 'low' : ''}">${quantity(stock)} boxes</span>
    </div>`;
}

function totalBoxes(fruits) {
  return fruits.reduce(
    (sum, fruit) =>
      sum +
      Number(fruit.small_stock || 0) +
      Number(fruit.medium_stock || 0) +
      Number(fruit.large_stock || 0),
    0
  );
}

export default {
  async render(el) {
    let currentStatus = '';
    let currentSearch = '';
    let fruits = [];
    let lowStock = [];
    let lowThreshold = 10;

    el.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-spacer"></div>
        <button type="button" class="btn btn-primary" id="addFruitBtn">${icon('plus', 16)} Add fruit</button>
      </div>
      <div id="fruitContent">${loadingState('Loading fruits and stock...')}</div>`;

    const contentRoot = el.querySelector('#fruitContent');
    const addButton = el.querySelector('#addFruitBtn');

    function fruitRows(rows) {
      return rows
        .map(
          (fruit) => `
          <tr>
            <td>
              <div class="table-title">
                <span class="avatar-sm">${escapeHtml(fruit.fruit_name.slice(0, 2).toUpperCase())}</span>
                <div>
                  <span class="table-strong">${escapeHtml(fruit.fruit_name)}</span>
                  <span class="table-sub">${escapeHtml(fruit.description || 'No description')}</span>
                </div>
              </div>
            </td>
            <td>${statusBadge(fruit.status)}</td>
            <td>${priceCell(fruit.small_price, fruit.small_stock, lowThreshold)}</td>
            <td>${priceCell(fruit.medium_price, fruit.medium_stock, lowThreshold)}</td>
            <td>${priceCell(fruit.large_price, fruit.large_stock, lowThreshold)}</td>
            <td>
              <div class="actions">
                <button class="action-btn" data-action="view" data-id="${fruit.fruit_id}" title="View stock">${icon('eye', 15)}</button>
                <button class="action-btn" data-action="edit" data-id="${fruit.fruit_id}" title="Edit fruit">${icon('edit', 15)}</button>
                <button class="action-btn danger" data-action="delete" data-id="${fruit.fruit_id}" title="Delete fruit">${icon('trash', 15)}</button>
              </div>
            </td>
          </tr>`
        )
        .join('');
    }

    function fruitTable(rows, filtered = false) {
      if (!rows.length) {
        return `<div class="table-wrap"><table><tbody>${tableEmpty(6, 'No fruits found', filtered ? 'No fruits match the current filters.' : 'Add a fruit type to begin managing stock.', 'fruits')}</tbody></table></div>`;
      }

      return `
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Fruit</th><th>Status</th><th>Small</th><th>Medium</th><th>Large</th><th></th></tr>
            </thead>
            <tbody>${fruitRows(rows)}</tbody>
          </table>
        </div>`;
    }

    function lowStockRows(rows) {
      return rows
        .map(
          (row) => `
          <tr>
            <td class="table-strong">${escapeHtml(row.fruit_name)}</td>
            <td>${sizeBadge(row.packaging_size)}</td>
            <td><span class="chip warn">${quantity(row.available_quantity)} boxes · reorder at ${lowThreshold}</span></td>
            <td class="money">${row.selling_price ? money(row.selling_price) : '—'}</td>
            <td>
              <div class="actions">
                <button class="action-btn" data-action="view" data-id="${row.fruit_id}" title="View fruit stock">${icon('eye', 15)}</button>
                <button class="action-btn" data-action="edit" data-id="${row.fruit_id}" title="Edit fruit">${icon('edit', 15)}</button>
              </div>
            </td>
          </tr>`
        )
        .join('');
    }

    function lowStockTable(rows) {
      if (!rows.length) {
        return `<div class="table-wrap"><table><tbody>${tableEmpty(5, 'Stock levels are healthy', 'No fruit and packaging size is at or below the reorder threshold.', 'check')}</tbody></table></div>`;
      }

      return `
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Fruit</th><th>Packaging</th><th>Available</th><th>Selling price</th><th></th></tr>
            </thead>
            <tbody>${lowStockRows(rows)}</tbody>
          </table>
        </div>`;
    }

    function renderPage() {
      const activeCount = fruits.filter((fruit) => fruit.status === 'ACTIVE').length;
      const boxes = totalBoxes(fruits);

      contentRoot.innerHTML = `
        <div class="stat-grid">
          <article class="stat-card">
            <div class="stat-top"><span class="stat-label">Fruit types</span><span class="stat-icon">${icon('fruits', 19)}</span></div>
            <div class="stat-value">${quantity(fruits.length)}</div>
            <div class="stat-meta">Fruits in the catalogue</div>
          </article>
          <article class="stat-card blue">
            <div class="stat-top"><span class="stat-label">Active fruits</span><span class="stat-icon">${icon('check', 19)}</span></div>
            <div class="stat-value">${quantity(activeCount)}</div>
            <div class="stat-meta">Available for purchases and sales</div>
          </article>
          <article class="stat-card ${lowStock.length ? 'red' : ''}">
            <div class="stat-top"><span class="stat-label">Low stock alerts</span><span class="stat-icon">${icon('alert', 19)}</span></div>
            <div class="stat-value">${quantity(lowStock.length)}</div>
            <div class="stat-meta">At or below the reorder threshold</div>
          </article>
          <article class="stat-card">
            <div class="stat-top"><span class="stat-label">Boxes on hand</span><span class="stat-icon">${icon('box', 19)}</span></div>
            <div class="stat-value">${quantity(boxes)}</div>
            <div class="stat-meta">Across all packaging sizes</div>
          </article>
        </div>

        <div class="grid-2">
          <section class="card">
            <div class="card-header">
              <div><h2>Fruit catalogue & packaging stock</h2><p>${fruits.length} fruit(s) · prices and stock for every packaging size.</p></div>
              <div class="card-actions"><button type="button" class="btn btn-secondary btn-sm" id="openFruitCatalogue">${icon('eye', 15)} Open</button></div>
            </div>
            <div class="card-summary-value">
              <strong>${quantity(boxes)}</strong>
              <span>Total boxes on hand</span>
            </div>
          </section>

          <section class="card">
            <div class="card-header">
              <div><h2>Low stock alerts</h2><p>${lowStock.length} line(s) at or below the reorder threshold.</p></div>
              <div class="card-actions"><button type="button" class="btn btn-secondary btn-sm" id="openLowStock">${icon('eye', 15)} Open</button></div>
            </div>
            <div class="card-summary-value">
              <strong>${quantity(lowStock.length)}</strong>
              <span>Packaging combination(s) needing attention</span>
            </div>
          </section>
        </div>`;

      contentRoot.querySelector('#openFruitCatalogue').addEventListener('click', openCatalogue);
      contentRoot.querySelector('#openLowStock').addEventListener('click', openLowStock);
    }

    function openCatalogue() {
      const overlay = openModal({
        title: 'Fruit catalogue & packaging stock',
        subtitle: `${fruits.length} fruit(s) · stock and selling prices per packaging size.`,
        size: 'xl',
        body: `
          <div class="report-date-form" style="margin-bottom:14px">
            <div class="form-field" style="flex:1;min-width:240px">
              <label for="fruitSearchFilter">Search</label>
              <div class="search-box">${icon('search', 16)}<input id="fruitSearchFilter" type="search" placeholder="Fruit name or description" autocomplete="off" value="${escapeHtml(currentSearch)}"></div>
            </div>
            <div class="form-field">
              <label for="fruitStatusFilter">Status</label>
              <select id="fruitStatusFilter">
                <option value="">All statuses</option>
                <option value="ACTIVE" ${currentStatus === 'ACTIVE' ? 'selected' : ''}>Active</option>
                <option value="INACTIVE" ${currentStatus === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
              </select>
            </div>
          </div>
          <div id="fruitDirectoryTable"></div>`,
        footer: `<button type="button" class="btn btn-secondary" data-close>Close</button>`
      });

      const statusFilter = overlay.querySelector('#fruitStatusFilter');
      const searchFilter = overlay.querySelector('#fruitSearchFilter');
      const tableRoot = overlay.querySelector('#fruitDirectoryTable');

      function renderTable() {
        currentStatus = statusFilter.value;
        currentSearch = searchFilter.value;
        const term = currentSearch.trim().toLowerCase();

        const rows = fruits.filter((fruit) => {
          if (currentStatus && fruit.status !== currentStatus) return false;
          if (!term) return true;
          return [fruit.fruit_name, fruit.description].some((value) =>
            String(value || '').toLowerCase().includes(term)
          );
        });

        tableRoot.innerHTML = fruitTable(rows, Boolean(currentStatus || term));
      }

      statusFilter.addEventListener('change', renderTable);
      searchFilter.addEventListener('input', renderTable);
      tableRoot.addEventListener('click', handleFruitAction);

      renderTable();
    }

    function openLowStock() {
      const overlay = openModal({
        title: 'Low stock alerts',
        subtitle: `${lowStock.length} line(s) at or below the reorder threshold of ${lowThreshold} boxes.`,
        size: 'lg',
        body: lowStockTable(lowStock),
        footer: `<button type="button" class="btn btn-secondary" data-close>Close</button>`
      });

      overlay.addEventListener('click', handleFruitAction);
    }

    async function handleFruitAction(event) {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const id = Number(button.dataset.id);

      if (button.dataset.action === 'view') await viewFruit(id);
      if (button.dataset.action === 'edit') {
        try {
          const response = await api.get(`/fruits/${id}`);
          openFruitForm(response.data);
        } catch (error) {
          toast(error.message, 'error');
        }
      }
      if (button.dataset.action === 'delete') await deleteFruit(id);
    }

    async function viewFruit(id) {
      try {
        const response = await api.get(`/fruits/${id}/stock`);
        const { fruit, stock, threshold } = response.data;

        const stockRows = stock
          .map(
            (row) => `
            <tr>
              <td>${sizeBadge(row.packaging_size)}</td>
              <td class="num">${row.selling_price ? money(row.selling_price) : '—'}</td>
              <td class="num">${quantity(row.available_quantity)} boxes</td>
              <td>${row.low_stock ? `<span class="badge unpaid">Low stock</span>` : `<span class="badge active">Healthy</span>`}</td>
            </tr>`
          )
          .join('');

        const overlay = openModal({
          title: fruit.fruit_name,
          subtitle: `Fruit #${fruit.fruit_id} · ${fruit.status}`,
          body: `
            <div class="detail-grid" style="margin-bottom:16px">
              <div class="detail-item span-2"><span class="label">Description</span><span class="value">${escapeHtml(fruit.description || 'No description')}</span></div>
              <div class="detail-item"><span class="label">Status</span><span class="value">${statusBadge(fruit.status)}</span></div>
              <div class="detail-item"><span class="label">Low stock threshold</span><span class="value">${threshold} boxes</span></div>
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Packaging</th><th class="num">Selling price</th><th class="num">Available</th><th>Status</th></tr></thead>
                <tbody>${stockRows}</tbody>
              </table>
            </div>
            <div class="payment-note">${icon('info', 15)} Each packaging size keeps its own price and stock balance. Sales always use the selling price configured here.</div>`,
          footer: `
            <button type="button" class="btn btn-secondary" data-close>Close</button>
            <button type="button" class="btn btn-primary" data-edit-fruit>${icon('edit', 16)} Edit fruit</button>`
        });

        overlay.querySelector('[data-edit-fruit]').addEventListener('click', () => openFruitForm(fruit));
      } catch (error) {
        toast(error.message, 'error');
      }
    }

    function openFruitForm(fruit = null) {
      const isEdit = Boolean(fruit);
      const overlay = openModal({
        title: isEdit ? 'Edit fruit' : 'Add fruit',
        subtitle: isEdit ? 'Update fruit details and packaging prices.' : 'Create a new fruit type with pricing for all packaging sizes.',
        size: 'lg',
        body: `
          <form id="fruitForm" class="form-grid">
            <div class="form-field">
              <label for="fruitName">Fruit name <span class="req">*</span></label>
              <input id="fruitName" name="fruit_name" maxlength="80" required value="${escapeHtml(fruit?.fruit_name || '')}" placeholder="e.g. Apples">
            </div>
            <div class="form-field">
              <label for="fruitStatusInput">Status <span class="req">*</span></label>
              <select id="fruitStatusInput" name="status" required>
                <option value="ACTIVE" ${!fruit || fruit.status === 'ACTIVE' ? 'selected' : ''}>Active</option>
                <option value="INACTIVE" ${fruit?.status === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
              </select>
            </div>
            <div class="form-field span-2">
              <label for="fruitDescription">Description</label>
              <textarea id="fruitDescription" name="description" maxlength="255" placeholder="Short description of the fruit and its source">${escapeHtml(fruit?.description || '')}</textarea>
            </div>

            <div class="form-section-title">Packaging selling prices</div>
            <div class="form-field">
              <label for="smallPrice">Small box price <span class="req">*</span></label>
              <div class="input-prefix"><span>M</span><input id="smallPrice" name="small_price" type="number" min="0.01" step="0.01" required value="${fruit?.small_price ?? ''}" placeholder="0.00"></div>
            </div>
            <div class="form-field">
              <label for="mediumPrice">Medium box price <span class="req">*</span></label>
              <div class="input-prefix"><span>M</span><input id="mediumPrice" name="medium_price" type="number" min="0.01" step="0.01" required value="${fruit?.medium_price ?? ''}" placeholder="0.00"></div>
            </div>
            <div class="form-field">
              <label for="largePrice">Large box price <span class="req">*</span></label>
              <div class="input-prefix"><span>M</span><input id="largePrice" name="large_price" type="number" min="0.01" step="0.01" required value="${fruit?.large_price ?? ''}" placeholder="0.00"></div>
            </div>
            <div class="form-field span-3">
              <span class="form-help">Each packaging size must have a different selling price. Stock starts at zero and increases when purchases are recorded.</span>
            </div>
          </form>`,
        footer: `
          <button type="button" class="btn btn-secondary" data-close>Cancel</button>
          <button type="submit" form="fruitForm" class="btn btn-primary" id="saveFruitBtn">${icon('check', 16)} ${isEdit ? 'Save changes' : 'Add fruit'}</button>`
      });

      const form = overlay.querySelector('#fruitForm');
      const saveButton = overlay.querySelector('#saveFruitBtn');

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const prices = {
          SMALL: Number(data.small_price),
          MEDIUM: Number(data.medium_price),
          LARGE: Number(data.large_price)
        };

        if (new Set(Object.values(prices)).size !== 3) {
          toast('Each packaging size must have a different selling price.', 'error');
          return;
        }

        const payload = {
          fruit_name: data.fruit_name,
          description: data.description,
          status: data.status,
          prices
        };

        setButtonBusy(saveButton, 'Saving...');
        try {
          const response = isEdit
            ? await api.put(`/fruits/${fruit.fruit_id}`, payload)
            : await api.post('/fruits', payload);
          toast(response.message || 'Fruit saved successfully.');
          closeModal();
          await load();
        } catch (error) {
          toast(error.message, 'error');
          resetButton(saveButton);
        }
      });
    }

    async function deleteFruit(id) {
      const confirmed = await confirmDialog({
        title: 'Delete fruit',
        message: 'Delete this fruit? Fruits used in purchases or sales cannot be deleted. Set the fruit to inactive instead.',
        confirmText: 'Delete fruit'
      });
      if (!confirmed) return;

      try {
        const response = await api.delete(`/fruits/${id}`);
        toast(response.message || 'Fruit deleted.');
        await load();
      } catch (error) {
        toast(error.message, 'error');
      }
    }

    async function load() {
      contentRoot.innerHTML = loadingState('Loading fruits and stock...');
      try {
        const [fruitsResponse, lowResponse] = await Promise.all([
          api.get('/fruits'),
          api.get('/fruits/low-stock')
        ]);
        fruits = fruitsResponse.data;
        lowStock = lowResponse.data;
        lowThreshold = lowResponse.threshold || 10;
        renderPage();
      } catch (error) {
        contentRoot.innerHTML = errorState(error.message, 'Could not load stock');
      }
    }

    addButton.addEventListener('click', () => openFruitForm());

    await load();
  }
};

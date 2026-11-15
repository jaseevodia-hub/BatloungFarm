import { api } from '../api.js';
import {
  PROVINCES,
  icon,
  quantity,
  escapeHtml,
  formatDate,
  loadingState,
  tableEmpty,
  toast,
  openModal,
  closeModal,
  confirmDialog,
  setButtonBusy,
  resetButton
} from '../ui.js';

export default {
  async render(el) {
    let currentProvince = '';
    let currentSearch = '';
    let suppliers = [];

    el.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-spacer"></div>
        <button type="button" class="btn btn-primary" id="addSupplierBtn">${icon('plus', 16)} Register supplier</button>
      </div>

      <section class="card">
        <div class="card-header">
          <div><h2>Supplier directory</h2><p id="supplierCount">Loading suppliers...</p></div>
          <div class="card-actions"><button type="button" class="btn btn-secondary btn-sm" id="openSupplierDirectory">${icon('eye', 15)} Open directory</button></div>
        </div>
        <div class="card-summary-value">
          <strong id="supplierTotal">—</strong>
          <span>Registered suppliers</span>
        </div>
      </section>`;

    const countText = el.querySelector('#supplierCount');
    const totalText = el.querySelector('#supplierTotal');

    function filteredSuppliers() {
      const term = currentSearch.trim().toLowerCase();
      return suppliers.filter((supplier) => {
        if (currentProvince && supplier.province !== currentProvince) return false;
        if (!term) return true;
        return [supplier.business_name, supplier.contact_person, supplier.phone, supplier.province, supplier.address].some(
          (value) => String(value || '').toLowerCase().includes(term)
        );
      });
    }

    function renderDirectory() {
      const tableRoot = document.querySelector('#supplierDirectoryTable');
      if (!tableRoot) return;

      const rows = filteredSuppliers();
      if (!rows.length) {
        tableRoot.innerHTML = `<div class="table-wrap"><table><tbody>${tableEmpty(6, 'No suppliers found', currentProvince || currentSearch.trim() ? 'No suppliers match the current filters.' : 'Register your first supplier to begin purchasing fruit.', 'suppliers')}</tbody></table></div>`;
        return;
      }

      tableRoot.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Business</th><th>Contact person</th><th>Phone</th><th>Province</th><th>Address</th><th></th></tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (supplier) => `
                  <tr>
                    <td>
                      <div class="table-title">
                        <span class="avatar-sm">${escapeHtml(supplier.business_name.slice(0, 2).toUpperCase())}</span>
                        <div>
                          <span class="table-strong">${escapeHtml(supplier.business_name)}</span>
                          <span class="table-sub">Supplier #${supplier.supplier_id}</span>
                        </div>
                      </div>
                    </td>
                    <td>${escapeHtml(supplier.contact_person)}</td>
                    <td class="nowrap">${escapeHtml(supplier.phone)}</td>
                    <td><span class="chip">${escapeHtml(supplier.province)}</span></td>
                    <td class="text-muted">${escapeHtml(supplier.address)}</td>
                    <td>
                      <div class="actions">
                        <button class="action-btn" data-action="view" data-id="${supplier.supplier_id}" title="View supplier">${icon('eye', 15)}</button>
                        <button class="action-btn" data-action="edit" data-id="${supplier.supplier_id}" title="Edit supplier">${icon('edit', 15)}</button>
                        <button class="action-btn danger" data-action="delete" data-id="${supplier.supplier_id}" title="Delete supplier">${icon('trash', 15)}</button>
                      </div>
                    </td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>`;
    }

    async function load() {
      try {
        const response = await api.get('/suppliers');
        suppliers = response.data;
        const rows = filteredSuppliers();
        countText.textContent = `${rows.length} supplier${rows.length === 1 ? '' : 's'}${currentProvince ? ` in ${currentProvince}` : ' across South Africa'}.`;
        totalText.textContent = quantity(suppliers.length);
        renderDirectory();
      } catch (error) {
        toast(error.message, 'error');
      }
    }

    function openDirectory() {
      const overlay = openModal({
        title: 'Supplier directory',
        subtitle: 'Filter by province, then view, edit or delete a supplier.',
        size: 'xl',
        body: `
          <div class="report-date-form" style="margin-bottom:14px">
            <div class="form-field" style="flex:1;min-width:240px">
              <label for="supplierSearchFilter">Search</label>
              <div class="search-box">${icon('search', 16)}<input id="supplierSearchFilter" type="search" placeholder="Business, contact, phone or address" autocomplete="off" value="${escapeHtml(currentSearch)}"></div>
            </div>
            <div class="form-field">
              <label for="supplierProvinceFilter">Province</label>
              <select id="supplierProvinceFilter">
                <option value="">All provinces</option>
                ${PROVINCES.map((province) => `<option value="${province}" ${province === currentProvince ? 'selected' : ''}>${province}</option>`).join('')}
              </select>
            </div>
          </div>
          <div id="supplierDirectoryTable"></div>`,
        footer: `<button type="button" class="btn btn-secondary" data-close>Close</button>`
      });

      const provinceFilter = overlay.querySelector('#supplierProvinceFilter');
      const searchFilter = overlay.querySelector('#supplierSearchFilter');

      function applyFilters() {
        currentProvince = provinceFilter.value;
        currentSearch = searchFilter.value;
        const rows = filteredSuppliers();
        countText.textContent = `${rows.length} supplier${rows.length === 1 ? '' : 's'}${currentProvince ? ` in ${currentProvince}` : ' across South Africa'}.`;
        renderDirectory();
      }

      provinceFilter.addEventListener('change', applyFilters);
      searchFilter.addEventListener('input', applyFilters);

      overlay.querySelector('#supplierDirectoryTable').addEventListener('click', handleDirectoryAction);
      renderDirectory();
    }

    async function handleDirectoryAction(event) {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const id = Number(button.dataset.id);

      if (button.dataset.action === 'view') await viewSupplier(id);
      if (button.dataset.action === 'edit') {
        try {
          const response = await api.get(`/suppliers/${id}`);
          openSupplierForm(response.data);
        } catch (error) {
          toast(error.message, 'error');
        }
      }
      if (button.dataset.action === 'delete') await deleteSupplier(id);
    }

    async function viewSupplier(id) {
      try {
        const response = await api.get(`/suppliers/${id}`);
        const supplier = response.data;
        const overlay = openModal({
          title: supplier.business_name,
          subtitle: `Supplier #${supplier.supplier_id}`,
          body: `
            <div class="detail-grid">
              <div class="detail-item"><span class="label">Business name</span><span class="value">${escapeHtml(supplier.business_name)}</span></div>
              <div class="detail-item"><span class="label">Contact person</span><span class="value">${escapeHtml(supplier.contact_person)}</span></div>
              <div class="detail-item"><span class="label">Phone</span><span class="value">${escapeHtml(supplier.phone)}</span></div>
              <div class="detail-item"><span class="label">Province</span><span class="value">${escapeHtml(supplier.province)}</span></div>
              <div class="detail-item span-2"><span class="label">Address</span><span class="value">${escapeHtml(supplier.address)}</span></div>
              <div class="detail-item span-2"><span class="label">Registered in system</span><span class="value">${formatDate(supplier.created_at, true)}</span></div>
            </div>`,
          footer: `
            <button type="button" class="btn btn-secondary" data-close>Close</button>
            <button type="button" class="btn btn-primary" data-edit-supplier>${icon('edit', 16)} Edit supplier</button>`
        });
        overlay.querySelector('[data-edit-supplier]').addEventListener('click', () => openSupplierForm(supplier));
      } catch (error) {
        toast(error.message, 'error');
      }
    }

    function openSupplierForm(supplier = null) {
      const isEdit = Boolean(supplier);
      const overlay = openModal({
        title: isEdit ? 'Edit supplier' : 'Register supplier',
        subtitle: isEdit ? supplier.business_name : 'Add a fruit supplier to the distribution network.',
        body: `
          <form id="supplierForm" class="form-grid">
            <div class="form-field span-2">
              <label for="businessName">Business name <span class="req">*</span></label>
              <input id="businessName" name="business_name" maxlength="120" required value="${escapeHtml(supplier?.business_name || '')}" placeholder="e.g. Highveld Fresh Produce">
            </div>
            <div class="form-field">
              <label for="contactPerson">Contact person <span class="req">*</span></label>
              <input id="contactPerson" name="contact_person" maxlength="100" required value="${escapeHtml(supplier?.contact_person || '')}" placeholder="Full name">
            </div>
            <div class="form-field">
              <label for="supplierPhone">Phone <span class="req">*</span></label>
              <input id="supplierPhone" name="phone" maxlength="20" required value="${escapeHtml(supplier?.phone || '')}" placeholder="+27 11 555 0142">
            </div>
            <div class="form-field">
              <label for="supplierProvince">Province <span class="req">*</span></label>
              <select id="supplierProvince" name="province" required>
                <option value="">Select a province</option>
                ${PROVINCES.map((province) => `<option value="${province}" ${supplier?.province === province ? 'selected' : ''}>${province}</option>`).join('')}
              </select>
            </div>
            <div class="form-field">
              <label for="supplierAddress">Address <span class="req">*</span></label>
              <input id="supplierAddress" name="address" maxlength="255" required value="${escapeHtml(supplier?.address || '')}" placeholder="Street, city">
            </div>
          </form>`,
        footer: `
          <button type="button" class="btn btn-secondary" data-close>Cancel</button>
          <button type="submit" form="supplierForm" class="btn btn-primary" id="saveSupplierBtn">${icon('check', 16)} ${isEdit ? 'Save changes' : 'Register supplier'}</button>`
      });

      const form = overlay.querySelector('#supplierForm');
      const saveButton = overlay.querySelector('#saveSupplierBtn');

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        setButtonBusy(saveButton, isEdit ? 'Saving...' : 'Registering...');
        try {
          const response = isEdit
            ? await api.put(`/suppliers/${supplier.supplier_id}`, data)
            : await api.post('/suppliers', data);
          toast(response.message || 'Supplier saved successfully.');
          closeModal();
          await load();
        } catch (error) {
          toast(error.message, 'error');
          resetButton(saveButton);
        }
      });
    }

    async function deleteSupplier(id) {
      const confirmed = await confirmDialog({
        title: 'Delete supplier',
        message: 'Delete this supplier? Suppliers with purchase records cannot be deleted.',
        confirmText: 'Delete supplier'
      });
      if (!confirmed) return;

      try {
        const response = await api.delete(`/suppliers/${id}`);
        toast(response.message || 'Supplier deleted.');
        await load();
      } catch (error) {
        toast(error.message, 'error');
      }
    }

    el.querySelector('#addSupplierBtn').addEventListener('click', () => openSupplierForm());
    el.querySelector('#openSupplierDirectory').addEventListener('click', openDirectory);

    await load();
  }
};

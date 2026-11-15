import { api } from '../api.js';
import {
  icon,
  money,
  quantity,
  escapeHtml,
  formatDate,
  todayISO,
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

export default {
  async render(el) {
    let allVendors = [];

    el.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-spacer"></div>
        <button type="button" class="btn btn-primary" id="addVendorBtn">${icon('plus', 16)} Register vendor</button>
      </div>
      <div id="vendorContent">${loadingState('Loading vendors...')}</div>`;

    const contentRoot = el.querySelector('#vendorContent');
    const addButton = el.querySelector('#addVendorBtn');

    function vendorRows(vendors) {
      return vendors
        .map(
          (vendor) => `
          <tr>
            <td>
              <div class="table-title">
                <span class="avatar-sm">${escapeHtml(vendor.vendor_name.slice(0, 2).toUpperCase())}</span>
                <div>
                  <span class="table-strong">${escapeHtml(vendor.vendor_name)}</span>
                  <span class="table-sub">Vendor #${vendor.vendor_id} · ${quantity(vendor.sales_count)} sale(s)</span>
                </div>
              </div>
            </td>
            <td class="nowrap">${escapeHtml(vendor.phone_number)}</td>
            <td>${escapeHtml(vendor.location)}</td>
            <td class="nowrap">${formatDate(vendor.registration_date)}</td>
            <td class="num">${Number(vendor.outstanding_balance) > 0 ? `<span class="badge unpaid">${money(vendor.outstanding_balance)}</span>` : `<span class="badge active">Settled</span>`}</td>
            <td>
              <div class="actions">
                <button class="action-btn" data-action="view" data-id="${vendor.vendor_id}" title="View vendor">${icon('eye', 15)}</button>
                <button class="action-btn" data-action="edit" data-id="${vendor.vendor_id}" title="Edit vendor">${icon('edit', 15)}</button>
                <button class="action-btn danger" data-action="delete" data-id="${vendor.vendor_id}" title="Delete vendor">${icon('trash', 15)}</button>
              </div>
            </td>
          </tr>`
        )
        .join('');
    }

    function vendorTable(vendors) {
      if (!vendors.length) {
        return `<div class="table-wrap"><table><tbody>${tableEmpty(6, 'No vendors found', 'No vendors match these filters.', 'vendors')}</tbody></table></div>`;
      }

      return `
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Vendor</th><th>Phone</th><th>Location</th><th>Registered</th><th class="num">Outstanding</th><th></th></tr>
            </thead>
            <tbody>${vendorRows(vendors)}</tbody>
          </table>
        </div>`;
    }

    function renderPage() {
      const withBalance = allVendors.filter((vendor) => Number(vendor.outstanding_balance) > 0);
      const settled = allVendors.length - withBalance.length;
      const totalOutstanding = allVendors.reduce(
        (sum, vendor) => sum + Number(vendor.outstanding_balance || 0),
        0
      );

      contentRoot.innerHTML = `
        <div class="stat-grid">
          <article class="stat-card">
            <div class="stat-top"><span class="stat-label">Registered vendors</span><span class="stat-icon">${icon('vendors', 19)}</span></div>
            <div class="stat-value">${quantity(allVendors.length)}</div>
            <div class="stat-meta">Vendors in the distribution network</div>
          </article>
          <article class="stat-card ${withBalance.length ? 'amber' : ''}">
            <div class="stat-top"><span class="stat-label">With balance</span><span class="stat-icon">${icon('alert', 19)}</span></div>
            <div class="stat-value">${quantity(withBalance.length)}</div>
            <div class="stat-meta">Vendors still owing the farm</div>
          </article>
          <article class="stat-card blue">
            <div class="stat-top"><span class="stat-label">Settled vendors</span><span class="stat-icon">${icon('check', 19)}</span></div>
            <div class="stat-value">${quantity(settled)}</div>
            <div class="stat-meta">Accounts paid in full</div>
          </article>
          <article class="stat-card ${totalOutstanding > 0 ? 'red' : ''}">
            <div class="stat-top"><span class="stat-label">Outstanding total</span><span class="stat-icon">${icon('money', 19)}</span></div>
            <div class="stat-value">${money(totalOutstanding)}</div>
            <div class="stat-meta">Balance to collect</div>
          </article>
        </div>

        <div class="grid-3">
          <section class="card">
            <div class="card-header">
              <div><h2>Vendor directory</h2><p>${allVendors.length} vendor(s) with contact and balance details.</p></div>
              <div class="card-actions"><button type="button" class="btn btn-secondary btn-sm" id="openVendorDirectory">${icon('eye', 15)} Open</button></div>
            </div>
            <div class="card-summary-value">
              <strong>${quantity(allVendors.length)}</strong>
              <span>Registered vendors</span>
            </div>
          </section>

          <section class="card">
            <div class="card-header">
              <div><h2>Outstanding balances</h2><p>${withBalance.length} vendor(s) with unpaid sales.</p></div>
              <div class="card-actions"><button type="button" class="btn btn-secondary btn-sm" id="openOutstandingVendors">${icon('eye', 15)} Open</button></div>
            </div>
            <div class="card-summary-value">
              <strong>${money(totalOutstanding)}</strong>
              <span>Total outstanding</span>
            </div>
          </section>

          <section class="card">
            <div class="card-header">
              <div><h2>Settled vendors</h2><p>${settled} vendor(s) fully paid up.</p></div>
              <div class="card-actions"><button type="button" class="btn btn-secondary btn-sm" id="openSettledVendors">${icon('eye', 15)} Open</button></div>
            </div>
            <div class="card-summary-value">
              <strong>${quantity(settled)}</strong>
              <span>Settled accounts</span>
            </div>
          </section>
        </div>`;

      contentRoot.querySelector('#openVendorDirectory').addEventListener('click', () => openDirectory(''));
      contentRoot.querySelector('#openOutstandingVendors').addEventListener('click', () => openDirectory('outstanding'));
      contentRoot.querySelector('#openSettledVendors').addEventListener('click', () => openDirectory('settled'));
    }

    function openDirectory(preset = '') {
      const locations = [...new Set(allVendors.map((vendor) => vendor.location))].sort();

      const overlay = openModal({
        title: preset === 'outstanding' ? 'Vendors with outstanding balance' : preset === 'settled' ? 'Settled vendors' : 'Vendor directory',
        subtitle: 'Filter vendors by location or balance, then view, edit or delete a vendor.',
        size: 'xl',
        body: `
          <div class="report-date-form" style="margin-bottom:14px">
            <div class="form-field" style="flex:1;min-width:240px">
              <label for="vendorSearchFilter">Search</label>
              <div class="search-box">${icon('search', 16)}<input id="vendorSearchFilter" type="search" placeholder="Vendor name, phone or location" autocomplete="off"></div>
            </div>
            <div class="form-field">
              <label for="vendorLocationFilter">Location</label>
              <select id="vendorLocationFilter">
                <option value="">All locations</option>
                ${locations.map((location) => `<option value="${escapeHtml(location)}">${escapeHtml(location)}</option>`).join('')}
              </select>
            </div>
            <div class="form-field">
              <label for="vendorBalanceFilter">Balance</label>
              <select id="vendorBalanceFilter">
                <option value="">All balances</option>
                <option value="outstanding" ${preset === 'outstanding' ? 'selected' : ''}>With outstanding balance</option>
                <option value="settled" ${preset === 'settled' ? 'selected' : ''}>Fully settled</option>
              </select>
            </div>
          </div>
          <div id="vendorDirectoryTable"></div>`,
        footer: `<button type="button" class="btn btn-secondary" data-close>Close</button>`
      });

      const locationFilter = overlay.querySelector('#vendorLocationFilter');
      const balanceFilter = overlay.querySelector('#vendorBalanceFilter');
      const searchFilter = overlay.querySelector('#vendorSearchFilter');
      const tableRoot = overlay.querySelector('#vendorDirectoryTable');

      function renderDirectory() {
        const term = searchFilter.value.trim().toLowerCase();
        const filtered = allVendors.filter((vendor) => {
          if (locationFilter.value && vendor.location !== locationFilter.value) return false;
          if (balanceFilter.value === 'outstanding' && Number(vendor.outstanding_balance) <= 0) return false;
          if (balanceFilter.value === 'settled' && Number(vendor.outstanding_balance) > 0) return false;
          if (!term) return true;
          return [vendor.vendor_name, vendor.phone_number, vendor.location].some((value) =>
            String(value || '').toLowerCase().includes(term)
          );
        });
        tableRoot.innerHTML = vendorTable(filtered);
      }

      locationFilter.addEventListener('change', renderDirectory);
      balanceFilter.addEventListener('change', renderDirectory);
      searchFilter.addEventListener('input', renderDirectory);
      tableRoot.addEventListener('click', handleVendorAction);

      renderDirectory();
    }

    async function handleVendorAction(event) {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const id = Number(button.dataset.id);

      if (button.dataset.action === 'view') await viewVendor(id);
      if (button.dataset.action === 'edit') {
        try {
          const response = await api.get(`/vendors/${id}`);
          openVendorForm(response.data);
        } catch (error) {
          toast(error.message, 'error');
        }
      }
      if (button.dataset.action === 'delete') await deleteVendor(id);
    }

    async function viewVendor(id) {
      try {
        const response = await api.get(`/vendors/${id}`);
        const vendor = response.data;
        const overlay = openModal({
          title: vendor.vendor_name,
          subtitle: `Vendor #${vendor.vendor_id} · ${vendor.location}`,
          body: `
            <div class="summary-strip">
              <div><span class="label">Outstanding balance</span><span class="value ${Number(vendor.outstanding_balance) > 0 ? 'text-danger' : 'text-success'}">${money(vendor.outstanding_balance)}</span></div>
              <div><span class="label">Sales recorded</span><span class="value">${quantity(vendor.sales_count)}</span></div>
              <div><span class="label">Registered</span><span class="value small">${formatDate(vendor.registration_date)}</span></div>
            </div>
            <div class="detail-grid">
              <div class="detail-item"><span class="label">Vendor name</span><span class="value">${escapeHtml(vendor.vendor_name)}</span></div>
              <div class="detail-item"><span class="label">Phone number</span><span class="value">${escapeHtml(vendor.phone_number)}</span></div>
              <div class="detail-item span-2"><span class="label">Location</span><span class="value">${escapeHtml(vendor.location)}</span></div>
            </div>`,
          footer: `
            <button type="button" class="btn btn-secondary" data-close>Close</button>
            <button type="button" class="btn btn-primary" data-edit-vendor>${icon('edit', 16)} Edit vendor</button>`
        });
        overlay.querySelector('[data-edit-vendor]').addEventListener('click', () => openVendorForm(vendor));
      } catch (error) {
        toast(error.message, 'error');
      }
    }

    function openVendorForm(vendor = null) {
      const isEdit = Boolean(vendor);
      const overlay = openModal({
        title: isEdit ? 'Edit vendor' : 'Register vendor',
        subtitle: isEdit ? vendor.vendor_name : 'Add a street vendor or small retailer.',
        body: `
          <form id="vendorForm" class="form-grid">
            <div class="form-field span-2">
              <label for="vendorName">Vendor name <span class="req">*</span></label>
              <input id="vendorName" name="vendor_name" maxlength="120" required value="${escapeHtml(vendor?.vendor_name || '')}" placeholder="e.g. Maseru Central Vendor">
            </div>
            <div class="form-field">
              <label for="vendorPhone">Phone number <span class="req">*</span></label>
              <input id="vendorPhone" name="phone_number" maxlength="20" required value="${escapeHtml(vendor?.phone_number || '')}" placeholder="+266 5800 1122">
            </div>
            <div class="form-field">
              <label for="vendorLocation">Location <span class="req">*</span></label>
              <input id="vendorLocation" name="location" maxlength="150" required value="${escapeHtml(vendor?.location || '')}" placeholder="e.g. Maseru CBD">
            </div>
            <div class="form-field">
              <label for="vendorDate">Registration date <span class="req">*</span></label>
              <input id="vendorDate" name="registration_date" type="date" required value="${vendor?.registration_date ? String(vendor.registration_date).slice(0, 10) : todayISO()}">
            </div>
          </form>`,
        footer: `
          <button type="button" class="btn btn-secondary" data-close>Cancel</button>
          <button type="submit" form="vendorForm" class="btn btn-primary" id="saveVendorBtn">${icon('check', 16)} ${isEdit ? 'Save changes' : 'Register vendor'}</button>`
      });

      const form = overlay.querySelector('#vendorForm');
      const saveButton = overlay.querySelector('#saveVendorBtn');

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        setButtonBusy(saveButton, isEdit ? 'Saving...' : 'Registering...');
        try {
          const response = isEdit
            ? await api.put(`/vendors/${vendor.vendor_id}`, data)
            : await api.post('/vendors', data);
          toast(response.message || 'Vendor saved successfully.');
          closeModal();
          await load();
        } catch (error) {
          toast(error.message, 'error');
          resetButton(saveButton);
        }
      });
    }

    async function deleteVendor(id) {
      const confirmed = await confirmDialog({
        title: 'Delete vendor',
        message: 'Delete this vendor? Vendors with sales records cannot be deleted.',
        confirmText: 'Delete vendor'
      });
      if (!confirmed) return;

      try {
        const response = await api.delete(`/vendors/${id}`);
        toast(response.message || 'Vendor deleted.');
        await load();
      } catch (error) {
        toast(error.message, 'error');
      }
    }

    async function load() {
      contentRoot.innerHTML = loadingState('Loading vendors...');
      try {
        const response = await api.get('/vendors');
        allVendors = response.data;
        renderPage();
      } catch (error) {
        contentRoot.innerHTML = errorState(error.message, 'Could not load vendors');
      }
    }

    addButton.addEventListener('click', () => openVendorForm());

    await load();
  }
};

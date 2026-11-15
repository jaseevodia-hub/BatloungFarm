const supplierModel = require('../models/supplierModel');
const ApiError = require('../utils/ApiError');
const {
  requiredString,
  phoneNumber,
  province,
  positiveId
} = require('../utils/validation');

async function listSuppliers(req, res, next) {
  try {
    const suppliers = await supplierModel.findAll(req.query.q ? String(req.query.q).trim() : null);
    res.status(200).json({ success: true, count: suppliers.length, data: suppliers });
  } catch (error) {
    next(error);
  }
}

async function getSupplier(req, res, next) {
  try {
    const id = positiveId(req.params.id, 'Supplier ID');
    const supplier = await supplierModel.findById(id);
    if (!supplier) throw ApiError.notFound('Supplier not found.');
    res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
}

async function createSupplier(req, res, next) {
  try {
    const data = {
      businessName: requiredString(req.body.business_name, 'Business name', 120),
      contactPerson: requiredString(req.body.contact_person, 'Contact person', 100),
      phone: phoneNumber(req.body.phone),
      province: province(req.body.province),
      address: requiredString(req.body.address, 'Address', 255)
    };

    const supplier = await supplierModel.create(data);
    res.status(201).json({
      success: true,
      message: 'Supplier registered successfully.',
      data: supplier
    });
  } catch (error) {
    next(error);
  }
}

async function updateSupplier(req, res, next) {
  try {
    const id = positiveId(req.params.id, 'Supplier ID');
    const existing = await supplierModel.findById(id);
    if (!existing) throw ApiError.notFound('Supplier not found.');

    const fields = {};
    if (req.body.business_name !== undefined) {
      fields.businessName = requiredString(req.body.business_name, 'Business name', 120);
    }
    if (req.body.contact_person !== undefined) {
      fields.contactPerson = requiredString(req.body.contact_person, 'Contact person', 100);
    }
    if (req.body.phone !== undefined) {
      fields.phone = phoneNumber(req.body.phone);
    }
    if (req.body.province !== undefined) {
      fields.province = province(req.body.province);
    }
    if (req.body.address !== undefined) {
      fields.address = requiredString(req.body.address, 'Address', 255);
    }

    if (!Object.keys(fields).length) {
      throw ApiError.badRequest('Provide at least one supplier field to update.');
    }

    const supplier = await supplierModel.update(id, fields);
    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully.',
      data: supplier
    });
  } catch (error) {
    next(error);
  }
}

async function deleteSupplier(req, res, next) {
  try {
    const id = positiveId(req.params.id, 'Supplier ID');
    const existing = await supplierModel.findById(id);
    if (!existing) throw ApiError.notFound('Supplier not found.');

    const purchaseCount = await supplierModel.countPurchases(id);
    if (purchaseCount > 0) {
      throw ApiError.conflict(
        `Supplier cannot be deleted because ${purchaseCount} purchase record(s) depend on it.`
      );
    }

    await supplierModel.remove(id);
    res.status(200).json({ success: true, message: 'Supplier deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier
};

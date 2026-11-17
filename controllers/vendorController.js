const vendorModel = require('../models/vendorModel');
const ApiError = require('../utils/ApiError');
const {
  requiredString,
  phoneNumber,
  positiveId,
  coordinate,
  dateOnly
} = require('../utils/validation');

function locationCoordinates(body) {
  const hasLatitude = body.latitude !== undefined && body.latitude !== null;
  const hasLongitude = body.longitude !== undefined && body.longitude !== null;
  if (hasLatitude !== hasLongitude) {
    throw ApiError.badRequest('Provide both latitude and longitude, or neither.');
  }
  return {
    latitude: coordinate(body.latitude, 'Latitude', 90),
    longitude: coordinate(body.longitude, 'Longitude', 180)
  };
}

async function listVendors(req, res, next) {
  try {
    const vendors = await vendorModel.findAll(req.query.q ? String(req.query.q).trim() : null);
    res.status(200).json({ success: true, count: vendors.length, data: vendors });
  } catch (error) {
    next(error);
  }
}

async function getVendor(req, res, next) {
  try {
    const id = positiveId(req.params.id, 'Vendor ID');
    const vendor = await vendorModel.findById(id);
    if (!vendor) throw ApiError.notFound('Vendor not found.');
    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
}

async function createVendor(req, res, next) {
  try {
    const coordinates = locationCoordinates(req.body);
    const data = {
      vendorName: requiredString(req.body.vendor_name, 'Vendor name', 120),
      phoneNumber: phoneNumber(req.body.phone_number, 'Phone number'),
      location: requiredString(req.body.location, 'Location', 150),
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      registrationDate: dateOnly(
        req.body.registration_date || new Date().toISOString().slice(0, 10),
        'Registration date'
      )
    };

    const vendor = await vendorModel.create(data);
    res.status(201).json({
      success: true,
      message: 'Vendor registered successfully.',
      data: vendor
    });
  } catch (error) {
    next(error);
  }
}

async function updateVendor(req, res, next) {
  try {
    const id = positiveId(req.params.id, 'Vendor ID');
    const existing = await vendorModel.findById(id);
    if (!existing) throw ApiError.notFound('Vendor not found.');

    const fields = {};
    if (req.body.vendor_name !== undefined) {
      fields.vendorName = requiredString(req.body.vendor_name, 'Vendor name', 120);
    }
    if (req.body.phone_number !== undefined) {
      fields.phoneNumber = phoneNumber(req.body.phone_number, 'Phone number');
    }
    if (req.body.location !== undefined) {
      fields.location = requiredString(req.body.location, 'Location', 150);
    }
    if (req.body.latitude !== undefined || req.body.longitude !== undefined) {
      const coordinates = locationCoordinates(req.body);
      fields.latitude = coordinates.latitude;
      fields.longitude = coordinates.longitude;
    }
    if (req.body.registration_date !== undefined) {
      fields.registrationDate = dateOnly(req.body.registration_date, 'Registration date');
    }

    if (!Object.keys(fields).length) {
      throw ApiError.badRequest('Provide at least one vendor field to update.');
    }

    const vendor = await vendorModel.update(id, fields);
    res.status(200).json({
      success: true,
      message: 'Vendor updated successfully.',
      data: vendor
    });
  } catch (error) {
    next(error);
  }
}

async function deleteVendor(req, res, next) {
  try {
    const id = positiveId(req.params.id, 'Vendor ID');
    const existing = await vendorModel.findById(id);
    if (!existing) throw ApiError.notFound('Vendor not found.');

    const salesCount = await vendorModel.countSales(id);
    if (salesCount > 0) {
      throw ApiError.conflict(
        `Vendor cannot be deleted because ${salesCount} sale record(s) depend on it.`
      );
    }

    await vendorModel.remove(id);
    res.status(200).json({ success: true, message: 'Vendor deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor
};

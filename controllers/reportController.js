const reportModel = require('../models/reportModel');
const { optionalDateRange, packagingSize } = require('../utils/validation');

function threshold() {
  return Number(process.env.LOW_STOCK_THRESHOLD) || 10;
}

async function topFruits(req, res, next) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 5;
    const fruits = await reportModel.topFruits(limit);
    res.status(200).json({ success: true, data: fruits });
  } catch (error) {
    next(error);
  }
}

async function revenueReport(req, res, next) {
  try {
    const range = optionalDateRange(req.query.start_date, req.query.end_date);
    const revenue = await reportModel.revenue(range);
    res.status(200).json({
      success: true,
      range: { start_date: range.start, end_date: range.end },
      data: revenue
    });
  } catch (error) {
    next(error);
  }
}

async function topVendors(req, res, next) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 5;
    const vendors = await reportModel.topVendors(limit);
    res.status(200).json({
      success: true,
      top_vendor: vendors[0] || null,
      data: vendors
    });
  } catch (error) {
    next(error);
  }
}

async function currentStock(req, res, next) {
  try {
    const size = req.query.packaging_size
      ? packagingSize(String(req.query.packaging_size).toUpperCase())
      : undefined;
    const stock = await reportModel.currentStock({ packagingSize: size });
    res.status(200).json({ success: true, count: stock.length, data: stock });
  } catch (error) {
    next(error);
  }
}

async function dashboard(req, res, next) {
  try {
    const data = await reportModel.dashboard(threshold());
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = { topFruits, revenueReport, topVendors, currentStock, dashboard };

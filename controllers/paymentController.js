const { pool } = require('../config/db');
const saleModel = require('../models/saleModel');
const paymentModel = require('../models/paymentModel');
const ApiError = require('../utils/ApiError');
const {
  positiveId,
  positiveMoney,
  settlementMethod,
  optionalString
} = require('../utils/validation');

async function listPayments(req, res, next) {
  try {
    const payments = await paymentModel.history({
      search: req.query.q ? String(req.query.q).trim() : null
    });
    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    next(error);
  }
}

async function outstandingByVendor(req, res, next) {
  try {
    const vendors = await paymentModel.outstandingByVendor();
    const total = vendors.reduce((sum, vendor) => sum + Number(vendor.outstanding_balance), 0);
    res.status(200).json({
      success: true,
      total_outstanding: Math.round(total * 100) / 100,
      count: vendors.length,
      data: vendors
    });
  } catch (error) {
    next(error);
  }
}

async function outstandingSales(req, res, next) {
  try {
    const sales = await paymentModel.outstandingSales();
    res.status(200).json({ success: true, count: sales.length, data: sales });
  } catch (error) {
    next(error);
  }
}

async function paymentSummary(req, res, next) {
  try {
    const summary = await paymentModel.summary();
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
}

async function recordPayment(req, res, next) {
  let connection;
  try {
    const saleId = positiveId(req.body.sale_id, 'Sale ID');
    const amount = positiveMoney(req.body.amount, 'Payment amount');
    const method = settlementMethod(req.body.payment_method);
    const reference = optionalString(req.body.reference, 'Reference', 80);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const sale = await saleModel.findByIdForUpdate(connection, saleId);
    if (!sale) throw ApiError.notFound('Sale not found.');

    const outstanding = Math.round(
      (Number(sale.total_amount) - Number(sale.amount_paid)) * 100
    ) / 100;

    if (outstanding <= 0) {
      throw ApiError.badRequest('This sale has already been paid in full.');
    }
    if (amount > outstanding) {
      throw ApiError.badRequest(
        `Payment cannot exceed the outstanding balance of ${outstanding.toFixed(2)}.`
      );
    }

    const newAmountPaid = Math.round((Number(sale.amount_paid) + amount) * 100) / 100;
    const paymentStatus = newAmountPaid >= Number(sale.total_amount) ? 'PAID' : 'PARTIALLY_PAID';

    await paymentModel.create(connection, {
      saleId,
      amount,
      paymentMethod: method,
      reference
    });
    await saleModel.updatePayment(connection, saleId, newAmountPaid, paymentStatus);

    await connection.commit();

    const updatedSale = await saleModel.findById(saleId);
    res.status(201).json({
      success: true,
      message: `Payment recorded. Outstanding balance is ${(Number(updatedSale.total_amount) - newAmountPaid).toFixed(2)}.`,
      data: updatedSale
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('[rollback]', rollbackError.message);
      }
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  listPayments,
  outstandingByVendor,
  outstandingSales,
  paymentSummary,
  recordPayment
};

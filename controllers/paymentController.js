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

async function getPayment(req, res, next) {
  try {
    const id = positiveId(req.params.id, 'Payment ID');
    const payment = await paymentModel.findById(id);
    if (!payment) throw ApiError.notFound('Payment not found.');
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
}

function paymentStatusFor(amountPaid, totalAmount) {
  if (amountPaid >= totalAmount) return 'PAID';
  if (amountPaid > 0) return 'PARTIALLY_PAID';
  return 'UNPAID';
}

async function updatePayment(req, res, next) {
  let connection;
  try {
    const id = positiveId(req.params.id, 'Payment ID');
    const amount = positiveMoney(req.body.amount, 'Payment amount');
    const method = settlementMethod(req.body.payment_method);
    const reference = optionalString(req.body.reference, 'Reference', 80);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const payment = await paymentModel.findByIdForUpdate(connection, id);
    if (!payment) throw ApiError.notFound('Payment not found.');

    const sale = await saleModel.findByIdForUpdate(connection, payment.sale_id);
    if (!sale) throw ApiError.notFound('Sale not found.');

    const otherPaid = Math.round((Number(sale.amount_paid) - Number(payment.amount)) * 100) / 100;
    const newAmountPaid = Math.round((otherPaid + amount) * 100) / 100;

    if (newAmountPaid > Number(sale.total_amount)) {
      throw ApiError.badRequest(
        `Payment cannot exceed the sale total of ${Number(sale.total_amount).toFixed(2)}. ` +
        `Maximum allowed for this payment is ${Math.max(Number(sale.total_amount) - otherPaid, 0).toFixed(2)}.`
      );
    }

    await paymentModel.update(connection, id, { amount, paymentMethod: method, reference });
    await saleModel.updatePayment(
      connection,
      sale.sale_id,
      newAmountPaid,
      paymentStatusFor(newAmountPaid, Number(sale.total_amount))
    );

    await connection.commit();

    const updated = await paymentModel.findById(id);
    res.status(200).json({
      success: true,
      message: 'Payment updated successfully.',
      data: updated
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

async function deletePayment(req, res, next) {
  let connection;
  try {
    const id = positiveId(req.params.id, 'Payment ID');

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const payment = await paymentModel.findByIdForUpdate(connection, id);
    if (!payment) throw ApiError.notFound('Payment not found.');

    const sale = await saleModel.findByIdForUpdate(connection, payment.sale_id);
    if (!sale) throw ApiError.notFound('Sale not found.');

    const newAmountPaid = Math.max(
      0,
      Math.round((Number(sale.amount_paid) - Number(payment.amount)) * 100) / 100
    );

    await paymentModel.remove(connection, id);
    await saleModel.updatePayment(
      connection,
      sale.sale_id,
      newAmountPaid,
      paymentStatusFor(newAmountPaid, Number(sale.total_amount))
    );

    await connection.commit();

    res.status(200).json({
      success: true,
      message: 'Payment deleted and sale balance updated successfully.'
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
  getPayment,
  outstandingByVendor,
  outstandingSales,
  paymentSummary,
  recordPayment,
  updatePayment,
  deletePayment
};

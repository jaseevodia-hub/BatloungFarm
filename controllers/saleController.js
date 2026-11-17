const { pool } = require('../config/db');
const saleModel = require('../models/saleModel');
const paymentModel = require('../models/paymentModel');
const ApiError = require('../utils/ApiError');
const {
  positiveId,
  dateOnly,
  positiveInteger,
  nonNegativeNumber,
  packagingSize,
  paymentMethod,
  settlementMethod,
  ensureNonEmptyArray
} = require('../utils/validation');
const { PAYMENT_STATUSES } = require('../utils/constants');

async function listSales(req, res, next) {
  try {
    const paymentStatus = req.query.payment_status
      ? String(req.query.payment_status).toUpperCase()
      : undefined;

    if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) {
      throw ApiError.badRequest(`Payment status must be one of: ${PAYMENT_STATUSES.join(', ')}.`);
    }

    const sales = await saleModel.findAll({
      search: req.query.q ? String(req.query.q).trim() : null,
      vendorId: req.query.vendor_id ? positiveId(req.query.vendor_id, 'Vendor ID') : undefined,
      paymentStatus,
      startDate: req.query.start_date
        ? dateOnly(req.query.start_date, 'Start date', { required: false })
        : undefined,
      endDate: req.query.end_date
        ? dateOnly(req.query.end_date, 'End date', { required: false })
        : undefined
    });

    res.status(200).json({ success: true, count: sales.length, data: sales });
  } catch (error) {
    next(error);
  }
}

async function getSale(req, res, next) {
  try {
    const id = positiveId(req.params.id, 'Sale ID');
    const sale = await saleModel.findById(id);
    if (!sale) throw ApiError.notFound('Sale not found.');
    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
}

async function createSale(req, res, next) {
  let connection;
  try {
    const vendorId = positiveId(req.body.vendor_id, 'Vendor ID');
    const saleDate = req.body.sale_date ? dateOnly(req.body.sale_date, 'Sale date') : new Date();
    const method = paymentMethod(req.body.payment_method);
    const settlement = req.body.settlement_method
      ? settlementMethod(req.body.settlement_method)
      : 'CASH';

    const rawItems = ensureNonEmptyArray(req.body.items, 'Items');
    const aggregated = new Map();

    rawItems.forEach((item, index) => {
      const fruitId = positiveId(item.fruit_id, `Item ${index + 1} fruit ID`);
      const size = packagingSize(item.packaging_size, `Item ${index + 1} packaging size`);
      const quantity = positiveInteger(item.quantity, `Item ${index + 1} quantity`);
      const key = `${fruitId}-${size}`;

      if (aggregated.has(key)) {
        aggregated.get(key).quantity += quantity;
      } else {
        aggregated.set(key, { fruitId, packagingSize: size, quantity });
      }
    });

    const items = Array.from(aggregated.values());

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [vendors] = await connection.execute(
      'SELECT vendor_id FROM vendors WHERE vendor_id = ?',
      [vendorId]
    );
    if (!vendors[0]) throw ApiError.notFound('Vendor not found.');

    let totalAmount = 0;

    for (const item of items) {
      const [fruitRows] = await connection.execute(
        `SELECT f.fruit_id, f.fruit_name, f.status, fp.selling_price
         FROM fruits f
         LEFT JOIN fruit_prices fp
           ON fp.fruit_id = f.fruit_id AND fp.packaging_size = ?
         WHERE f.fruit_id = ?`,
        [item.packagingSize, item.fruitId]
      );

      const fruit = fruitRows[0];
      if (!fruit) {
        throw ApiError.badRequest(`Fruit ID ${item.fruitId} does not exist.`);
      }
      if (fruit.status !== 'AVAILABLE') {
        throw ApiError.badRequest(`Fruit "${fruit.fruit_name}" is unavailable and cannot be sold.`);
      }
      if (fruit.selling_price === null || fruit.selling_price === undefined) {
        throw ApiError.badRequest(
          `No ${item.packagingSize.toLowerCase()} selling price is configured for "${fruit.fruit_name}".`
        );
      }

      const [stockRows] = await connection.execute(
        `SELECT available_quantity FROM stock
         WHERE fruit_id = ? AND packaging_size = ?
         FOR UPDATE`,
        [item.fruitId, item.packagingSize]
      );

      const available = stockRows[0] ? Number(stockRows[0].available_quantity) : 0;
      if (available < item.quantity) {
        throw ApiError.badRequest(
          `Insufficient stock for ${fruit.fruit_name} (${item.packagingSize}): ` +
          `requested ${item.quantity} box(es), available ${available}. The entire sale was rejected.`
        );
      }

      item.unitPrice = Number(fruit.selling_price);
      item.fruitName = fruit.fruit_name;
      item.lineTotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
      totalAmount += item.lineTotal;
    }

    totalAmount = Math.round(totalAmount * 100) / 100;

    let amountPaid;
    if (req.body.amount_paid !== undefined && req.body.amount_paid !== null && req.body.amount_paid !== '') {
      amountPaid = nonNegativeNumber(req.body.amount_paid, 'Amount paid');
    } else {
      amountPaid = method === 'CREDIT' ? 0 : totalAmount;
    }

    if (amountPaid > totalAmount) {
      throw ApiError.badRequest('Amount paid cannot be greater than the total sale amount.');
    }

    let paymentStatus = 'UNPAID';
    if (amountPaid >= totalAmount) {
      paymentStatus = 'PAID';
    } else if (amountPaid > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    const saleId = await saleModel.create(connection, {
      vendorId,
      saleDate,
      paymentStatus,
      paymentMethod: method,
      totalAmount,
      amountPaid
    });

    for (const item of items) {
      await saleModel.addDetail(connection, saleId, item);

      const [updateResult] = await connection.execute(
        `UPDATE stock
         SET available_quantity = available_quantity - ?
         WHERE fruit_id = ? AND packaging_size = ? AND available_quantity >= ?`,
        [item.quantity, item.fruitId, item.packagingSize, item.quantity]
      );

      if (updateResult.affectedRows !== 1) {
        throw ApiError.conflict(
          `Stock for ${item.fruitName} (${item.packagingSize}) changed before the sale completed. Please retry.`
        );
      }
    }

    if (amountPaid > 0) {
      await paymentModel.create(connection, {
        saleId,
        amount: amountPaid,
        paymentMethod: method === 'CREDIT' ? settlement : method,
        reference: `SALE-${saleId}`
      });
    }

    await connection.commit();

    const sale = await saleModel.findById(saleId);
    res.status(201).json({
      success: true,
      message: `Sale recorded successfully. Total payable: ${totalAmount.toFixed(2)}.`,
      data: sale
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

async function updateSale(req, res, next) {
  let connection;
  try {
    const id = positiveId(req.params.id, 'Sale ID');
    const vendorId = positiveId(req.body.vendor_id, 'Vendor ID');
    const saleDate = req.body.sale_date ? dateOnly(req.body.sale_date, 'Sale date') : new Date();

    const rawItems = ensureNonEmptyArray(req.body.items, 'Items');
    const aggregated = new Map();

    rawItems.forEach((item, index) => {
      const fruitId = positiveId(item.fruit_id, `Item ${index + 1} fruit ID`);
      const size = packagingSize(item.packaging_size, `Item ${index + 1} packaging size`);
      const quantity = positiveInteger(item.quantity, `Item ${index + 1} quantity`);
      const key = `${fruitId}-${size}`;

      if (aggregated.has(key)) {
        aggregated.get(key).quantity += quantity;
      } else {
        aggregated.set(key, { fruitId, packagingSize: size, quantity });
      }
    });

    const items = Array.from(aggregated.values());

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const existing = await saleModel.findByIdForUpdate(connection, id);
    if (!existing) throw ApiError.notFound('Sale not found.');

    const method = req.body.payment_method
      ? paymentMethod(req.body.payment_method)
      : existing.payment_method;

    const [vendors] = await connection.execute(
      'SELECT vendor_id FROM vendors WHERE vendor_id = ?',
      [vendorId]
    );
    if (!vendors[0]) throw ApiError.notFound('Vendor not found.');

    const oldItems = await saleModel.findDetailsForUpdate(connection, id);
    for (const item of oldItems) {
      await connection.execute(
        `UPDATE stock
         SET available_quantity = available_quantity + ?
         WHERE fruit_id = ? AND packaging_size = ?`,
        [item.quantity, item.fruit_id, item.packaging_size]
      );
    }
    await saleModel.removeDetails(connection, id);

    let totalAmount = 0;

    for (const item of items) {
      const [fruitRows] = await connection.execute(
        `SELECT f.fruit_id, f.fruit_name, f.status, fp.selling_price
         FROM fruits f
         LEFT JOIN fruit_prices fp
           ON fp.fruit_id = f.fruit_id AND fp.packaging_size = ?
         WHERE f.fruit_id = ?`,
        [item.packagingSize, item.fruitId]
      );

      const fruit = fruitRows[0];
      if (!fruit) {
        throw ApiError.badRequest(`Fruit ID ${item.fruitId} does not exist.`);
      }
      if (fruit.status !== 'AVAILABLE') {
        throw ApiError.badRequest(`Fruit "${fruit.fruit_name}" is unavailable and cannot be sold.`);
      }
      if (fruit.selling_price === null || fruit.selling_price === undefined) {
        throw ApiError.badRequest(
          `No ${item.packagingSize.toLowerCase()} selling price is configured for "${fruit.fruit_name}".`
        );
      }

      const [stockRows] = await connection.execute(
        `SELECT available_quantity FROM stock
         WHERE fruit_id = ? AND packaging_size = ?
         FOR UPDATE`,
        [item.fruitId, item.packagingSize]
      );

      const available = stockRows[0] ? Number(stockRows[0].available_quantity) : 0;
      if (available < item.quantity) {
        throw ApiError.badRequest(
          `Insufficient stock for ${fruit.fruit_name} (${item.packagingSize}): ` +
          `requested ${item.quantity} box(es), available ${available}. The entire sale was rejected.`
        );
      }

      item.unitPrice = Number(fruit.selling_price);
      item.fruitName = fruit.fruit_name;
      item.lineTotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
      totalAmount += item.lineTotal;
    }

    totalAmount = Math.round(totalAmount * 100) / 100;
    const amountPaid = Number(existing.amount_paid);

    if (amountPaid > totalAmount) {
      throw ApiError.conflict(
        `Sale total cannot be lower than the ${amountPaid.toFixed(2)} already paid. ` +
        'Delete or reduce payments first.'
      );
    }

    let paymentStatus = 'UNPAID';
    if (amountPaid >= totalAmount) {
      paymentStatus = 'PAID';
    } else if (amountPaid > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    for (const item of items) {
      await saleModel.addDetail(connection, id, item);

      const [updateResult] = await connection.execute(
        `UPDATE stock
         SET available_quantity = available_quantity - ?
         WHERE fruit_id = ? AND packaging_size = ? AND available_quantity >= ?`,
        [item.quantity, item.fruitId, item.packagingSize, item.quantity]
      );

      if (updateResult.affectedRows !== 1) {
        throw ApiError.conflict(
          `Stock for ${item.fruitName} (${item.packagingSize}) changed before the sale completed. Please retry.`
        );
      }
    }

    await saleModel.updateHeader(connection, id, {
      vendorId,
      saleDate,
      paymentStatus,
      paymentMethod: method,
      totalAmount,
      amountPaid
    });

    await connection.commit();

    const sale = await saleModel.findById(id);
    res.status(200).json({
      success: true,
      message: 'Sale updated and stock adjusted successfully.',
      data: sale
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

async function deleteSale(req, res, next) {
  let connection;
  try {
    const id = positiveId(req.params.id, 'Sale ID');

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const existing = await saleModel.findByIdForUpdate(connection, id);
    if (!existing) throw ApiError.notFound('Sale not found.');

    const oldItems = await saleModel.findDetailsForUpdate(connection, id);
    for (const item of oldItems) {
      await connection.execute(
        `UPDATE stock
         SET available_quantity = available_quantity + ?
         WHERE fruit_id = ? AND packaging_size = ?`,
        [item.quantity, item.fruit_id, item.packaging_size]
      );
    }

    await saleModel.remove(connection, id);
    await connection.commit();

    res.status(200).json({
      success: true,
      message: 'Sale deleted, stock restored and linked payments removed.'
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
  listSales,
  getSale,
  createSale,
  updateSale,
  deleteSale
};

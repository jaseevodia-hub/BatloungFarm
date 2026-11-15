const { pool } = require('../config/db');
const purchaseModel = require('../models/purchaseModel');
const ApiError = require('../utils/ApiError');
const {
  positiveId,
  dateOnly,
  positiveInteger,
  nonNegativeNumber,
  packagingSize,
  ensureNonEmptyArray
} = require('../utils/validation');

async function listPurchases(req, res, next) {
  try {
    const purchases = await purchaseModel.findAll({
      search: req.query.q ? String(req.query.q).trim() : null,
      supplierId: req.query.supplier_id
        ? positiveId(req.query.supplier_id, 'Supplier ID')
        : undefined,
      startDate: req.query.start_date
        ? dateOnly(req.query.start_date, 'Start date', { required: false })
        : undefined,
      endDate: req.query.end_date
        ? dateOnly(req.query.end_date, 'End date', { required: false })
        : undefined
    });
    res.status(200).json({ success: true, count: purchases.length, data: purchases });
  } catch (error) {
    next(error);
  }
}

async function getPurchase(req, res, next) {
  try {
    const id = positiveId(req.params.id, 'Purchase ID');
    const purchase = await purchaseModel.findById(id);
    if (!purchase) throw ApiError.notFound('Purchase not found.');
    res.status(200).json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
}

async function createPurchase(req, res, next) {
  let connection;
  try {
    const supplierId = positiveId(req.body.supplier_id, 'Supplier ID');
    const purchaseDate = req.body.purchase_date
      ? dateOnly(req.body.purchase_date, 'Purchase date')
      : new Date();

    const rawItems = ensureNonEmptyArray(req.body.items, 'Items');
    const items = rawItems.map((item, index) => ({
      fruitId: positiveId(item.fruit_id, `Item ${index + 1} fruit ID`),
      quantity: positiveInteger(item.quantity, `Item ${index + 1} quantity`),
      unitCost: nonNegativeNumber(item.unit_cost, `Item ${index + 1} unit cost`),
      packagingSize: packagingSize(item.packaging_size, `Item ${index + 1} packaging size`)
    }));

    const totalAmount = Math.round(
      items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0) * 100
    ) / 100;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [suppliers] = await connection.execute(
      'SELECT supplier_id FROM suppliers WHERE supplier_id = ?',
      [supplierId]
    );
    if (!suppliers[0]) throw ApiError.notFound('Supplier not found.');

    for (const item of items) {
      const [fruits] = await connection.execute(
        'SELECT fruit_id, fruit_name, status FROM fruits WHERE fruit_id = ?',
        [item.fruitId]
      );
      if (!fruits[0]) throw ApiError.badRequest(`Fruit ID ${item.fruitId} does not exist.`);
      if (fruits[0].status !== 'ACTIVE') {
        throw ApiError.badRequest(`Fruit "${fruits[0].fruit_name}" is inactive and cannot be purchased.`);
      }
    }

    const purchaseId = await purchaseModel.create(connection, {
      supplierId,
      purchaseDate,
      totalAmount
    });

    for (const item of items) {
      await purchaseModel.addDetail(connection, purchaseId, item);
      await connection.execute(
        `INSERT INTO stock (fruit_id, packaging_size, available_quantity)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           available_quantity = available_quantity + VALUES(available_quantity)`,
        [item.fruitId, item.packagingSize, item.quantity]
      );
    }

    await connection.commit();

    const purchase = await purchaseModel.findById(purchaseId);
    res.status(201).json({
      success: true,
      message: 'Purchase recorded and stock increased successfully.',
      data: purchase
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

module.exports = { listPurchases, getPurchase, createPurchase };

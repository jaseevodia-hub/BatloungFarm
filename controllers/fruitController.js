const { pool } = require('../config/db');
const fruitModel = require('../models/fruitModel');
const ApiError = require('../utils/ApiError');
const {
  requiredString,
  optionalString,
  fruitStatus,
  positiveId,
  packagingSize,
  pricesObject
} = require('../utils/validation');

function getThreshold(value) {
  if (value === undefined || value === null || value === '') {
    return Number(process.env.LOW_STOCK_THRESHOLD) || 10;
  }
  const threshold = Number(value);
  if (!Number.isInteger(threshold) || threshold < 0) {
    throw ApiError.badRequest('Low stock threshold must be a whole number of zero or more.');
  }
  return threshold;
}

async function listFruits(req, res, next) {
  try {
    const status = req.query.status
      ? fruitStatus(String(req.query.status).toUpperCase())
      : undefined;
    const fruits = await fruitModel.findAll({
      search: req.query.q ? String(req.query.q).trim() : null,
      status
    });
    res.status(200).json({ success: true, count: fruits.length, data: fruits });
  } catch (error) {
    next(error);
  }
}

async function getFruit(req, res, next) {
  try {
    const id = positiveId(req.params.id, 'Fruit ID');
    const fruit = await fruitModel.findById(id);
    if (!fruit) throw ApiError.notFound('Fruit not found.');
    res.status(200).json({ success: true, data: fruit });
  } catch (error) {
    next(error);
  }
}

async function createFruit(req, res, next) {
  let connection;
  try {
    const data = {
      fruitName: requiredString(req.body.fruit_name, 'Fruit name', 80),
      description: optionalString(req.body.description, 'Description', 255),
      status: req.body.status ? fruitStatus(req.body.status) : 'ACTIVE'
    };
    const prices = pricesObject(req.body.prices, { required: true });

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const fruitId = await fruitModel.create(connection, data);
    await fruitModel.createStockRows(connection, fruitId);
    await fruitModel.upsertPrices(connection, fruitId, prices);

    await connection.commit();

    const fruit = await fruitModel.findById(fruitId);
    res.status(201).json({
      success: true,
      message: 'Fruit registered successfully with separate packaging stock.',
      data: fruit
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

async function updateFruit(req, res, next) {
  let connection;
  try {
    const id = positiveId(req.params.id, 'Fruit ID');
    const existing = await fruitModel.findById(id);
    if (!existing) throw ApiError.notFound('Fruit not found.');

    const fields = {};
    if (req.body.fruit_name !== undefined) {
      fields.fruitName = requiredString(req.body.fruit_name, 'Fruit name', 80);
    }
    if (req.body.description !== undefined) {
      fields.description = optionalString(req.body.description, 'Description', 255);
    }
    if (req.body.status !== undefined) {
      fields.status = fruitStatus(req.body.status);
    }

    const hasPrices = req.body.prices !== undefined;
    const prices = hasPrices ? pricesObject(req.body.prices) : null;

    if (!Object.keys(fields).length && !hasPrices) {
      throw ApiError.badRequest('Provide fruit details or prices to update.');
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (Object.keys(fields).length) {
      await fruitModel.update(id, fields, connection);
    }
    if (prices) {
      await fruitModel.upsertPrices(connection, id, prices);
    }

    await connection.commit();

    const fruit = await fruitModel.findById(id);
    res.status(200).json({
      success: true,
      message: 'Fruit information updated successfully.',
      data: fruit
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

async function deleteFruit(req, res, next) {
  try {
    const id = positiveId(req.params.id, 'Fruit ID');
    const existing = await fruitModel.findById(id);
    if (!existing) throw ApiError.notFound('Fruit not found.');

    const references = await fruitModel.countReferences(id);
    if (references > 0) {
      throw ApiError.conflict(
        'Fruit is used in purchase or sales records and cannot be deleted. Set its status to INACTIVE instead.'
      );
    }

    await fruitModel.remove(id);
    res.status(200).json({ success: true, message: 'Fruit deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

async function getFruitStock(req, res, next) {
  try {
    const id = positiveId(req.params.id, 'Fruit ID');
    const fruit = await fruitModel.findById(id);
    if (!fruit) throw ApiError.notFound('Fruit not found.');

    const stock = await fruitModel.getStock(id);
    const threshold = getThreshold();
    res.status(200).json({
      success: true,
      data: {
        fruit,
        threshold,
        stock: stock.map((row) => ({
          ...row,
          low_stock: Number(row.available_quantity) <= threshold
        }))
      }
    });
  } catch (error) {
    next(error);
  }
}

async function listStock(req, res, next) {
  try {
    const stock = await fruitModel.getAllStock({
      search: req.query.q ? String(req.query.q).trim() : null,
      packagingSize: req.query.packaging_size
        ? packagingSize(String(req.query.packaging_size).toUpperCase())
        : undefined
    });
    res.status(200).json({ success: true, count: stock.length, data: stock });
  } catch (error) {
    next(error);
  }
}

async function listLowStock(req, res, next) {
  try {
    const threshold = getThreshold(req.query.threshold);
    const stock = await fruitModel.getLowStock(threshold);
    res.status(200).json({
      success: true,
      threshold,
      count: stock.length,
      data: stock
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listFruits,
  getFruit,
  createFruit,
  updateFruit,
  deleteFruit,
  getFruitStock,
  listStock,
  listLowStock
};

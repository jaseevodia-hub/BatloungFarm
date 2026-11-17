const { pool } = require('../config/db');

const DETAIL_COLUMNS = `
  f.fruit_id,
  f.fruit_name,
  f.description,
  f.status,
  f.created_at,
  (SELECT fp.selling_price FROM fruit_prices fp
    WHERE fp.fruit_id = f.fruit_id AND fp.packaging_size = 'SMALL') AS small_price,
  (SELECT fp.selling_price FROM fruit_prices fp
    WHERE fp.fruit_id = f.fruit_id AND fp.packaging_size = 'MEDIUM') AS medium_price,
  (SELECT fp.selling_price FROM fruit_prices fp
    WHERE fp.fruit_id = f.fruit_id AND fp.packaging_size = 'LARGE') AS large_price,
  (SELECT st.available_quantity FROM stock st
    WHERE st.fruit_id = f.fruit_id AND st.packaging_size = 'SMALL') AS small_stock,
  (SELECT st.available_quantity FROM stock st
    WHERE st.fruit_id = f.fruit_id AND st.packaging_size = 'MEDIUM') AS medium_stock,
  (SELECT st.available_quantity FROM stock st
    WHERE st.fruit_id = f.fruit_id AND st.packaging_size = 'LARGE') AS large_stock
`;

async function findAll({ search, status } = {}) {
  let sql = `SELECT ${DETAIL_COLUMNS} FROM fruits f`;
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(f.fruit_name LIKE ? OR f.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    conditions.push('f.status = ?');
    params.push(status);
  }
  if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
  sql += ' ORDER BY f.fruit_name ASC';

  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT ${DETAIL_COLUMNS} FROM fruits f WHERE f.fruit_id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function findRawById(id) {
  const [rows] = await pool.execute(
    'SELECT fruit_id, fruit_name, description, status FROM fruits WHERE fruit_id = ?',
    [id]
  );
  return rows[0] || null;
}

async function create(db, data) {
  const [result] = await db.execute(
    'INSERT INTO fruits (fruit_name, description, status) VALUES (?, ?, ?)',
    [data.fruitName, data.description, data.status]
  );
  return result.insertId;
}

async function update(id, fields, db = pool) {
  const columns = [];
  const params = [];
  const mapping = { fruitName: 'fruit_name', description: 'description', status: 'status' };

  for (const [key, column] of Object.entries(mapping)) {
    if (fields[key] !== undefined) {
      columns.push(`${column} = ?`);
      params.push(fields[key]);
    }
  }

  if (columns.length) {
    params.push(id);
    await db.execute(`UPDATE fruits SET ${columns.join(', ')} WHERE fruit_id = ?`, params);
  }

  return findById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM fruits WHERE fruit_id = ?', [id]);
  return result.affectedRows > 0;
}

async function countReferences(id) {
  const [rows] = await pool.execute(
    `SELECT
       (SELECT COUNT(*) FROM purchase_details WHERE fruit_id = ?) +
       (SELECT COUNT(*) FROM sales_details WHERE fruit_id = ?) AS count`,
    [id, id]
  );
  return rows[0].count;
}

async function createStockRows(db, fruitId) {
  await db.execute(
    `INSERT INTO stock (fruit_id, packaging_size, available_quantity) VALUES
       (?, 'SMALL', 0), (?, 'MEDIUM', 0), (?, 'LARGE', 0)`,
    [fruitId, fruitId, fruitId]
  );
}

async function upsertPrices(db, fruitId, prices) {
  for (const [size, price] of Object.entries(prices)) {
    await db.execute(
      `INSERT INTO fruit_prices (fruit_id, packaging_size, selling_price)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE selling_price = VALUES(selling_price)`,
      [fruitId, size, price]
    );
  }
}

async function getStock(fruitId) {
  const [rows] = await pool.execute(
    `SELECT s.packaging_size, s.available_quantity, fp.selling_price
     FROM stock s
     LEFT JOIN fruit_prices fp
       ON fp.fruit_id = s.fruit_id AND fp.packaging_size = s.packaging_size
     WHERE s.fruit_id = ?
     ORDER BY FIELD(s.packaging_size, 'SMALL', 'MEDIUM', 'LARGE')`,
    [fruitId]
  );
  return rows;
}

async function getAllStock({ search, packagingSize } = {}) {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('f.fruit_name LIKE ?');
    params.push(`%${search}%`);
  }
  if (packagingSize) {
    conditions.push('s.packaging_size = ?');
    params.push(packagingSize);
  }

  let sql = `SELECT f.fruit_id, f.fruit_name, s.packaging_size, s.available_quantity,
                    fp.selling_price, s.updated_at
             FROM stock s
             JOIN fruits f ON f.fruit_id = s.fruit_id
             LEFT JOIN fruit_prices fp
               ON fp.fruit_id = s.fruit_id AND fp.packaging_size = s.packaging_size`;
  if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
  sql += ` ORDER BY f.fruit_name ASC, FIELD(s.packaging_size, 'SMALL', 'MEDIUM', 'LARGE')`;

  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function getLowStock(threshold) {
  const [rows] = await pool.execute(
    `SELECT f.fruit_id, f.fruit_name, s.packaging_size, s.available_quantity,
            fp.selling_price
     FROM stock s
     JOIN fruits f ON f.fruit_id = s.fruit_id
     LEFT JOIN fruit_prices fp
       ON fp.fruit_id = s.fruit_id AND fp.packaging_size = s.packaging_size
     WHERE f.status = 'AVAILABLE' AND s.available_quantity <= ?
     ORDER BY s.available_quantity ASC, f.fruit_name ASC`,
    [threshold]
  );
  return rows;
}

module.exports = {
  findAll,
  findById,
  findRawById,
  create,
  update,
  remove,
  countReferences,
  createStockRows,
  upsertPrices,
  getStock,
  getAllStock,
  getLowStock
};

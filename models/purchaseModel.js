const { pool } = require('../config/db');

async function findAll({ search, supplierId, startDate, endDate } = {}) {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(s.business_name LIKE ? OR CAST(p.purchase_id AS CHAR) LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (supplierId) {
    conditions.push('p.supplier_id = ?');
    params.push(supplierId);
  }
  if (startDate) {
    conditions.push('p.purchase_date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    conditions.push('p.purchase_date < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(endDate);
  }

  let sql = `SELECT p.purchase_id, p.supplier_id, p.purchase_date, p.total_amount,
                    s.business_name, s.province, s.contact_person,
                    COUNT(pd.purchase_detail_id) AS item_lines,
                    COALESCE(SUM(pd.quantity), 0) AS total_boxes
             FROM purchases p
             JOIN suppliers s ON s.supplier_id = p.supplier_id
             LEFT JOIN purchase_details pd ON pd.purchase_id = p.purchase_id`;
  if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
  sql += ` GROUP BY p.purchase_id, p.supplier_id, p.purchase_date, p.total_amount,
                    s.business_name, s.province, s.contact_person
           ORDER BY p.purchase_date DESC, p.purchase_id DESC`;

  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function findById(id) {
  const [purchaseRows] = await pool.execute(
    `SELECT p.purchase_id, p.supplier_id, p.purchase_date, p.total_amount, p.created_at,
            s.business_name, s.contact_person, s.phone, s.province, s.address
     FROM purchases p
     JOIN suppliers s ON s.supplier_id = p.supplier_id
     WHERE p.purchase_id = ?`,
    [id]
  );

  if (!purchaseRows[0]) return null;

  const [details] = await pool.execute(
    `SELECT pd.purchase_detail_id, pd.fruit_id, f.fruit_name, pd.quantity,
            pd.unit_cost, pd.packaging_size,
            (pd.quantity * pd.unit_cost) AS line_total
     FROM purchase_details pd
     JOIN fruits f ON f.fruit_id = pd.fruit_id
     WHERE pd.purchase_id = ?
     ORDER BY pd.purchase_detail_id ASC`,
    [id]
  );

  return { ...purchaseRows[0], items: details };
}

async function findByIdForUpdate(connection, id) {
  const [rows] = await connection.execute(
    `SELECT purchase_id, supplier_id, purchase_date, total_amount
     FROM purchases WHERE purchase_id = ? FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
}

async function findDetailsForUpdate(connection, id) {
  const [rows] = await connection.execute(
    `SELECT purchase_detail_id, fruit_id, quantity, unit_cost, packaging_size
     FROM purchase_details WHERE purchase_id = ? ORDER BY purchase_detail_id ASC`,
    [id]
  );
  return rows;
}

async function updateHeader(connection, id, { supplierId, purchaseDate, totalAmount }) {
  await connection.execute(
    `UPDATE purchases SET supplier_id = ?, purchase_date = ?, total_amount = ? WHERE purchase_id = ?`,
    [supplierId, purchaseDate, totalAmount, id]
  );
}

async function removeDetails(connection, id) {
  await connection.execute('DELETE FROM purchase_details WHERE purchase_id = ?', [id]);
}

async function remove(connection, id) {
  const [result] = await connection.execute('DELETE FROM purchases WHERE purchase_id = ?', [id]);
  return result.affectedRows > 0;
}

async function create(connection, { supplierId, purchaseDate, totalAmount }) {
  const [result] = await connection.execute(
    `INSERT INTO purchases (supplier_id, purchase_date, total_amount) VALUES (?, ?, ?)`,
    [supplierId, purchaseDate, totalAmount]
  );
  return result.insertId;
}

async function addDetail(connection, purchaseId, item) {
  await connection.execute(
    `INSERT INTO purchase_details
       (purchase_id, fruit_id, quantity, unit_cost, packaging_size)
     VALUES (?, ?, ?, ?, ?)`,
    [purchaseId, item.fruitId, item.quantity, item.unitCost, item.packagingSize]
  );
}

module.exports = {
  findAll,
  findById,
  findByIdForUpdate,
  findDetailsForUpdate,
  updateHeader,
  removeDetails,
  remove,
  create,
  addDetail
};

const { pool } = require('../config/db');

async function findAll({ search, vendorId, paymentStatus, startDate, endDate } = {}) {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(v.vendor_name LIKE ? OR v.phone_number LIKE ? OR CAST(s.sale_id AS CHAR) LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (vendorId) {
    conditions.push('s.vendor_id = ?');
    params.push(vendorId);
  }
  if (paymentStatus) {
    conditions.push('s.payment_status = ?');
    params.push(paymentStatus);
  }
  if (startDate) {
    conditions.push('s.sale_date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    conditions.push('s.sale_date < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(endDate);
  }

  let sql = `SELECT s.sale_id, s.vendor_id, s.sale_date, s.payment_status, s.payment_method,
                    s.total_amount, s.amount_paid,
                    (s.total_amount - s.amount_paid) AS balance,
                    v.vendor_name, v.phone_number,
                    COUNT(sd.sales_detail_id) AS item_lines,
                    COALESCE(SUM(sd.quantity), 0) AS total_boxes
             FROM sales s
             JOIN vendors v ON v.vendor_id = s.vendor_id
             LEFT JOIN sales_details sd ON sd.sale_id = s.sale_id`;
  if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
  sql += ` GROUP BY s.sale_id, s.vendor_id, s.sale_date, s.payment_status, s.payment_method,
                    s.total_amount, s.amount_paid, v.vendor_name, v.phone_number
           ORDER BY s.sale_date DESC, s.sale_id DESC`;

  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function findById(id) {
  const [saleRows] = await pool.execute(
    `SELECT s.sale_id, s.vendor_id, s.sale_date, s.payment_status, s.payment_method,
            s.total_amount, s.amount_paid, (s.total_amount - s.amount_paid) AS balance,
            s.created_at, v.vendor_name, v.phone_number, v.location
     FROM sales s
     JOIN vendors v ON v.vendor_id = s.vendor_id
     WHERE s.sale_id = ?`,
    [id]
  );

  if (!saleRows[0]) return null;

  const [items] = await pool.execute(
    `SELECT sd.sales_detail_id, sd.fruit_id, f.fruit_name, sd.packaging_size,
            sd.quantity, sd.unit_price, (sd.quantity * sd.unit_price) AS line_total
     FROM sales_details sd
     JOIN fruits f ON f.fruit_id = sd.fruit_id
     WHERE sd.sale_id = ?
     ORDER BY sd.sales_detail_id ASC`,
    [id]
  );

  const [payments] = await pool.execute(
    `SELECT payment_id, amount, payment_method, payment_date, reference
     FROM payments WHERE sale_id = ?
     ORDER BY payment_date ASC, payment_id ASC`,
    [id]
  );

  return { ...saleRows[0], items, payments };
}

async function findByIdForUpdate(connection, id) {
  const [rows] = await connection.execute(
    `SELECT sale_id, vendor_id, total_amount, amount_paid, payment_status, payment_method
     FROM sales WHERE sale_id = ? FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
}

async function findDetailsForUpdate(connection, id) {
  const [rows] = await connection.execute(
    `SELECT sales_detail_id, fruit_id, packaging_size, quantity, unit_price
     FROM sales_details WHERE sale_id = ? ORDER BY sales_detail_id ASC`,
    [id]
  );
  return rows;
}

async function updateHeader(connection, id, data) {
  await connection.execute(
    `UPDATE sales
     SET vendor_id = ?, sale_date = ?, payment_status = ?, payment_method = ?,
         total_amount = ?, amount_paid = ?
     WHERE sale_id = ?`,
    [
      data.vendorId,
      data.saleDate,
      data.paymentStatus,
      data.paymentMethod,
      data.totalAmount,
      data.amountPaid,
      id
    ]
  );
}

async function removeDetails(connection, id) {
  await connection.execute('DELETE FROM sales_details WHERE sale_id = ?', [id]);
}

async function remove(connection, id) {
  const [result] = await connection.execute('DELETE FROM sales WHERE sale_id = ?', [id]);
  return result.affectedRows > 0;
}

async function create(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO sales
       (vendor_id, sale_date, payment_status, payment_method, total_amount, amount_paid)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.vendorId,
      data.saleDate,
      data.paymentStatus,
      data.paymentMethod,
      data.totalAmount,
      data.amountPaid
    ]
  );
  return result.insertId;
}

async function addDetail(connection, saleId, item) {
  await connection.execute(
    `INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price)
     VALUES (?, ?, ?, ?, ?)`,
    [saleId, item.fruitId, item.packagingSize, item.quantity, item.unitPrice]
  );
}

async function updatePayment(connection, saleId, amountPaid, paymentStatus) {
  await connection.execute(
    `UPDATE sales SET amount_paid = ?, payment_status = ? WHERE sale_id = ?`,
    [amountPaid, paymentStatus, saleId]
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
  addDetail,
  updatePayment
};

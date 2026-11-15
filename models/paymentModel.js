const { pool } = require('../config/db');

async function history({ search } = {}) {
  let sql = `SELECT pay.payment_id, pay.sale_id, pay.amount, pay.payment_method,
                    pay.payment_date, pay.reference,
                    v.vendor_name, v.phone_number
             FROM payments pay
             JOIN sales s ON s.sale_id = pay.sale_id
             JOIN vendors v ON v.vendor_id = s.vendor_id`;
  const params = [];

  if (search) {
    sql += ` WHERE v.vendor_name LIKE ? OR pay.reference LIKE ? OR CAST(pay.sale_id AS CHAR) LIKE ?`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY pay.payment_date DESC, pay.payment_id DESC';
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function outstandingSales() {
  const [rows] = await pool.execute(
    `SELECT s.sale_id, s.vendor_id, s.sale_date, s.payment_status, s.payment_method,
            s.total_amount, s.amount_paid,
            (s.total_amount - s.amount_paid) AS balance,
            v.vendor_name, v.phone_number
     FROM sales s
     JOIN vendors v ON v.vendor_id = s.vendor_id
     WHERE s.total_amount > s.amount_paid
     ORDER BY s.sale_date ASC, s.sale_id ASC`
  );
  return rows;
}

async function outstandingByVendor() {
  const [rows] = await pool.execute(
    `SELECT v.vendor_id, v.vendor_name, v.phone_number, v.location,
            COUNT(s.sale_id) AS unpaid_sales,
            SUM(s.total_amount - s.amount_paid) AS outstanding_balance
     FROM vendors v
     JOIN sales s ON s.vendor_id = v.vendor_id
     WHERE s.total_amount > s.amount_paid
     GROUP BY v.vendor_id, v.vendor_name, v.phone_number, v.location
     ORDER BY outstanding_balance DESC`
  );
  return rows;
}

async function create(connection, { saleId, amount, paymentMethod, reference }) {
  const [result] = await connection.execute(
    `INSERT INTO payments (sale_id, amount, payment_method, reference)
     VALUES (?, ?, ?, ?)`,
    [saleId, amount, paymentMethod, reference || null]
  );
  return result.insertId;
}

async function summary() {
  const [rows] = await pool.execute(
    `SELECT
       COALESCE(SUM(amount), 0) AS total_collected,
       COALESCE(SUM(CASE WHEN payment_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
                    THEN amount ELSE 0 END), 0) AS collected_this_month,
       COUNT(*) AS payment_count
     FROM payments`
  );
  const [outstandingRows] = await pool.execute(
    `SELECT COALESCE(SUM(total_amount - amount_paid), 0) AS total_outstanding,
            COUNT(*) AS outstanding_sales
     FROM sales WHERE total_amount > amount_paid`
  );
  return { ...rows[0], ...outstandingRows[0] };
}

module.exports = {
  history,
  outstandingSales,
  outstandingByVendor,
  create,
  summary
};

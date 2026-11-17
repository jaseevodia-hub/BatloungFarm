const { pool } = require('../config/db');

async function topFruits(limit = 5) {
  const safeLimit = Number.isInteger(Number(limit)) ? Math.min(Math.max(Number(limit), 1), 50) : 5;
  const [rows] = await pool.query(
    `SELECT f.fruit_id, f.fruit_name,
            COALESCE(SUM(sd.quantity), 0) AS total_boxes,
            COALESCE(SUM(sd.quantity * sd.unit_price), 0) AS revenue,
            COUNT(DISTINCT sd.sale_id) AS order_count
     FROM sales_details sd
     JOIN fruits f ON f.fruit_id = sd.fruit_id
     GROUP BY f.fruit_id, f.fruit_name
     ORDER BY total_boxes DESC, revenue DESC
     LIMIT ${safeLimit}`
  );
  return rows;
}

async function revenue({ startDate, endDate } = {}) {
  const conditions = [];
  const params = [];

  if (startDate) {
    conditions.push('sale_date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    conditions.push('sale_date < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(endDate);
  }

  let sql = `SELECT COUNT(*) AS sale_count,
                    COALESCE(SUM(total_amount), 0) AS total_revenue,
                    COALESCE(SUM(amount_paid), 0) AS amount_collected,
                    COALESCE(SUM(total_amount - amount_paid), 0) AS outstanding,
                    COALESCE(AVG(total_amount), 0) AS average_sale
             FROM sales`;
  if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;

  const [rows] = await pool.execute(sql, params);
  return rows[0];
}

async function topVendors(limit = 5) {
  const safeLimit = Number.isInteger(Number(limit)) ? Math.min(Math.max(Number(limit), 1), 50) : 5;
  const [rows] = await pool.query(
    `SELECT v.vendor_id, v.vendor_name, v.phone_number, v.location,
            COUNT(DISTINCT s.sale_id) AS order_count,
            COALESCE(SUM(sd.quantity), 0) AS total_boxes,
            COALESCE(SUM(sd.quantity * sd.unit_price), 0) AS revenue
     FROM vendors v
     JOIN sales s ON s.vendor_id = v.vendor_id
     JOIN sales_details sd ON sd.sale_id = s.sale_id
     GROUP BY v.vendor_id, v.vendor_name, v.phone_number, v.location
     ORDER BY total_boxes DESC, revenue DESC
     LIMIT ${safeLimit}`
  );
  return rows;
}

async function currentStock({ packagingSize } = {}) {
  let sql = `SELECT f.fruit_id, f.fruit_name, s.packaging_size, s.available_quantity,
                    fp.selling_price,
                    ROUND(s.available_quantity * COALESCE(fp.selling_price, 0), 2) AS stock_value
             FROM fruits f
             JOIN stock s ON s.fruit_id = f.fruit_id
             LEFT JOIN fruit_prices fp
               ON fp.fruit_id = s.fruit_id AND fp.packaging_size = s.packaging_size`;
  const params = [];

  if (packagingSize) {
    sql += ' WHERE s.packaging_size = ?';
    params.push(packagingSize);
  }

  sql += ` ORDER BY f.fruit_name ASC, FIELD(s.packaging_size, 'SMALL', 'MEDIUM', 'LARGE')`;
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function dashboard(threshold) {
  const [
    [counts],
    [stockTotals],
    [lowStockCount],
    [revenueTotals],
    [lowStock],
    [recentSales]
  ] = await Promise.all([
    pool.query(
      `SELECT
         (SELECT COUNT(*) FROM suppliers) AS suppliers,
         (SELECT COUNT(*) FROM fruits) AS fruits,
         (SELECT COUNT(*) FROM vendors) AS vendors,
         (SELECT COUNT(*) FROM purchases) AS purchases,
         (SELECT COUNT(*) FROM sales) AS sales`
    ),
    pool.query('SELECT COALESCE(SUM(available_quantity), 0) AS total_boxes FROM stock'),
    pool.query(
      `SELECT COUNT(*) AS low_stock_count
       FROM stock s JOIN fruits f ON f.fruit_id = s.fruit_id
       WHERE f.status = 'AVAILABLE' AND s.available_quantity <= ?`,
      [threshold]
    ),
    pool.query(
      `SELECT
         COALESCE(SUM(total_amount), 0) AS total_revenue,
         COALESCE(SUM(amount_paid), 0) AS total_collected,
         COALESCE(SUM(total_amount - amount_paid), 0) AS total_outstanding,
         COALESCE(SUM(CASE WHEN sale_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
                      THEN total_amount ELSE 0 END), 0) AS month_revenue,
         COALESCE(SUM(CASE WHEN DATE(sale_date) = CURDATE()
                      THEN total_amount ELSE 0 END), 0) AS today_revenue
       FROM sales`
    ),
    pool.query(
      `SELECT f.fruit_id, f.fruit_name, s.packaging_size, s.available_quantity,
              fp.selling_price
       FROM stock s
       JOIN fruits f ON f.fruit_id = s.fruit_id
       LEFT JOIN fruit_prices fp
         ON fp.fruit_id = s.fruit_id AND fp.packaging_size = s.packaging_size
       WHERE f.status = 'AVAILABLE' AND s.available_quantity <= ?
       ORDER BY s.available_quantity ASC, f.fruit_name ASC
       LIMIT 8`,
      [threshold]
    ),
    pool.query(
      `SELECT s.sale_id, s.sale_date, s.total_amount, s.amount_paid,
              s.payment_status, v.vendor_name,
              (s.total_amount - s.amount_paid) AS balance,
              (SELECT COALESCE(SUM(sd.quantity), 0) FROM sales_details sd
               WHERE sd.sale_id = s.sale_id) AS total_boxes
       FROM sales s
       JOIN vendors v ON v.vendor_id = s.vendor_id
       ORDER BY s.sale_date DESC, s.sale_id DESC
       LIMIT 6`
    )
  ]);

  return {
    ...counts[0],
    ...stockTotals[0],
    ...lowStockCount[0],
    ...revenueTotals[0],
    lowStock,
    recentSales
  };
}

module.exports = { topFruits, revenue, topVendors, currentStock, dashboard };

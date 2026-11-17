const { pool } = require('../config/db');

const VENDOR_SELECT = `
  SELECT v.vendor_id, v.vendor_name, v.phone_number, v.location, v.latitude, v.longitude,
         v.registration_date, v.created_at,
         COALESCE((SELECT SUM(s.amount_paid)
                   FROM sales s WHERE s.vendor_id = v.vendor_id), 0) AS settled_amount,
         COALESCE((SELECT SUM(s.total_amount - s.amount_paid)
                   FROM sales s WHERE s.vendor_id = v.vendor_id), 0) AS outstanding_balance,
         (SELECT COUNT(*) FROM sales s WHERE s.vendor_id = v.vendor_id) AS sales_count
  FROM vendors v
`;

async function findAll(search) {
  const conditions = [];
  const params = [];

  if (search) {
    const phoneTerm = `%${search.replace(/\s+/g, '')}%`;
    conditions.push(
      "(v.vendor_name LIKE ? OR REPLACE(v.phone_number, ' ', '') LIKE ? OR v.location LIKE ?)"
    );
    params.push(`%${search}%`, phoneTerm, `%${search}%`);
  }

  let sql = VENDOR_SELECT;
  if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
  sql += ' ORDER BY v.vendor_name ASC';

  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute(`${VENDOR_SELECT} WHERE v.vendor_id = ?`, [id]);
  return rows[0] || null;
}

async function create(data) {
  const [result] = await pool.execute(
    `INSERT INTO vendors (vendor_name, phone_number, location, latitude, longitude, registration_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.vendorName,
      data.phoneNumber,
      data.location,
      data.latitude ?? null,
      data.longitude ?? null,
      data.registrationDate
    ]
  );
  return findById(result.insertId);
}

async function update(id, fields) {
  const columns = [];
  const params = [];
  const mapping = {
    vendorName: 'vendor_name',
    phoneNumber: 'phone_number',
    location: 'location',
    latitude: 'latitude',
    longitude: 'longitude',
    registrationDate: 'registration_date'
  };

  for (const [key, column] of Object.entries(mapping)) {
    if (fields[key] !== undefined) {
      columns.push(`${column} = ?`);
      params.push(fields[key]);
    }
  }

  if (columns.length) {
    params.push(id);
    await pool.execute(`UPDATE vendors SET ${columns.join(', ')} WHERE vendor_id = ?`, params);
  }

  return findById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM vendors WHERE vendor_id = ?', [id]);
  return result.affectedRows > 0;
}

async function countSales(id) {
  const [rows] = await pool.execute('SELECT COUNT(*) AS count FROM sales WHERE vendor_id = ?', [id]);
  return rows[0].count;
}

module.exports = { findAll, findById, create, update, remove, countSales };

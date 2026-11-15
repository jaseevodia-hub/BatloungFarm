const { pool } = require('../config/db');

async function findAll(search) {
  let sql = `SELECT supplier_id, business_name, contact_person, phone, province, address, created_at
             FROM suppliers`;
  const params = [];

  if (search) {
    sql += ` WHERE business_name LIKE ? OR contact_person LIKE ? OR phone LIKE ? OR province LIKE ?`;
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  sql += ` ORDER BY business_name ASC`;
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT supplier_id, business_name, contact_person, phone, province, address, created_at
     FROM suppliers WHERE supplier_id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function create(data) {
  const [result] = await pool.execute(
    `INSERT INTO suppliers (business_name, contact_person, phone, province, address)
     VALUES (?, ?, ?, ?, ?)`,
    [data.businessName, data.contactPerson, data.phone, data.province, data.address]
  );
  return findById(result.insertId);
}

async function update(id, fields) {
  const columns = [];
  const params = [];

  const mapping = {
    businessName: 'business_name',
    contactPerson: 'contact_person',
    phone: 'phone',
    province: 'province',
    address: 'address'
  };

  for (const [key, column] of Object.entries(mapping)) {
    if (fields[key] !== undefined) {
      columns.push(`${column} = ?`);
      params.push(fields[key]);
    }
  }

  if (columns.length) {
    params.push(id);
    await pool.execute(`UPDATE suppliers SET ${columns.join(', ')} WHERE supplier_id = ?`, params);
  }

  return findById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM suppliers WHERE supplier_id = ?', [id]);
  return result.affectedRows > 0;
}

async function countPurchases(id) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS count FROM purchases WHERE supplier_id = ?',
    [id]
  );
  return rows[0].count;
}

module.exports = { findAll, findById, create, update, remove, countPurchases };

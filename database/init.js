require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const databaseName = process.env.DB_NAME || 'batloung_farm';

if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
  console.error('DB_NAME may only contain letters, numbers and underscores.');
  process.exit(1);
}

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    console.log(`[database] Creating and resetting "${databaseName}"...`);

    const schema = fs
      .readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
      .replace(/batloung_farm/g, databaseName);
    const seed = fs
      .readFileSync(path.join(__dirname, 'seed.sql'), 'utf8')
      .replace(/batloung_farm/g, databaseName);

    await connection.query(schema);
    console.log('[database] Schema created successfully.');

    await connection.query(seed);
    console.log('[database] Sample data inserted successfully.');
    console.log('');
    console.log('Database ready. Start the application with: npm start');
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error('[database] Initialisation failed:', error.message);
  process.exitCode = 1;
});

const express = require('express');
const path = require('path');

const apiRoutes = require('./routes');
const { testConnection } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', async (req, res) => {
  try {
    await testConnection();
    res.status(200).json({ success: true, status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'degraded',
      database: 'unavailable',
      message: 'The API is running but the database connection failed.'
    });
  }
});

app.use('/api', apiRoutes);
app.use('/api', notFound);

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

const pageRoutes = [
  '/',
  '/dashboard',
  '/suppliers',
  '/fruits',
  '/vendors',
  '/purchases',
  '/sales',
  '/payments',
  '/reports'
];

app.get(pageRoutes, (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(publicDir, 'index.html'));
});

app.use(errorHandler);

module.exports = app;

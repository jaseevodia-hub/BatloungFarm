const express = require('express');

const router = express.Router();

router.use('/suppliers', require('./supplierRoutes'));
router.use('/fruits', require('./fruitRoutes'));
router.use('/vendors', require('./vendorRoutes'));
router.use('/purchases', require('./purchaseRoutes'));
router.use('/sales', require('./saleRoutes'));
router.use('/payments', require('./paymentRoutes'));
router.use('/reports', require('./reportRoutes'));

module.exports = router;

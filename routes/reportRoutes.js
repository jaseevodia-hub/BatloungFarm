const express = require('express');
const controller = require('../controllers/reportController');

const router = express.Router();

router.get('/top-fruits', controller.topFruits);
router.get('/revenue', controller.revenueReport);
router.get('/top-vendors', controller.topVendors);
router.get('/top-vendor', controller.topVendors);
router.get('/stock', controller.currentStock);
router.get('/dashboard', controller.dashboard);

module.exports = router;

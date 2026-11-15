const express = require('express');
const controller = require('../controllers/paymentController');

const router = express.Router();

router.get('/summary', controller.paymentSummary);
router.get('/outstanding', controller.outstandingByVendor);
router.get('/outstanding-sales', controller.outstandingSales);
router.get('/', controller.listPayments);
router.post('/', controller.recordPayment);

module.exports = router;

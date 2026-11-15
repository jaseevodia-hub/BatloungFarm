const express = require('express');
const controller = require('../controllers/purchaseController');

const router = express.Router();

router.get('/', controller.listPurchases);
router.post('/', controller.createPurchase);
router.get('/:id', controller.getPurchase);

module.exports = router;

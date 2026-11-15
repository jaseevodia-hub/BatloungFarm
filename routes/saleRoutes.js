const express = require('express');
const controller = require('../controllers/saleController');

const router = express.Router();

router.get('/', controller.listSales);
router.post('/', controller.createSale);
router.get('/:id', controller.getSale);

module.exports = router;

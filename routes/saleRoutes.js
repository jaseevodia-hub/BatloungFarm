const express = require('express');
const controller = require('../controllers/saleController');

const router = express.Router();

router.get('/', controller.listSales);
router.post('/', controller.createSale);
router.get('/:id', controller.getSale);
router.put('/:id', controller.updateSale);
router.delete('/:id', controller.deleteSale);

module.exports = router;

const express = require('express');
const controller = require('../controllers/fruitController');

const router = express.Router();

router.get('/stock', controller.listStock);
router.get('/low-stock', controller.listLowStock);
router.get('/', controller.listFruits);
router.post('/', controller.createFruit);
router.get('/:id/stock', controller.getFruitStock);
router.get('/:id', controller.getFruit);
router.put('/:id', controller.updateFruit);
router.delete('/:id', controller.deleteFruit);

module.exports = router;

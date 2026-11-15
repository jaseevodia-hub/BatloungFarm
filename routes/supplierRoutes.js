const express = require('express');
const controller = require('../controllers/supplierController');

const router = express.Router();

router.get('/', controller.listSuppliers);
router.post('/', controller.createSupplier);
router.get('/:id', controller.getSupplier);
router.put('/:id', controller.updateSupplier);
router.delete('/:id', controller.deleteSupplier);

module.exports = router;

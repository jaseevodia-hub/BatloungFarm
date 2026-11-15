const express = require('express');
const controller = require('../controllers/vendorController');

const router = express.Router();

router.get('/', controller.listVendors);
router.post('/', controller.createVendor);
router.get('/:id', controller.getVendor);
router.put('/:id', controller.updateVendor);
router.delete('/:id', controller.deleteVendor);

module.exports = router;

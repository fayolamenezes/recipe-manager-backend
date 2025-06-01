const express = require('express');
const router = express.Router();
const groceryController = require('../controllers/groceryController');
const authMiddleware = require('../middleware/authMiddleware');

// GET grocery list
router.get('/', authMiddleware, groceryController.getGroceryList);

// POST grocery list (create/update)
router.post('/', authMiddleware, groceryController.createOrUpdateGroceryList);

// Toggle item bought status
router.patch('/:itemId/toggle', authMiddleware, groceryController.toggleGroceryItemStatus);

// Export grocery list as PDF
router.get('/export-pdf', authMiddleware, groceryController.exportGroceryListPDF);

module.exports = router;

// routes/plannerRoutes.js
const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { getPlanner, savePlanner, exportPlannerPDF } = require('../controllers/plannerController');

router.get('/', protect, getPlanner);
router.post('/', protect, savePlanner);
router.get('/export-pdf', protect, exportPlannerPDF);

module.exports = router;

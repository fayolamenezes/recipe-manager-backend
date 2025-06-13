// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware'); // your existing auth middleware
const adminProtect = require('../middleware/adminProtect');

const {
  getUsers,
  banUser,
  unbanUser,
  getAllRecipesForAdmin,
  deleteRecipe,
  getStats,
  deleteCommentByAdmin,
} = require('../controllers/adminController');

// Apply protect and adminProtect to all routes below
router.use(protect, adminProtect);

// User management
router.get('/users', getUsers);
router.put('/users/:id/ban', banUser);
router.put('/users/:id/unban', unbanUser);

// Recipe moderation
router.get('/recipes', getAllRecipesForAdmin);
router.delete('/recipes/:id', deleteRecipe);

// Stats
router.get('/stats', getStats);

router.delete('/comments/:commentId', adminProtect, deleteCommentByAdmin);

module.exports = router;

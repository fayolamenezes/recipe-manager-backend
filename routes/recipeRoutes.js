const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  createRecipe,
  getAllPublicRecipes,
  addComment,
  getRecipeById,
  rateRecipe,
  toggleLike,
  getTopRecipesOfDay,
  createPrivateRecipe,
  deleteRecipeByOwner,
  deleteCommentByUser, 
  deleteRating,
  searchRecipes,
} = require('../controllers/recipeController');

// Search for Recipes
router.get('/search', searchRecipes);

// Create a recipe (requires login + image upload)
router.post('/', protect, upload.single('image'), createRecipe);

// Get all public recipes (no auth required)
router.get('/', getAllPublicRecipes);

// Get Top 3 Recipes of the Day (no auth required)
router.get('/top/day', getTopRecipesOfDay);

// Get a specific recipe by ID (no auth required)
router.get('/:recipeId', getRecipeById);

// Add a comment to a recipe (requires login)
router.post('/:recipeId/comments', protect, addComment);

// Rate a recipe (requires login)
router.post('/:recipeId/rate', protect, rateRecipe);

// Like or unlike a recipe (requires login)
router.post('/:recipeId/like', protect, toggleLike);

// Add new route for private recipes
router.post('/private', protect, upload.single('image'), createPrivateRecipe);

// Delete a recipe by owner
router.delete('/:recipeId', protect, deleteRecipeByOwner);

// Delete a comment from a recipe (requires login)
router.delete('/:recipeId/comments/:commentId', protect, deleteCommentByUser);

// Delete a rating by the logged-in user
router.delete('/:recipeId/rate/:ratingId', protect, deleteRating);

module.exports = router;

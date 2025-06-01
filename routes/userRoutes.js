const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { getSavedRecipes, removeSavedRecipe, isRecipeSaved, getSavedRecipesForGrocery, getBulkGroceryList, searchSavedRecipes, saveRecipeToLibrary, unsaveRecipeFromLibrary } = require('../controllers/userController');

// GET /api/users/saved - get saved recipes
router.get('/saved', protect, getSavedRecipes);

// Search Recipes from saved library
router.get('/saved/search', protect, searchSavedRecipes);

// Remove a saved recipe
router.delete('/saved/:recipeId', protect, removeSavedRecipe);

// Check if a specific recipe is saved
router.get('/saved/:recipeId/check', protect, isRecipeSaved);

// Grocery list endpoint
router.get('/grocery', protect, getSavedRecipesForGrocery);

// Bulk grocery list (requires login)
router.post('/grocery-list', protect, getBulkGroceryList);

router.post('/saved/:recipeId', protect, saveRecipeToLibrary);
router.delete('/saved/:recipeId', protect, unsaveRecipeFromLibrary);

module.exports = router;

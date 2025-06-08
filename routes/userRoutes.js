const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');

const {
  getSavedRecipes,
  getUserSavedRecipesOnly,     // new import
  removeSavedRecipe,
  isRecipeSaved,
  getSavedRecipesForGrocery,
  getBulkGroceryList,
  searchSavedRecipes,
  saveRecipeToLibrary,
  getAllUserLibraryRecipes
} = require('../controllers/userController');

// GET all recipes saved by the user (saved public + private recipes)
router.get('/saved', protect, getSavedRecipes);

// NEW: GET only saved recipes (no private recipes)
router.get('/saved/only', protect, getUserSavedRecipesOnly);

// Search within user's saved recipes
router.get('/saved/search', protect, searchSavedRecipes);

// Save a recipe to user's library
router.post('/saved/:recipeId', protect, saveRecipeToLibrary);

// Remove (unsave) a saved recipe from user's library
router.delete('/saved/:recipeId', protect, removeSavedRecipe);

// Check if a specific recipe is already saved
router.get('/saved/:recipeId/check', protect, isRecipeSaved);

// Get saved recipes for grocery list preparation
router.get('/grocery', protect, getSavedRecipesForGrocery);

// Get combined grocery list from multiple selected recipes
router.post('/grocery-list', protect, getBulkGroceryList);

// Get all recipes in user’s library (personal + saved public)
router.get('/recipes/library', protect, getAllUserLibraryRecipes);

module.exports = router;

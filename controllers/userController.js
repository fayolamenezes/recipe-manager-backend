const User = require('../models/User');
const Recipe = require('../models/Recipe');
const Planner = require('../models/Planner');
const mongoose = require('mongoose');

// Existing function: returns privateRecipes + savedPublicRecipes
const getSavedRecipes = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('savedRecipes');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const privateRecipes = await Recipe.find({ createdBy: req.user._id, isPublic: false }).sort({ createdAt: -1 });

    res.json({
      privateRecipes,
      savedPublicRecipes: user.savedRecipes || [],
    });
  } catch (err) {
    console.error('Error fetching recipe library:', err);
    res.status(500).json({ message: 'Failed to fetch recipe library' });
  }
};

// NEW: simple endpoint to fetch only saved recipes
const getUserSavedRecipesOnly = async (req, res) => {
  try {
    // Check if user info exists in request (from auth middleware)
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find user and populate only the savedRecipes field with title and _id
    const user = await User.findById(req.user._id).populate('savedRecipes', 'title _id');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the populated savedRecipes array
    res.json(user.savedRecipes);
  } catch (error) {
    console.error('Error in getUserSavedRecipesOnly:', error);
    res.status(500).json({ message: 'Failed to fetch saved recipes' });
  }
};

// Unified removeSavedRecipe function (replaces unsaveRecipeFromLibrary)
const removeSavedRecipe = async (req, res) => {
  try {
    const { recipeId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.savedRecipes.includes(recipeId)) {
      user.savedRecipes = user.savedRecipes.filter(
        (id) => id.toString() !== recipeId
      );

      await user.save();

      // Decrement savedByCount on Recipe
      await Recipe.findByIdAndUpdate(recipeId, { $inc: { savedByCount: -1 } });

      res.status(200).json({ message: 'Recipe removed from your library' });
    } else {
      res.status(400).json({ message: 'Recipe not found in your library' });
    }
  } catch (err) {
    console.error('Error removing saved recipe:', err);
    res.status(500).json({ message: 'Failed to remove saved recipe' });
  }
};

// Check if a recipe is saved by the user
const isRecipeSaved = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const isSaved = user.savedRecipes.includes(recipeId);
    res.status(200).json({ saved: isSaved });
  } catch (err) {
    console.error('Error checking saved recipe:', err);
    res.status(500).json({ message: 'Failed to check saved recipe' });
  }
};

const getSavedRecipesForGrocery = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('savedRecipes');
    res.json(user.savedRecipes);
  } catch (err) {
    console.error('Error fetching grocery list:', err);
    res.status(500).json({ message: 'Failed to fetch grocery list' });
  }
};

// Bulk grocery list: get combined ingredients from multiple recipe IDs (with duplicates)
const getBulkGroceryList = async (req, res) => {
  try {
    const { recipeIds } = req.body;
    if (!Array.isArray(recipeIds)) {
      return res.status(400).json({ message: 'recipeIds must be an array' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Filter out recipes the user hasn't saved
    const validRecipeIds = recipeIds.filter(id =>
      user.savedRecipes.map(r => r.toString()).includes(id)
    );

    const recipes = await Recipe.find({ _id: { $in: validRecipeIds } });

    // Combine all ingredients (duplicates allowed)
    const ingredients = recipes.flatMap(recipe => recipe.ingredients);

    res.json({ ingredients });
  } catch (error) {
    console.error('Error fetching bulk grocery list:', error);
    res.status(500).json({ message: 'Failed to get grocery list' });
  }
};

const savePlanner = async (req, res) => {
  try {
    const userId = req.user._id;
    const { week } = req.body;  // changed from days to week to match schema

    // Flatten all recipe IDs from planner data
    const selectedRecipeIds = [];
    for (const day of Object.values(week)) {
      for (const meal of Object.values(day)) {
        if (meal) selectedRecipeIds.push(meal);
      }
    }

    // Get user's saved recipe IDs
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const savedRecipeIds = user.savedRecipes.map(id => id.toString());

    // Validate: are all selected IDs part of saved recipes?
    const invalidIds = selectedRecipeIds.filter(id => !savedRecipeIds.includes(id));

    if (invalidIds.length > 0) {
      return res.status(400).json({
        message: 'Planner contains recipes not saved by user',
        invalidRecipeIds: invalidIds
      });
    }

    // Save or update planner
    let planner = await Planner.findOne({ user: userId });

    if (planner) {
      planner.week = week;  // update week, not days
      await planner.save();
    } else {
      planner = await Planner.create({ user: userId, week });  // create with week
    }

    res.status(200).json({ message: 'Planner saved successfully', planner });

  } catch (err) {
    console.error('Error saving planner:', err);
    res.status(500).json({ message: 'Failed to save planner' });
  }
};

const searchSavedRecipes = async (req, res) => {
  try {
    const query = req.query.query || '';
    const user = await User.findById(req.user._id).populate({
      path: 'savedRecipes',
      match: { title: { $regex: query, $options: 'i' } },
    });

    res.json(user.savedRecipes);
  } catch (err) {
    console.error('Error searching saved recipes:', err);
    res.status(500).json({ message: 'Failed to search saved recipes' });
  }
};

const saveRecipeToLibrary = async (req, res) => {
  try {
    const { recipeId } = req.params;

    console.log('Received recipeId:', recipeId);

    if (!mongoose.Types.ObjectId.isValid(recipeId)) {
      console.log('❌ Invalid recipe ID');
      return res.status(400).json({ message: 'Invalid recipe ID' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      console.log('❌ User not found:', req.user._id);
      return res.status(404).json({ message: 'User not found' });
    }

    const recipeObjectId = new mongoose.Types.ObjectId(recipeId);

    const alreadySaved = user.savedRecipes.some(id => id.equals(recipeObjectId));
    if (alreadySaved) {
      console.log('❌ Recipe already saved:', recipeId);
      return res.status(400).json({ message: 'Recipe already saved' });
    }

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      console.log('❌ Recipe not found in DB:', recipeId);
      return res.status(404).json({ message: 'Recipe not found' });
    }

    console.log('✅ All checks passed. Saving recipe...');

    user.savedRecipes.push(recipeObjectId);
    await user.save();

    recipe.savedByCount = (recipe.savedByCount || 0) + 1;
    await recipe.save();

    res.status(200).json({ message: 'Recipe saved to your library' });
  } catch (err) {
    console.error('🔥 Error saving recipe:', err);
    res.status(500).json({ message: 'Failed to save recipe' });
  }
};

const getAllUserLibraryRecipes = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('savedRecipes') // ✅ Show ALL saved recipes, public or private
      .populate({
        path: 'recipes', // ✅ Your own private recipes
        match: { isPrivate: true } // ← assuming you use this flag
      });

    const savedPublicRecipes = user.savedRecipes || [];
    const privateRecipes = user.recipes || [];

    res.json({
      savedPublicRecipes,
      privateRecipes
    });
  } catch (err) {
    console.error('Error fetching user library:', err);
    res.status(500).json({ message: 'Failed to fetch library' });
  }
};

module.exports = {
  getSavedRecipes,
  getUserSavedRecipesOnly,  // NEW export
  removeSavedRecipe,
  isRecipeSaved,
  getSavedRecipesForGrocery,
  getBulkGroceryList,
  savePlanner,
  searchSavedRecipes,
  saveRecipeToLibrary,
  getAllUserLibraryRecipes,
};

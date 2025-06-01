// controllers/userController.js
const User = require('../models/User');
const Recipe = require('../models/Recipe');
const Planner = require('../models/Planner');

const getSavedRecipes = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('savedRecipes');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.savedRecipes);
  } catch (err) {
    console.error('Error fetching saved recipes:', err);
    res.status(500).json({ message: 'Failed to fetch saved recipes' });
  }
};

const removeSavedRecipe = async (req, res) => {
  try {
    const { recipeId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.savedRecipes = user.savedRecipes.filter(
      (id) => id.toString() !== recipeId
    );

    await user.save();
    res.status(200).json({ message: 'Recipe removed from saved list' });
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
    const { days } = req.body;

    // Flatten all recipe IDs from planner data
    const selectedRecipeIds = [];
    for (const day of Object.values(days)) {
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
      planner.days = days;
      await planner.save();
    } else {
      planner = await Planner.create({ user: userId, days });
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
    const user = await User.findById(req.user._id);

    if (!user.savedRecipes.includes(recipeId)) {
      user.savedRecipes.push(recipeId);
      await user.save();

      // Increment savedByCount on Recipe
      await Recipe.findByIdAndUpdate(recipeId, { $inc: { savedByCount: 1 } });

      res.status(200).json({ message: 'Recipe saved to your library' });
    } else {
      res.status(400).json({ message: 'Recipe already saved' });
    }
  } catch (err) {
    console.error('Error saving recipe:', err);
    res.status(500).json({ message: 'Failed to save recipe' });
  }
};

const unsaveRecipeFromLibrary = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const user = await User.findById(req.user._id);

    if (user.savedRecipes.includes(recipeId)) {
      user.savedRecipes = user.savedRecipes.filter(id => id.toString() !== recipeId);
      await user.save();

      // Decrement savedByCount on Recipe
      await Recipe.findByIdAndUpdate(recipeId, { $inc: { savedByCount: -1 } });

      res.status(200).json({ message: 'Recipe removed from your library' });
    } else {
      res.status(400).json({ message: 'Recipe not found in your library' });
    }
  } catch (err) {
    console.error('Error removing recipe:', err);
    res.status(500).json({ message: 'Failed to remove recipe' });
  }
};

module.exports = {
  getSavedRecipes,
  removeSavedRecipe,
  isRecipeSaved,
  getSavedRecipesForGrocery,
  getBulkGroceryList,
  savePlanner,
  searchSavedRecipes,
  saveRecipeToLibrary,
  unsaveRecipeFromLibrary,
};

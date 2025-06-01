// controllers/adminController.js
const User = require('../models/User');
const Recipe = require('../models/Recipe');

// Get all users (excluding passwords)
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Ban a user
const banUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.banned = true;
    await user.save();
    res.json({ message: 'User banned successfully' });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ message: 'Failed to ban user' });
  }
};

// Unban a user
const unbanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.banned = false;
    await user.save();
    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ message: 'Failed to unban user' });
  }
};

// Get all recipes (for moderation)
const getAllRecipesForAdmin = async (req, res) => {
  try {
    const recipes = await Recipe.find()
      .populate('author', 'name email')
      .lean();
    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ message: 'Failed to fetch recipes' });
  }
};

// Delete a recipe
const deleteRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });

    await recipe.remove();
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ message: 'Failed to delete recipe' });
  }
};

// Get stats - example: top 5 most saved recipes
const getStats = async (req, res) => {
  try {
    // Aggregate top 5 recipes by how many users saved them
    const mostSavedRecipes = await Recipe.aggregate([
    {
        $project: {
        title: 1,
        savedCount: { $size: { $ifNull: ["$savedByUsers", []] } },
        }
    },
    { $sort: { savedCount: -1 } },
    { $limit: 5 },
    ]);

    const userCount = await User.countDocuments();
    const recipeCount = await Recipe.countDocuments();

    res.json({ mostSavedRecipes, userCount, recipeCount });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};

module.exports = {
  getUsers,
  banUser,
  unbanUser,
  getAllRecipesForAdmin,
  deleteRecipe,
  getStats,
};

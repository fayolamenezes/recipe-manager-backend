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
      .populate('createdBy', 'name email')
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

    await recipe.deleteOne();
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ message: 'Failed to delete recipe' });
  }
};

// Get stats - example: top 5 most saved recipes
const getStats = async (req, res) => {
  try {
    // Fetch top 5 recipes sorted by savedByCount field (numeric)
    const mostSavedRecipesRaw = await Recipe.find({})
      .sort({ savedByCount: -1 })
      .limit(5)
      .select('title savedByCount');

    // Format to match expected `savedCount` property
    const mostSavedRecipes = mostSavedRecipesRaw.map(recipe => ({
      _id: recipe._id,
      title: recipe.title,
      savedCount: recipe.savedByCount || 0
    }));

    const userCount = await User.countDocuments();
    const recipeCount = await Recipe.countDocuments();

    res.json({ mostSavedRecipes, userCount, recipeCount });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};

const deleteCommentByAdmin = async (req, res) => {
  try {
    const { commentId } = req.params;
    const recipe = await Recipe.findOne({ 'comments._id': commentId });
    if (!recipe) return res.status(404).json({ message: 'Comment not found' });

    recipe.comments = recipe.comments.filter(c => c._id.toString() !== commentId);
    await recipe.save();

    res.status(200).json({ message: 'Comment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUsers,
  banUser,
  unbanUser,
  getAllRecipesForAdmin,
  deleteRecipe,
  getStats,
  deleteCommentByAdmin,
};

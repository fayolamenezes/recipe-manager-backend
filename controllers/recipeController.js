const Recipe = require('../models/Recipe'); 
const User = require('../models/User');
const path = require('path');

// Create a new recipe
const createRecipe = async (req, res) => {
  try {
    const { title, ingredients, instructions, tag } = req.body;

    if (!['breakfast', 'lunch', 'dinner', 'snacks', 'dessert'].includes(tag)) {
      return res.status(400).json({ message: 'Invalid tag' });
    }

    // Convert ingredients string to array if necessary
    const parsedIngredients = Array.isArray(ingredients)
      ? ingredients
      : ingredients.split(',').map(item => item.trim());

    let imagePath = null;
    if (req.file) {
      // Normalize the file path
      imagePath = path.join('/uploads', req.file.filename).replace(/\\/g, '/');
    }

    const newRecipe = new Recipe({
      title,
      ingredients: parsedIngredients,
      instructions,
      image: imagePath,
      tag,
      createdBy: req.user._id,
    });

    const saved = await newRecipe.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error creating recipe:', err.message);
    res.status(500).json({ error: 'Failed to post recipe' });
  }
};

// Get all public recipes or filter by tag
const getAllPublicRecipes = async (req, res) => {
  try {
    const { tag, sort } = req.query;

    const filter = {
      isPublic: true,
      ...(tag && { tag }),
    };

    let recipesQuery = Recipe.find(filter)
      .populate('createdBy', 'name')
      .populate('comments.user', 'username');

    switch (sort) {
      case 'newest':
        recipesQuery = recipesQuery.sort({ createdAt: -1 });
        break;
      case 'mostLiked':
        recipesQuery = recipesQuery.sort({ likesCount: -1 });
        break;
      case 'mostRated':
        recipesQuery = recipesQuery.sort({ averageRating: -1 });
        break;
      case 'mostCommented':
        recipesQuery = recipesQuery.sort({ commentsCount: -1 });
        break;
      case 'mostSaved':
        recipesQuery = recipesQuery.sort({ savedByCount: -1 });
        break;
      default:
        recipesQuery = recipesQuery.sort({ createdAt: -1 });
    }

    const recipes = await recipesQuery.exec();

    res.json(recipes);
  } catch (err) {
    console.error('Error fetching recipes:', err);
    res.status(500).json({ error: 'Error fetching recipes' });
  }
};

// Add a comment to a recipe
const addComment = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { text } = req.body;

    if (!text) return res.status(400).json({ message: 'Comment text is required' });

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });

    const comment = {
      user: req.user._id,
      text,
    };

    recipe.comments.push(comment);
    recipe.commentsCount = recipe.comments.length;

    await recipe.save();

    // Re-query with populate
    const updatedRecipe = await Recipe.findById(recipeId).populate('comments.user', 'name');

    console.log('Populated comments after add:', updatedRecipe.comments);

    res.status(201).json(updatedRecipe.comments);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
};

// Get a single recipe by ID
const getRecipeById = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.recipeId)
      .populate('createdBy', 'name')
      .populate('comments.user', 'username');

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    res.json(recipe);
  } catch (err) {
    console.error('Error fetching recipe by ID:', err);
    res.status(500).json({ message: 'Error fetching recipe' });
  }
};

// Rate a recipe
const rateRecipe = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { value } = req.body;

    if (!value || value < 1 || value > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });

    let rating;

    const existingRating = recipe.ratings.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingRating) {
      // Update existing rating
      existingRating.value = value;
      rating = existingRating;
    } else {
      // Add new rating
      rating = { user: req.user._id, value };
      recipe.ratings.push(rating);
      rating = recipe.ratings[recipe.ratings.length - 1];
    }

    // Update ratingsCount
    recipe.ratingsCount = recipe.ratings.length;

    await recipe.save();

    // Calculate average rating
    const avgRating =
      recipe.ratings.reduce((acc, r) => acc + r.value, 0) / recipe.ratings.length;

    recipe.averageRating = avgRating;

    await recipe.save();

    res.status(200).json({
      message: 'Rating submitted',
      averageRating: avgRating.toFixed(2),
      ratingId: rating._id,
      totalRatings: recipe.ratings.length,
    });
  } catch (error) {
    console.error('Error rating recipe:', error);
    res.status(500).json({ message: 'Failed to rate recipe' });
  }
};

// Like or Unlike a recipe
const toggleLike = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const userId = req.user._id;

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });

    const index = recipe.likes.findIndex(
      (likeUserId) => likeUserId.toString() === userId.toString()
    );

    if (index === -1) {
      // Not liked yet
      recipe.likes.push(userId);
    } else {
      // Already liked, remove
      recipe.likes.splice(index, 1);
    }

    recipe.likesCount = recipe.likes.length;

    await recipe.save();

    res.json({
      message: index === -1 ? 'Recipe liked' : 'Recipe unliked',
      likesCount: recipe.likesCount,
      likes: recipe.likes,
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ message: 'Failed to toggle like' });
  }
};

const getTopRecipesOfDay = async (req, res) => {
  try {
    // Start of the week (Monday midnight)
    const now = new Date();
    const dayOfWeek = now.getDay(); // Sunday = 0, Monday = 1 ...
    const diffToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1); // days since Monday
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - diffToMonday);

    // Get all public recipes created since start of week
    const recipes = await Recipe.find({
      createdAt: { $gte: startOfWeek },
      isPrivate: { $ne: true } // exclude private recipes
    })
      .populate('createdBy', 'name')
      .populate('comments.user', 'username')
      .lean();

    // Calculate score for each recipe: likes count * 2 + avg rating * 3
    const scoredRecipes = recipes.map(recipe => {
      const likesCount = recipe.likes ? recipe.likes.length : 0;

      let avgRating = 0;
      if (recipe.ratings && recipe.ratings.length > 0) {
        const totalRating = recipe.ratings.reduce((sum, r) => sum + r.value, 0);
        avgRating = totalRating / recipe.ratings.length;
      }

      const score = likesCount * 2 + avgRating * 3;

      return { ...recipe, score };
    });

    // Sort by score descending
    scoredRecipes.sort((a, b) => b.score - a.score);

    // Return top 3
    const top3 = scoredRecipes.slice(0, 3);

    res.json(top3);
  } catch (error) {
    console.error('Error fetching top recipes of the day:', error);
    res.status(500).json({ message: 'Failed to fetch top recipes' });
  }
};

const createPrivateRecipe = async (req, res) => {
  try {
    const { title, ingredients, instructions, tag } = req.body;

    if (!['breakfast', 'lunch', 'dinner', 'snacks', 'dessert'].includes(tag)) {
      return res.status(400).json({ message: 'Invalid tag' });
    }

    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    const newRecipe = new Recipe({
      title,
      ingredients,
      instructions,
      image: imagePath,
      tag,
      createdBy: req.user._id, // ✅ matches model now
      isPrivate: true,
      isPublic: false, // optional redundancy
    });

    const savedRecipe = await newRecipe.save();

    // ✅ Add recipe to user's `recipes` list (personal)
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { recipes: savedRecipe._id }
    });

    res.status(201).json(savedRecipe);
  } catch (error) {
    console.error('Error creating private recipe:', error);
    res.status(500).json({ message: 'Failed to create private recipe' });
  }
};

// Controller to get private recipes for logged-in user
const getPrivateRecipes = async (req, res) => {
  try {
    const userId = req.user._id ; // or req.user._id

    const privateRecipes = await Recipe.find({ createdBy: userId, isPublic: false });

    res.status(200).json(privateRecipes);
  } catch (error) {
    console.error('Error fetching private recipes:', error);
    res.status(500).json({ message: 'Server error fetching private recipes' });
  }
};

const deletePrivateRecipe = async (req, res) => {
  try {
    const userId = req.user._id;
    const recipeId = req.params.id;

    // Find the recipe by id
    const recipe = await Recipe.findById(recipeId);

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    // Check if the logged-in user is the author
    if (recipe.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this recipe' });
    }

    // Delete the recipe
    await Recipe.findByIdAndDelete(recipeId);

    res.status(200).json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting private recipe' });
  }
};

const deleteRecipeByOwner = async (req, res) => {
  const { recipeId } = req.params;
  try {
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });

    if (recipe.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this recipe' });
    }

    // Use findByIdAndDelete instead of remove
    await Recipe.findByIdAndDelete(recipeId);

    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ message: 'Failed to delete recipe' });
  }
};

const deleteCommentByUser = async (req, res) => {
  const { recipeId, commentId } = req.params;

  try {
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });

    const comment = recipe.comments.find((c) => c._id.toString() === commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Remove the comment by filtering it out
    recipe.comments = recipe.comments.filter((c) => c._id.toString() !== commentId);

    // Update commentsCount field
    recipe.commentsCount = recipe.comments.length;

    await recipe.save();

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
};

const deleteRating = async (req, res) => {
  try {
    const { recipeId, ratingId } = req.params;

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });

    const rating = recipe.ratings.find((r) => r._id.toString() === ratingId);

    if (!rating) {
      return res.status(404).json({ message: 'Rating not found' });
    }

    if (rating.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this rating' });
    }

    // Filter out the rating
    recipe.ratings = recipe.ratings.filter((r) => r._id.toString() !== ratingId);

    // Update ratingsCount
    recipe.ratingsCount = recipe.ratings.length;

    // Recalculate average rating or reset if no ratings left
    if (recipe.ratings.length > 0) {
      const avgRating = recipe.ratings.reduce((acc, r) => acc + r.value, 0) / recipe.ratings.length;
      recipe.averageRating = avgRating;
    } else {
      recipe.averageRating = null; // or 0 if you prefer
    }

    await recipe.save();

    res.json({ message: 'Rating deleted successfully', averageRating: recipe.averageRating });
  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({ message: 'Failed to delete rating' });
  }
};

const searchRecipes = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Use regex for partial, case-insensitive matching on recipe title
    const results = await Recipe.find({
      title: { $regex: query, $options: 'i' },
      isPublic: true,
    });

    res.json(results);
  } catch (error) {
    console.error('Error searching recipes:', error);
    res.status(500).json({ message: 'Search failed' });
  }
};

module.exports = {
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
  getPrivateRecipes,
  deletePrivateRecipe,
};

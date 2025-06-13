const Recipe = require('../models/Recipe');

// Internal helper function (NOT exported)
const matchRecipes = async (userIngredients, category) => {
  const allRecipes = await Recipe.find({ tag: category, isPublic: true });

  const userInput = userIngredients.map(ing => ing.trim().toLowerCase());

  const matches = allRecipes.map(recipe => {
    const recipeIngredients = recipe.ingredients.map(ing =>
      ing.trim().toLowerCase()
    );

    // Match if user ingredient is included in any part of the recipe ingredient
    const matchingCount = userInput.filter(userIng =>
      recipeIngredients.some(recipeIng => recipeIng.includes(userIng))
    ).length;

    return {
      _id: recipe._id,
      title: recipe.title,
      matchScore: matchingCount,
    };
  });

  return matches
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);
};

// Express route controller
const findMatchingRecipes = async (req, res) => {
  try {
    const { ingredients, category } = req.body;

    if (!Array.isArray(ingredients) || !category) {
      return res.status(400).json({ message: 'Invalid input' });
    }

    const matches = await matchRecipes(ingredients, category);
    return res.json(matches);
  } catch (error) {
    console.error('Error finding matching recipes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { findMatchingRecipes };

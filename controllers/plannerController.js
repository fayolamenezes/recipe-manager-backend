const Planner = require('../models/Planner');
const Recipe = require('../models/Recipe');
const User = require('../models/User');
const PDFDocument = require('pdfkit');

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const meals = ['breakfast', 'lunch', 'dinner', 'snacks', 'dessert'];

exports.getPlanner = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      console.warn('Unauthorized request, missing user or _id');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('Fetching planner for user:', req.user._id);

    const user = await User.findById(req.user._id).select('savedRecipes');
    if (!user) {
      console.warn('User not found for id:', req.user._id);
      return res.status(404).json({ message: 'User not found' });
    }

    const planner = await Planner.findOne({ user: req.user._id }).lean();
    if (!planner) {
      console.warn('Planner not found for user:', req.user._id);
      return res.status(404).json({ message: 'Planner not found' });
    }

    if (!planner.week) {
      planner.week = {};
    }
    days.forEach(day => {
      if (!planner.week[day]) {
        planner.week[day] = {};
      }
    });

    // Collect recipe IDs safely
    const recipeIds = [];
    days.forEach(day => {
      meals.forEach(meal => {
        const id = planner.week[day][meal];
        if (id) {
          try {
            // Validate ObjectId format if needed here or let mongoose handle
            recipeIds.push(id);
          } catch {
            console.warn(`Invalid recipe id at ${day} ${meal}:`, id);
          }
        }
      });
    });

    console.log('Recipe IDs to fetch:', recipeIds);

    const recipes = await Recipe.find({ _id: { $in: recipeIds } }).lean();
    const recipeMap = new Map(recipes.map(r => [r._id.toString(), r]));

    days.forEach(day => {
      meals.forEach(meal => {
        const id = planner.week[day][meal];
        if (id) {
          planner.week[day][meal] = recipeMap.get(id.toString()) || null;
        }
      });
    });

    console.log('Returning planner:', JSON.stringify(planner.week, null, 2));
    res.json(planner);

  } catch (error) {
    console.error('Error in getPlanner:', error);
    res.status(500).json({ message: 'Failed to fetch planner' });
  }
};

// Save or update planner
exports.savePlanner = async (req, res) => {
  try {
    const userId = req.user._id;
    const { week } = req.body;

    console.log('💾 Received planner from client:', JSON.stringify(week, null, 2));

    const selectedRecipeIds = [];
    for (const day of Object.values(week)) {
      for (const meal of Object.values(day)) {
        if (meal) {
          const recipeId = typeof meal === 'object' ? meal._id : meal;
          if (recipeId) selectedRecipeIds.push(recipeId.toString());
        }
      }
    }

    // ✅ Fetch user with both saved and created recipes
    const user = await User.findById(userId)
      .populate('savedRecipes')
      .populate('recipes'); // assuming 'recipes' field exists for user-created recipes

    if (!user) return res.status(404).json({ message: 'User not found' });

    const savedRecipeIds = [
      ...(user.savedRecipes?.map(r => r._id.toString()) || []),
      ...(user.recipes?.map(r => r._id.toString()) || []),
    ];

    // ✅ Validate all selected recipes are in saved OR created
    const invalidIds = selectedRecipeIds.filter(id => !savedRecipeIds.includes(id));
    if (invalidIds.length > 0) {
      console.log('❌ Invalid recipe IDs:', invalidIds);
      return res.status(400).json({
        message: 'Planner contains recipes not saved or created by user',
        invalidRecipeIds: invalidIds
      });
    }

    let planner = await Planner.findOne({ user: userId });

    if (planner) {
      planner.week = week;
    } else {
      planner = new Planner({ user: userId, week });
    }

    await planner.save();
    console.log('✅ Planner successfully saved in DB.');
    res.status(200).json({ message: 'Planner saved successfully', planner });
  } catch (error) {
    console.error('❌ Error saving planner:', error);
    res.status(500).json({ message: 'Failed to save planner' });
  }
};

exports.exportPlannerPDF = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('savedRecipes');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const populatePaths = [];
    days.forEach(day => {
      meals.forEach(meal => {
        populatePaths.push({
          path: `week.${day}.${meal}`,
          model: 'Recipe',
        });
      });
    });

    let query = Planner.findOne({ user: userId });
    populatePaths.forEach(path => {
      query = query.populate(path);
    });

    const planner = await query.exec();
    if (!planner) return res.status(404).json({ message: 'Planner not found' });

    // Ensure all days exist in the planner structure
    days.forEach(day => {
      if (!planner.week[day]) planner.week[day] = {};
    });

    // Create PDF doc
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Disposition', 'attachment; filename="weekly-planner.pdf"');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    // PDF Title
    doc.fontSize(18).text('Weekly Meal Planner', { align: 'center' });
    doc.moveDown();

    days.forEach(day => {
      doc.fontSize(14).fillColor('black').text(day.charAt(0).toUpperCase() + day.slice(1), { underline: true });

      if (!planner.week[day]) {
        doc.fontSize(12).fillColor('gray').text('  No meals planned');
        doc.moveDown();
        return;
      }

      meals.forEach(meal => {
        const recipe = planner.week[day][meal];
        const recipeTitle = recipe && recipe.title ? recipe.title : 'No recipe assigned';
        doc.fontSize(12).fillColor('black').text(`  ${meal.charAt(0).toUpperCase() + meal.slice(1)}: ${recipeTitle}`);
      });
      doc.moveDown();
    });

    doc.end();
  } catch (error) {
    console.error('Error generating planner PDF:', error);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
};

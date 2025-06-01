// controllers/plannerController.js
const Planner = require('../models/Planner');
const User = require('../models/User');
const PDFDocument = require('pdfkit');

exports.getPlanner = async (req, res) => {
  try {
    // Fetch user saved recipes array of ObjectIds as strings
    const user = await User.findById(req.user._id).select('savedRecipes');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Dynamically populate all recipe refs in planner
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const meals = ['breakfast', 'lunch', 'dinner', 'snacks', 'dessert'];
    const populatePaths = [];
    days.forEach(day => {
      meals.forEach(meal => {
        populatePaths.push(`week.${day}.${meal}`);
      });
    });

    let query = Planner.findOne({ user: req.user._id });
    populatePaths.forEach(path => {
      query = query.populate(path);
    });

    const planner = await query;
    if (!planner) return res.status(404).json({ message: 'Planner not found' });

    // Filter out recipes not in user's savedRecipes
    days.forEach(day => {
      meals.forEach(meal => {
        const recipe = planner.week[day][meal];
        if (recipe && !user.savedRecipes.map(id => id.toString()).includes(recipe._id.toString())) {
          planner.week[day][meal] = null; // Replace with null if recipe not saved
        }
      });
    });

    res.json(planner);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch planner' });
  }
};

// Save/update planner
exports.savePlanner = async (req, res) => {
  try {
    const { week } = req.body;

    let planner = await Planner.findOne({ user: req.user._id });

    if (planner) {
      planner.week = week;
    } else {
      planner = new Planner({ user: req.user._id, week });
    }

    await planner.save();
    res.json({ message: 'Planner saved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save planner' });
  }
};

exports.exportPlannerPDF = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch user saved recipes array
    const user = await User.findById(userId).select('savedRecipes');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Fetch planner with populated recipes
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const meals = ['breakfast', 'lunch', 'dinner', 'snacks', 'dessert'];
    const populatePaths = [];
    days.forEach(day => {
      meals.forEach(meal => {
        populatePaths.push(`week.${day}.${meal}`);
      });
    });

    let query = Planner.findOne({ user: userId });
    populatePaths.forEach(path => {
      query = query.populate(path);
    });

    const planner = await query;
    if (!planner) return res.status(404).json({ message: 'Planner not found' });

    // Filter out recipes not in user's savedRecipes
    days.forEach(day => {
      meals.forEach(meal => {
        const recipe = planner.week[day][meal];
        if (recipe && !user.savedRecipes.map(id => id.toString()).includes(recipe._id.toString())) {
          planner.week[day][meal] = null;
        }
      });
    });

    // Create PDF doc
    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    // Set response headers for PDF download
    res.setHeader('Content-Disposition', 'attachment; filename="weekly-planner.pdf"');
    res.setHeader('Content-Type', 'application/pdf');

    // Pipe PDF output to response
    doc.pipe(res);

    // PDF Title
    doc.fontSize(18).text('Weekly Meal Planner', { align: 'center' });
    doc.moveDown();

    // Iterate days and meals, add text
    days.forEach(day => {
      doc.fontSize(14).fillColor('black').text(day.charAt(0).toUpperCase() + day.slice(1), { underline: true });
      meals.forEach(meal => {
        const recipe = planner.week[day][meal];
        doc.fontSize(12).fillColor('black').text(`  ${meal.charAt(0).toUpperCase() + meal.slice(1)}: ${recipe ? recipe.title : 'No recipe assigned'}`);
      });
      doc.moveDown();
    });

    doc.end();

  } catch (error) {
    console.error('Error generating planner PDF:', error);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
};

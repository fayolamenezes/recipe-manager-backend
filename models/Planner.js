// models/Planner.js
const mongoose = require('mongoose');

const daySchema = new mongoose.Schema({
  breakfast: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', default: null },
  lunch: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', default: null },
  dinner: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', default: null },
  snacks: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', default: null },
  dessert: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', default: null },
});

const plannerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  week: {
    monday: daySchema,
    tuesday: daySchema,
    wednesday: daySchema,
    thursday: daySchema,
    friday: daySchema,
    saturday: daySchema,
    sunday: daySchema,
  },
});

module.exports = mongoose.model('Planner', plannerSchema);

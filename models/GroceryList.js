const mongoose = require('mongoose');

const GroceryItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: String,
  bought: { type: Boolean, default: false },
});

const GroceryListSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [GroceryItemSchema],
});

module.exports = mongoose.model('GroceryList', GroceryListSchema);

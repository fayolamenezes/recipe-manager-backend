const mongoose = require('mongoose');

// Define the comment schema
const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Define the recipe schema
const recipeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  ingredients: [String],
  instructions: {
    type: String,
    required: true,
  },
  image: {
    type: String, // URL of the image
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  comments: [commentSchema],
  ratings: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      value: { type: Number, min: 1, max: 5 },
    },
  ],
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  ],
  tag: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snacks', 'dessert'],
    required: true,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },

  // Users who saved the recipe
  savedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  ],

  // Optimization fields
  likesCount: {
    type: Number,
    default: 0,
  },
  commentsCount: {
    type: Number,
    default: 0,
  },
  averageRating: {
    type: Number,
    default: 0,
  },
  savedByCount: {
    type: Number,
    default: 0,
  },
});

// Auto-update savedByCount before saving
recipeSchema.pre('save', function (next) {
  this.savedByCount = this.savedBy?.length || 0;
  next();
});

// Add text index
recipeSchema.index({ title: 'text' });

module.exports = mongoose.model('Recipe', recipeSchema);

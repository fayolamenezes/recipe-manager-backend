// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const authRoutes = require('./routes/auth');
app.use('/api/users', authRoutes);

const groceryRoutes = require('./routes/groceryRoutes');
app.use('/api/grocerylist', groceryRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

const recipeRoutes = require('./routes/recipeRoutes');
app.use('/api/recipes', recipeRoutes);

app.use('/api/planner', require('./routes/plannerRoutes'));

app.use('/api/admin', require('./routes/adminRoutes'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch((err) => console.error(err));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

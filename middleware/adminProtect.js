// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 🔍 Fetch full user from DB (including isAdmin)
    const user = await User.findById(decoded.userId).select('_id name email isAdmin');
    if (!user) return res.status(404).json({ message: 'User not found' });

    req.user = user; // ✅ full user object now available in req.user
    next();
  } catch (err) {
    console.error('JWT Error:', err);
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = protect;

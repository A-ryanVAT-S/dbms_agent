// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication token is required' });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.userId);
      console.log('User found:', user ? 'yes' : 'no'); // Check if user was found
      
      if (!user) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }
      
      req.user = {
        id: user._id,
        email: user.email,
        name: user.name
      };
      
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return res.status(403).json({ success: false, message: 'Invalid token', error: jwtError.message });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(403).json({ success: false, message: 'Invalid token', error: error.message });
  }
};

module.exports = { authenticateToken };
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { accessSecret } = require('../utils/jwtSecrets');
const { User } = require('../models/postgres');

/** Sets `req.user` when a valid Bearer token is sent; continues as guest otherwise */
const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next();

    const token = header.slice(7);
    const decoded = jwt.verify(token, accessSecret());
    const user = await User.findByPk(decoded.id);
    if (user && !user.is_banned) req.user = user;
  } catch {
    /* invalid/expired token — treat as guest */
  }
  next();
};

module.exports = optionalAuth;

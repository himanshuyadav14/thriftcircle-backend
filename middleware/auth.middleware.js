require('dotenv').config();
const jwt = require('jsonwebtoken');
const apiResponse = require('../utils/apiResponse');
const { accessSecret } = require('../utils/jwtSecrets');
const { User } = require('../models/postgres');

const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return apiResponse.error(res, 'Not authorized', 401);
    }

    const token = header.slice(7);
    const decoded = jwt.verify(token, accessSecret());

    const user = await User.findByPk(decoded.id);
    if (!user || user.is_banned) {
      return apiResponse.error(res, 'Not authorized', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    return apiResponse.error(res, 'Not authorized', 401);
  }
};

module.exports = authMiddleware;

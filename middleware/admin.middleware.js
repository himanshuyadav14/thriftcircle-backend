const authMiddleware = require('./auth.middleware');
const apiResponse = require('../utils/apiResponse');

const adminMiddleware = async (req, res, next) => {
  return authMiddleware(req, res, () => {
    if (req.user.role !== 'admin') {
      return apiResponse.error(res, 'Admin only', 403);
    }
    next();
  });
};

module.exports = adminMiddleware;

const { validationResult } = require('express-validator');
const apiResponse = require('../utils/apiResponse');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return apiResponse.error(res, 'Validation failed', 422, errors.array());
  }
  next();
};

module.exports = validate;

require('dotenv').config();

const accessSecret = () =>
  process.env.ACCESS_TOKEN_SECRET || 'CHANGE_ME_ACCESS_TOKEN_SECRET_DEV_ONLY';

module.exports = { accessSecret };

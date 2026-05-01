require('dotenv').config();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { accessSecret } = require('./jwtSecrets');
const { RefreshToken } = require('../models/postgres');

const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role, username: user.username }, accessSecret(), {
    expiresIn: ACCESS_EXPIRES,
  });
};

const generateRefreshToken = () => uuidv4();

const saveRefreshToken = async (userId, token) => {
  const expires_at = new Date(Date.now() + REFRESH_EXPIRES_MS);
  await RefreshToken.create({ user_id: userId, token, expires_at });
};

const issueTokens = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  await saveRefreshToken(user.id, refreshToken);
  return { accessToken, refreshToken };
};

const rotateRefreshToken = async (user, oldToken) => {
  await RefreshToken.destroy({ where: { token: oldToken } });
  return issueTokens(user);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  issueTokens,
  rotateRefreshToken,
  ACCESS_EXPIRES,
  REFRESH_EXPIRES_MS,
};

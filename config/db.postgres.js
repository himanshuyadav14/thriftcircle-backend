require('dotenv').config();
const { Sequelize } = require('sequelize');

const uri =
  process.env.POSTGRES_URI ||
  'postgresql://postgres:postgres@127.0.0.1:5432/thriftcircle';

const sequelize = new Sequelize(uri, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

module.exports = sequelize;

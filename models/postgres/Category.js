const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db.postgres');

const Category = sequelize.define(
  'Category',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, unique: true, allowNull: false },
    slug: { type: DataTypes.STRING, unique: true, allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'categories' }
);

module.exports = Category;

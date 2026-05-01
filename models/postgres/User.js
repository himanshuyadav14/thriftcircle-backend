const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db.postgres');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    full_name: { type: DataTypes.STRING(100), allowNull: false },
    username: { type: DataTypes.STRING(30), unique: true, allowNull: false },
    email: { type: DataTypes.STRING(100), unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING(15), allowNull: true },
    avatar_url: { type: DataTypes.STRING, allowNull: true },
    bio: { type: DataTypes.TEXT, allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    state: { type: DataTypes.STRING(100), allowNull: true },
    upi_id: { type: DataTypes.STRING, allowNull: true },
    role: {
      type: DataTypes.ENUM('buyer', 'seller', 'both', 'admin'),
      defaultValue: 'buyer',
      allowNull: false,
    },
    is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_banned: { type: DataTypes.BOOLEAN, defaultValue: false },
    total_sales: { type: DataTypes.INTEGER, defaultValue: 0 },
    total_earnings: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  },
  {
    tableName: 'users',
    defaultScope: { attributes: { exclude: ['password'] } },
    scopes: { withPassword: { attributes: {} } },
  }
);

module.exports = User;

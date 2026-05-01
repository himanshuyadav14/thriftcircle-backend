const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db.postgres');

const RefreshToken = sequelize.define(
  'RefreshToken',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: { type: DataTypes.UUID, allowNull: false },
    token: { type: DataTypes.TEXT, unique: true, allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
  },
  { tableName: 'refresh_tokens', updatedAt: false }
);

module.exports = RefreshToken;

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db.postgres');

const Boost = sequelize.define(
  'Boost',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    listing_id: { type: DataTypes.UUID, allowNull: false },
    seller_id: { type: DataTypes.UUID, allowNull: false },
    tier: {
      type: DataTypes.ENUM('basic', 'featured', 'premium'),
      allowNull: false,
    },
    amount_paid: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    razorpay_payment_id: { type: DataTypes.STRING, allowNull: true },
    starts_at: { type: DataTypes.DATE, allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'boosts', updatedAt: false }
);

module.exports = Boost;

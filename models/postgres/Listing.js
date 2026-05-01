const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db.postgres');

const Listing = sequelize.define(
  'Listing',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    seller_id: { type: DataTypes.UUID, allowNull: false },
    category_id: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    original_price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    size: {
      type: DataTypes.ENUM('XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'),
      allowNull: false,
    },
    condition: {
      type: DataTypes.ENUM('like_new', 'good', 'fair'),
      allowNull: false,
    },
    brand: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    state: { type: DataTypes.STRING(100), allowNull: true },
    status: {
      type: DataTypes.ENUM(
        'draft',
        'under_review',
        'published',
        'rejected',
        'sold'
      ),
      defaultValue: 'draft',
    },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    is_boosted: { type: DataTypes.BOOLEAN, defaultValue: false },
    boost_expires_at: { type: DataTypes.DATE, allowNull: true },
    boost_tier: {
      type: DataTypes.ENUM('basic', 'featured', 'premium'),
      allowNull: true,
    },
    views_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'listings',
    indexes: [{ fields: ['boost_expires_at'] }],
  }
);

module.exports = Listing;

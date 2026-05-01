const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db.postgres');

const Review = sequelize.define(
  'Review',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    order_id: { type: DataTypes.UUID, unique: true, allowNull: false },
    reviewer_id: { type: DataTypes.UUID, allowNull: false },
    seller_id: { type: DataTypes.UUID, allowNull: false },
    rating: { type: DataTypes.INTEGER, allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: 'reviews', updatedAt: false }
);

module.exports = Review;

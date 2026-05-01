const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db.postgres');

const ListingImage = sequelize.define(
  'ListingImage',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    listing_id: { type: DataTypes.UUID, allowNull: false },
    image_url: { type: DataTypes.STRING, allowNull: false },
    public_id: { type: DataTypes.STRING, allowNull: true },
    is_primary: { type: DataTypes.BOOLEAN, defaultValue: false },
    order_index: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { tableName: 'listing_images' }
);

module.exports = ListingImage;

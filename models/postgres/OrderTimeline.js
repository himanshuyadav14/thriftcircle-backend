const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db.postgres');

const OrderTimeline = sequelize.define(
  'OrderTimeline',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    order_id: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.STRING, allowNull: true },
  },
  { tableName: 'order_timelines', updatedAt: false }
);

module.exports = OrderTimeline;

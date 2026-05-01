const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db.postgres');

const Order = sequelize.define(
  'Order',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    listing_id: { type: DataTypes.UUID, allowNull: false },
    buyer_id: { type: DataTypes.UUID, allowNull: false },
    seller_id: { type: DataTypes.UUID, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    platform_commission: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    seller_payout: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'paid',
        'pickup_scheduled',
        'picked_up',
        'shipped',
        'delivered',
        'completed',
        'return_requested',
        'returned',
        'cancelled'
      ),
      defaultValue: 'pending',
    },
    razorpay_order_id: { type: DataTypes.STRING, allowNull: true },
    razorpay_payment_id: { type: DataTypes.STRING, allowNull: true },
    shiprocket_order_id: { type: DataTypes.STRING, allowNull: true },
    shiprocket_shipment_id: { type: DataTypes.STRING, allowNull: true },
    awb_number: { type: DataTypes.STRING, allowNull: true },
    courier_name: { type: DataTypes.STRING, allowNull: true },
    tracking_url: { type: DataTypes.STRING, allowNull: true },
    buyer_address: { type: DataTypes.JSONB, allowNull: false },
    seller_address: { type: DataTypes.JSONB, allowNull: false },
    delivered_at: { type: DataTypes.DATE, allowNull: true },
    payout_scheduled_at: { type: DataTypes.DATE, allowNull: true },
    payout_released_at: { type: DataTypes.DATE, allowNull: true },
    payout_reference: { type: DataTypes.STRING, allowNull: true },
    return_reason: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: 'orders' }
);

module.exports = Order;

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient_id: { type: String, required: true, index: true },
    sender_id: { type: String, default: null },
    sender_username: { type: String, default: null },
    sender_avatar: { type: String, default: null },
    type: {
      type: String,
      enum: [
        'order_placed',
        'order_paid',
        'pickup_scheduled',
        'shipped',
        'delivered',
        'payout_released',
        'listing_approved',
        'listing_rejected',
        'new_message',
        'review_received',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    order_id: { type: String, default: null },
    listing_id: { type: String, default: null },
    is_read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 24 * 60 * 60 }
);

module.exports = mongoose.model('Notification', notificationSchema);

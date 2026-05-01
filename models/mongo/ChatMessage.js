const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    room_id: { type: String, required: true, index: true },
    sender_id: { type: String, required: true },
    receiver_id: { type: String, required: true },
    listing_id: { type: String, required: true },
    message: { type: String, required: true },
    is_read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);

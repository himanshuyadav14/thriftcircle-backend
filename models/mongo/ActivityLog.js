const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true },
    action: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip_address: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);

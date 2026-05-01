const apiResponse = require('../utils/apiResponse');
const Notification = require('../models/mongo/Notification');

const listNotifications = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const page = Number(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const filter = { recipient_id: req.user.id };

    const [rows, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
    ]);

    return apiResponse.paginated(res, rows, total, page, limit);
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient_id: req.user.id, is_read: false },
      { is_read: true }
    );
    return apiResponse.success(res, null, 'Updated');
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const markOneRead = async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient_id: req.user.id },
      { is_read: true },
      { new: true }
    );

    if (!n) return apiResponse.error(res, 'Not found', 404);

    return apiResponse.success(res, { notification: n });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const unreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient_id: req.user.id,
      is_read: false,
    });
    return apiResponse.success(res, { count });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

module.exports = { listNotifications, markAllRead, markOneRead, unreadCount };

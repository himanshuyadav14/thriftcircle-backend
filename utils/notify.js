const Notification = require('../models/mongo/Notification');
const { emitToUser } = require('../socket/socket');

const createNotification = async (doc) => {
  const n = await Notification.create(doc);
  emitToUser(doc.recipient_id, 'notification', n);
  return n;
};

module.exports = { createNotification };

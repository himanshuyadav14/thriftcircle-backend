const apiResponse = require('../utils/apiResponse');
const ChatMessage = require('../models/mongo/ChatMessage');
const { Listing } = require('../models/postgres');
const { roomId } = require('../utils/chatRoom');

const myRooms = async (req, res) => {
  try {
    const uid = req.user.id;

    const rooms = await ChatMessage.aggregate([
      {
        $match: {
          $or: [{ sender_id: uid }, { receiver_id: uid }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: '$room_id',
          lastMessage: { $first: '$$ROOT' },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
    ]);

    return apiResponse.success(res, { rooms });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const roomMessages = async (req, res) => {
  try {
    const { listingId, userId } = req.params;
    const listing = await Listing.findByPk(listingId);
    if (!listing) return apiResponse.error(res, 'Listing not found', 404);

    const sellerId = String(listing.seller_id);
    const otherId = String(userId);

    if (![sellerId, req.user.id].includes(otherId)) {
      return apiResponse.error(res, 'Not allowed', 403);
    }

    let buyerId;
    if (req.user.id === sellerId) {
      buyerId = otherId;
    } else {
      buyerId = req.user.id;
      if (otherId !== sellerId) {
        return apiResponse.error(res, 'Not allowed', 403);
      }
    }

    const rid = roomId(listingId, buyerId);

    const messages = await ChatMessage.find({ room_id: rid }).sort({ createdAt: 1 }).limit(200);

    return apiResponse.success(res, { room_id: rid, messages });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

module.exports = { myRooms, roomMessages };

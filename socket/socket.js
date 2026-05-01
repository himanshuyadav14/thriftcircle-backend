require('dotenv').config();
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { accessSecret } = require('../utils/jwtSecrets');
const ChatMessage = require('../models/mongo/ChatMessage');
const { Listing } = require('../models/postgres');
const { roomId: buildRoomId } = require('../utils/chatRoom');

let ioSingleton = null;

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization &&
          socket.handshake.headers.authorization.replace('Bearer ', ''));
      if (!token) return next(new Error('Not authorized'));

      const decoded = jwt.verify(token, accessSecret());
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('Not authorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = String(socket.userId);
    socket.join(userId);

    if (socket.userRole === 'admin') {
      socket.join('admins');
    }

    socket.on('send_message', async (payload, cb) => {
      try {
        const listingIdStr = payload?.listing_id != null ? String(payload.listing_id) : null;
        const message = payload?.message;
        const receiverIdStr =
          payload?.receiver_id != null ? String(payload.receiver_id) : null;

        if (!listingIdStr || !message || !receiverIdStr) {
          if (typeof cb === 'function')
            cb({ ok: false, error: 'listing_id, receiver_id and message are required' });
          return;
        }

        const listing = await Listing.findByPk(listingIdStr);
        if (!listing) {
          if (typeof cb === 'function') cb({ ok: false, error: 'Listing not found' });
          return;
        }

        const sellerIdStr = String(listing.seller_id);
        let buyerIdStr;

        if (userId === sellerIdStr) {
          if (receiverIdStr === sellerIdStr) {
            if (typeof cb === 'function') cb({ ok: false, error: 'receiver_id cannot be seller' });
            return;
          }
          buyerIdStr = receiverIdStr;
        } else {
          buyerIdStr = userId;
          if (receiverIdStr !== sellerIdStr) {
            if (typeof cb === 'function') cb({ ok: false, error: 'receiver must be the seller id' });
            return;
          }
        }

        if (receiverIdStr === userId) {
          if (typeof cb === 'function') cb({ ok: false, error: 'receiver_id must be the other person' });
          return;
        }

        const room_id = buildRoomId(listingIdStr, buyerIdStr);

        const chat = await ChatMessage.create({
          room_id,
          sender_id: userId,
          receiver_id: receiverIdStr,
          listing_id: listingIdStr,
          message,
          is_read: false,
        });

        io.to(receiverIdStr).emit('new_message', chat);
        io.to(userId).emit('new_message', chat);

        if (typeof cb === 'function') cb({ ok: true, data: chat });
      } catch (e) {
        if (typeof cb === 'function') cb({ ok: false, error: e.message });
      }
    });

    socket.on('mark_read', async (payload, cb) => {
      try {
        const { room_id, sender_id } = payload || {};
        await ChatMessage.updateMany(
          { room_id, sender_id, receiver_id: userId },
          { is_read: true }
        );
        if (typeof cb === 'function') cb({ ok: true });
      } catch (e) {
        if (typeof cb === 'function') cb({ ok: false });
      }
    });
  });

  ioSingleton = io;
  return io;
};

const getIO = () => ioSingleton;

const emitToUser = (userId, event, payload) => {
  if (!ioSingleton) return;
  ioSingleton.to(String(userId)).emit(event, payload);
};

const emitToAdmins = (event, payload) => {
  if (!ioSingleton) return;
  ioSingleton.to('admins').emit(event, payload);
};

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToAdmins,
};

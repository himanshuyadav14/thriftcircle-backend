const express = require('express');
const { param } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const ctrl = require('../controllers/chat.controller');

router.get(
  '/rooms',
  // #swagger.tags = ['Chat']
  // #swagger.summary = My chat rooms (REST). Send messages via Socket.io event send_message
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { rooms: [] } } } } }
  auth,
  ctrl.myRooms
);

router.get(
  '/room/:listingId/:userId',
  // #swagger.tags = ['Chat']
  // #swagger.summary = Messages listing buyer/seller pair
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters[0] = { name: "listingId", in: "path" }
  // #swagger.parameters[1] = { name: "userId", in: "path", description: "Other participant id" }
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { room_id: "listing_uuid_buyer_uuid", messages: [] } } } } }
  auth,
  [param('listingId').isUUID(), param('userId').isUUID()],
  validate,
  ctrl.roomMessages
);

module.exports = router;

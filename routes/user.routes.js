const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const ctrl = require('../controllers/user.controller');
const { uploadSingle, wrapUpload } = require('../middleware/upload.middleware');

router.get(
  '/profile',
  // #swagger.tags = ['Users']
  // #swagger.summary = Current user profile
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters[1] = { name: "Authorization", in: "header", schema: { type: "string", example: "Bearer eyJ..." } }
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { user: {} } } } } }
  auth,
  ctrl.getOwnProfile
);

router.put(
  '/profile',
  // #swagger.tags = ['Users']
  // #swagger.summary = Update profile (multipart optional avatar)
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.consumes = ['multipart/form-data']
  // #swagger.requestBody = { content: { "multipart/form-data": { schema: { type: "object", properties: { full_name: { type: "string" }, bio: { type: "string" }, city: { type: "string" }, state: { type: "string" }, upi_id: { type: "string" }, avatar: { type: "string", format: "binary" } } } } } }
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, message: "Updated", data: { user: {} } } } } }
  auth,
  wrapUpload(uploadSingle),
  [
    body('full_name').optional().trim(),
    body('bio').optional(),
    body('city').optional(),
    body('state').optional(),
    body('upi_id').optional(),
  ],
  validate,
  ctrl.updateProfile
);

router.get(
  '/:username',
  // #swagger.tags = ['Users']
  // #swagger.summary = Public profile by username
  // #swagger.parameters[0] = { name: "username", in: "path", schema: { type: "string", example: "janedoe" } }
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { user: {}, recentListings: [], reviews: [], avgRating: 4.5 } } } } }
  // #swagger.responses[404] = { description: "User not found" }
  [param('username').trim().notEmpty()],
  validate,
  ctrl.getPublicProfile
);

router.get(
  '/:username/listings',
  // #swagger.tags = ['Users']
  // #swagger.summary = Seller published listings (paginated)
  // #swagger.parameters[0] = { name: "username", in: "path" }
  // #swagger.parameters[1] = { name: "page", in: "query", schema: { type: "integer", example: 1 } }
  // #swagger.parameters[2] = { name: "limit", in: "query", schema: { type: "integer", example: 20 } }
  // #swagger.responses[200] = { description: "Paginated", content: { "application/json": { example: { success: true, data: [], pagination: { total: 0, page: 1, limit: 20, pages: 1 } } } } }
  [param('username').trim().notEmpty()],
  validate,
  ctrl.listingsBySeller
);

router.get(
  '/:username/reviews',
  // #swagger.tags = ['Users']
  // #swagger.summary = Reviews received by seller
  // #swagger.parameters[0] = { name: "username", in: "path" }
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { reviews: [], avgRating: null } } } } }
  [param('username').trim().notEmpty()],
  validate,
  ctrl.sellerReviewsList
);

module.exports = router;

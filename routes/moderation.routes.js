const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const admin = require('../middleware/admin.middleware');
const validate = require('../middleware/validate.middleware');
const ctrl = require('../controllers/moderation.controller');

router.get(
  '/queue',
  // #swagger.tags = ['Moderation']
  // #swagger.summary = Listings under_review (admin)
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters = [{ name: "page", in: "query" }, { name: "limit", in: "query" }]
  // #swagger.responses[200] = { description: "Paginated queue" }
  // #swagger.responses[403] = { description: "Admin only" }
  admin,
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt()],
  validate,
  ctrl.moderationQueue
);

router.post(
  '/:listingId/approve',
  // #swagger.tags = ['Moderation']
  // #swagger.summary = Approve listing
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters[0] = { name: "listingId", in: "path" }
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { listing: {} } } } } }
  admin,
  [param('listingId').isUUID()],
  validate,
  ctrl.approve
);

router.post(
  '/:listingId/reject',
  // #swagger.tags = ['Moderation']
  // #swagger.summary = Reject listing with reason
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters[0] = { name: "listingId", in: "path" }
  // #swagger.requestBody = { content: { "application/json": { example: { reason: "Does not meet guidelines" } } } }
  // #swagger.responses[200] = { description: "OK" }
  admin,
  [param('listingId').isUUID(), body('reason').optional().trim()],
  validate,
  ctrl.reject
);

router.get(
  '/stats',
  // #swagger.tags = ['Moderation']
  // #swagger.summary = Pending / approved today / rejected today
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { pending: 2, approvedToday: 10, rejectedToday: 1 } } } } }
  admin,
  ctrl.stats
);

module.exports = router;

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/boost.controller');
const auth = require('../middleware/auth.middleware');
const { param } = require('express-validator');
const validate = require('../middleware/validate.middleware');

router.get(
  '/plans',
  // #swagger.tags = ['Boost']
  // #swagger.summary = Boost tier pricing and durations
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { plans: [] } } } } }
  ctrl.plans
);

router.get(
  '/active/:listingId',
  // #swagger.tags = ['Boost']
  // #swagger.summary = Check active boost for a listing
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters[0] = { name: "listingId", in: "path" }
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { active: true, boost_tier: "premium", boost_expires_at: "2026-12-01T00:00:00.000Z" } } } } }
  auth,
  [param('listingId').isUUID()],
  validate,
  ctrl.activeBoost
);

module.exports = router;

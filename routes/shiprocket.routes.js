const express = require('express');
const { param } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const ctrl = require('../controllers/shiprocket.controller');

router.get(
  '/order/:id/tracking',
  // #swagger.tags = ['Shiprocket']
  // #swagger.summary = Fetch Shiprocket tracking for order AWB (buyer or seller)
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters[0] = { name: "id", in: "path", description: "Order UUID" }
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { tracking: {} } } } } }
  auth,
  [param('id').isUUID()],
  validate,
  ctrl.refreshTracking
);

module.exports = router;

const express = require('express');
const { param, query } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const ctrl = require('../controllers/notification.controller');

router.put(
  '/read-all',
  // #swagger.tags = ['Notifications']
  // #swagger.summary = Mark all notifications read
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.responses[200] = { description: "OK" }
  auth,
  ctrl.markAllRead
);

router.get(
  '/unread-count',
  // #swagger.tags = ['Notifications']
  // #swagger.summary = Unread count
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { count: 3 } } } } }
  auth,
  ctrl.unreadCount
);

router.get(
  '/',
  // #swagger.tags = ['Notifications']
  // #swagger.summary = Paginated notifications
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters = [{ name: "page", in: "query" }, { name: "limit", in: "query" }]
  // #swagger.responses[200] = { description: "Paginated" }
  auth,
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 50 })],
  validate,
  ctrl.listNotifications
);

router.put(
  '/:id/read',
  // #swagger.tags = ['Notifications']
  // #swagger.summary = Mark one read (Mongo _id)
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters[0] = { name: "id", in: "path" }
  // #swagger.responses[200] = { description: "OK" }
  auth,
  [param('id').notEmpty()],
  validate,
  ctrl.markOneRead
);

module.exports = router;

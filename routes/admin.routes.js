const express = require('express');
const { query, param } = require('express-validator');
const router = express.Router();
const admin = require('../middleware/admin.middleware');
const validate = require('../middleware/validate.middleware');
const ctrl = require('../controllers/admin.controller');

router.get(
  '/dashboard',
  // #swagger.tags = ['Admin']
  // #swagger.summary = Platform counts + commission sum
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { users: 100, listings: 200, orders: 50, pendingModeration: 3, revenueCommission: 12000 } } } } }
  admin,
  ctrl.dashboard
);

router.get(
  '/stats',
  // #swagger.tags = ['Admin']
  // #swagger.summary = Same counters as dashboard (snake_case + aliases for SPA)
  // #swagger.security = [{ bearerAuth: [] }]
  admin,
  ctrl.stats
);

router.get(
  '/users',
  // #swagger.tags = ['Admin']
  // #swagger.summary = Paginated users + search
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters = [{ name: "page", in: "query" }, { name: "limit", in: "query" }, { name: "search", in: "query" }]
  // #swagger.responses[200] = { description: "Paginated" }
  admin,
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt(), query('search').optional()],
  validate,
  ctrl.listUsers
);

router.put(
  '/users/:id/ban',
  // #swagger.tags = ['Admin']
  // #swagger.summary = Ban user
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters[0] = { name: "id", in: "path" }
  // #swagger.responses[200] = { description: "OK" }
  admin,
  [param('id').isUUID()],
  validate,
  ctrl.banUser
);

router.get(
  '/orders',
  // #swagger.tags = ['Admin']
  // #swagger.summary = All orders filtered
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters = [{ name: "page", in: "query" }, { name: "limit" }, { name: "status" }, { name: "from" }, { name: "to" }]
  // #swagger.responses[200] = { description: "Paginated" }
  admin,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt(),
    query('status').optional(),
    query('from').optional(),
    query('to').optional(),
  ],
  validate,
  ctrl.listOrders
);

router.get(
  '/revenue',
  // #swagger.tags = ['Admin']
  // #swagger.summary = Commission earned + queued payout estimate
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { totalCommissionEarned: 50000, pendingSellerPayoutsApprox: 2000 } } } } }
  admin,
  ctrl.revenue
);

router.post(
  '/orders/:id/force-complete',
  // #swagger.tags = ['Admin']
  // #swagger.summary = Force-complete order manually
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters[0] = { name: "id", in: "path" }
  // #swagger.responses[200] = { description: "OK" }
  admin,
  [param('id').isUUID()],
  validate,
  ctrl.forceComplete
);

router.get(
  '/listings',
  // #swagger.tags = ['Admin']
  // #swagger.summary = Browse all listings incl. drafts
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters = [{ name: "page", in: "query" }, { name: "limit" }, { name: "status", in: "query" }]
  // #swagger.responses[200] = { description: "Paginated" }
  admin,
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt(), query('status').optional()],
  validate,
  ctrl.listListingsAdmin
);

module.exports = router;

const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const ctrl = require('../controllers/review.controller');

router.post(
  '/',
  // #swagger.tags = ['Reviews']
  // #swagger.summary = Create review (completed order, one per order)
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.requestBody = { required: true, content: { "application/json": { example: { order_id: "order-uuid", rating: 5, comment: "Great seller" } } } }
  // #swagger.responses[201] = { description: "Created" }
  auth,
  [
    body('order_id').isUUID(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().trim(),
  ],
  validate,
  ctrl.createReview
);

router.get(
  '/seller/:userId',
  // #swagger.tags = ['Reviews']
  // #swagger.summary = All reviews for seller
  // #swagger.parameters[0] = { name: "userId", in: "path" }
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { reviews: [], avgRating: 4.8 } } } } }
  [param('userId').isUUID()],
  validate,
  ctrl.sellerReviews
);

module.exports = router;

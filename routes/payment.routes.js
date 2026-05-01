const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const ctrl = require('../controllers/payment.controller');
const { paymentLimiter } = require('../middleware/rateLimiter');

const tiers = ['basic', 'featured', 'premium'];

router.post(
  '/boost',
  // #swagger.tags = ['Payment']
  // #swagger.summary = Create Razorpay order for listing boost (INR tiers 29/59/99)
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.requestBody = { required: true, content: { "application/json": { example: { listing_id: "uuid", tier: "featured" } } } }
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { razorpay_order_id: "order_...", amount_inr: 59, tier: "featured" } } } } }
  auth,
  paymentLimiter,
  [body('listing_id').isUUID(), body('tier').isIn(tiers)],
  validate,
  ctrl.createBoostPayment
);

router.post(
  '/boost/verify',
  // #swagger.tags = ['Payment']
  // #swagger.summary = Verify Razorpay payment and activate boost
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.requestBody = { content: { "application/json": { example: { listing_id: "uuid", tier: "featured", razorpay_order_id: "", razorpay_payment_id: "", razorpay_signature: "" } } } }
  // #swagger.responses[200] = { description: "OK" }
  auth,
  paymentLimiter,
  [
    body('listing_id').isUUID(),
    body('tier').isIn(tiers),
    body('razorpay_order_id').notEmpty(),
    body('razorpay_payment_id').notEmpty(),
    body('razorpay_signature').notEmpty(),
  ],
  validate,
  ctrl.verifyBoostPayment
);

module.exports = router;

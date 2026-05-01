const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const ctrl = require('../controllers/order.controller');
const { paymentLimiter } = require('../middleware/rateLimiter');

router.post(
  '/',
  // #swagger.tags = ['Orders']
  // #swagger.summary = Start order — returns Razorpay order id + amount_inr
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.requestBody = { required: true, content: { "application/json": { example: { listing_id: "listing-uuid", delivery_address: { name: "John", phone: "9876543210", address: "12 MG Road", city: "Bengaluru", state: "KA", pincode: "560001" } } } } }
  // #swagger.responses[201] = { description: "Created", content: { "application/json": { example: { success: true, data: { razorpay_order_id: "order_xxx", amount_inr: 999, razorpayKeyId: "rzp_..." } } } } }
  auth,
  [
    body('listing_id').isUUID(),
    body('delivery_address.name').trim().notEmpty(),
    body('delivery_address.phone').trim().notEmpty(),
    body('delivery_address.address').trim().notEmpty(),
    body('delivery_address.city').trim().notEmpty(),
    body('delivery_address.state').trim().notEmpty(),
    body('delivery_address.pincode').trim().notEmpty(),
  ],
  validate,
  ctrl.createOrder
);

router.post(
  '/verify-payment',
  // #swagger.tags = ['Orders']
  // #swagger.summary = Verify Razorpay signature and mark paid + ship flow
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.requestBody = { content: { "application/json": { example: { razorpay_order_id: "order_xxx", razorpay_payment_id: "pay_xxx", razorpay_signature: "hex" } } } }
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { order: {} } } } } }
  auth,
  paymentLimiter,
  [
    body('razorpay_order_id').notEmpty(),
    body('razorpay_payment_id').notEmpty(),
    body('razorpay_signature').notEmpty(),
  ],
  validate,
  ctrl.verifyPayment
);

router.get(
  '/',
  // #swagger.tags = ['Orders']
  // #swagger.summary = Orders where I am buyer or seller
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { orders: [] } } } } }
  auth,
  ctrl.listOrders
);

router.get(
  '/:id',
  // #swagger.tags = ['Orders']
  // #swagger.summary = Order detail with timeline
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters[0] = { name: "id", in: "path" }
  // #swagger.responses[200] = { description: "OK" }
  auth,
  [param('id').isUUID()],
  validate,
  ctrl.orderDetail
);

router.post(
  '/:id/return',
  // #swagger.tags = ['Orders']
  // #swagger.summary = Buyer return request (within 3 days of delivered)
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters[0] = { name: "id", in: "path" }
  // #swagger.requestBody = { required: true, content: { "application/json": { example: { reason: "Size mismatch" } } } }
  // #swagger.responses[200] = { description: "OK" }
  auth,
  [param('id').isUUID(), body('reason').trim().notEmpty()],
  validate,
  ctrl.requestReturn
);

module.exports = router;

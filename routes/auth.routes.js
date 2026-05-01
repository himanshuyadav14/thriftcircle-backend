const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const { authLimiter } = require('../middleware/rateLimiter');
const { uploadSingle, wrapUpload } = require('../middleware/upload.middleware');

router.post(
  '/register', // #swagger.tags = ['Auth']
  // #swagger.summary = Register (multipart: fields + optional avatar file)
  // #swagger.consumes = ['multipart/form-data']
  // #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { type: "object", required: ["email", "password", "phone"], properties: { email: { type: "string", example: "jane@mail.com" }, password: { type: "string", example: "Password123" }, phone: { type: "string", example: "9876543210" }, full_name: { type: "string" }, username: { type: "string" }, city: { type: "string" }, state: { type: "string" }, avatar: { type: "string", format: "binary" } } } } } }
  // #swagger.responses[201] = { description: "Created", content: { "application/json": { example: { success: true, message: "Registered", data: { accessToken: "eyJ...", refreshToken: "uuid" } } } } }
  // #swagger.responses[422] = { description: "Validation failed", content: { "application/json": { example: { success: false, message: "Validation failed", errors: [] } } } }
  authLimiter,
  wrapUpload(uploadSingle),
  [
    body('full_name')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ min: 2, max: 100 }),
    body('username')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ min: 3, max: 30 }),
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('phone')
      .trim()
      .notEmpty()
      .custom((value) => {
        const digits = String(value || '').replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
      }),
    body('city').optional({ nullable: true }),
    body('state').optional({ nullable: true }),
  ],
  validate,
  ctrl.register
);

router.post(
  '/login', // #swagger.tags = ['Auth']
  // #swagger.summary = Login — send email OR username plus password
  // #swagger.requestBody = { required: true, content: { "application/json": { example: { email: "jane@mail.com", password: "Password123" } } } }
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { accessToken: "eyJ...", refreshToken: "uuid" } } } } }
  // #swagger.responses[401] = { description: "Invalid credentials" }
  authLimiter,
  [
    body('password').notEmpty(),
    body().custom((_, { req }) => {
      if (!req.body.email && !req.body.username) {
        throw new Error('Send email or username');
      }
      return true;
    }),
  ],
  validate,
  ctrl.login
);

router.post(
  '/refresh', // #swagger.tags = ['Auth']
  // #swagger.summary = Rotate refresh token
  // #swagger.requestBody = { content: { "application/json": { example: { refreshToken: "your-refresh-token" } } } }
  // #swagger.responses[200] = { description: "OK" }
  authLimiter,
  [body('refreshToken').notEmpty()],
  validate,
  ctrl.refresh
);

router.post(
  '/logout', // #swagger.tags = ['Auth']
  // #swagger.summary = Logout — Authorization Bearer access token required
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters[1] = { name: "Authorization", in: "header", required: true, schema: { type: "string", example: "Bearer eyJ..." } }
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, message: "Logged out" } } } }
  require('../middleware/auth.middleware'),
  ctrl.logout
);

module.exports = router;

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const ctrl = require('../controllers/listing.controller');
const { uploadMultiple, wrapUpload } = require('../middleware/upload.middleware');

const sizeEnums = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

const conditionEnums = ['like_new', 'good', 'fair'];

router.post(
  '/',
  // #swagger.tags = ['Listings']
  // #swagger.summary = Create listing — status under_review, 2–5 images
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.consumes = ['multipart/form-data']
  // #swagger.requestBody = { required: true, content: { "multipart/form-data": { schema: { type: "object", properties: { title: { example: "Denim jacket" }, description: { type: "string" }, price: { type: "number", example: 1299 }, original_price: { type: "number" }, category_id: { type: "integer", example: 1 }, size: { type: "string", example: "L" }, condition: { type: "string", example: "good" }, brand: { type: "string" }, city: { type: "string" }, state: { type: "string" }, images: { type: "array", items: { type: "string", format: "binary" } } }, required: ["title", "description", "price", "category_id", "size", "condition", "images"] } } } }
  // #swagger.responses[201] = { description: "Created", content: { "application/json": { example: { success: true, message: "Submitted for review", data: { listing: {} } } } } }
  auth,
  wrapUpload(uploadMultiple),
  [
    body('title').trim().isLength({ min: 3, max: 100 }),
    body('description').trim().notEmpty(),
    body('price').isFloat({ min: 1 }),
    body('original_price').optional().isFloat({ min: 0 }),
    body('category_id').isInt(),
    body('size').isIn(sizeEnums),
    body('condition').isIn(conditionEnums),
    body('brand').optional(),
    body('city').optional(),
    body('state').optional(),
  ],
  validate,
  ctrl.createListing
);

router.get(
  '/',
  // #swagger.tags = ['Listings']
  // #swagger.summary = Public feed (premium/featured boosted first)
  // #swagger.parameters = [{ name: "page", in: "query" }, { name: "limit", in: "query" }, { name: "category_id", in: "query" }, { name: "size", in: "query" }, { name: "condition", in: "query" }, { name: "city", in: "query" }, { name: "min_price", in: "query" }, { name: "max_price", in: "query" }, { name: "search", in: "query" }]
  // #swagger.responses[200] = { description: "Paginated listings", content: { "application/json": { example: { success: true, data: [], pagination: {} } } } }
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category_id').optional().isInt(),
    query('size').optional(),
    query('condition').optional(),
    query('city').optional(),
    query('search').optional(),
  ],
  validate,
  ctrl.getFeed
);

router.get(
  '/my/listings',
  // #swagger.tags = ['Listings']
  // #swagger.summary = My listings (all statuses)
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { listings: [] } } } } }
  auth,
  ctrl.myListings
);

router.get(
  '/category/:slug',
  // #swagger.tags = ['Listings']
  // #swagger.summary = Listings by category slug
  // #swagger.parameters[0] = { name: "slug", in: "path", example: "shirts" }
  // #swagger.parameters[1] = { name: "page", in: "query" }
  // #swagger.parameters[2] = { name: "limit", in: "query" }
  // #swagger.responses[200] = { description: "Paginated" }
  [param('slug').notEmpty()],
  validate,
  ctrl.byCategorySlug
);

router.get(
  '/:id',
  // #swagger.tags = ['Listings']
  // #swagger.summary = Single listing (increments views)
  // #swagger.parameters[0] = { name: "id", in: "path", schema: { type: "string", format: "uuid" } }
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { listing: {} } } } } }
  // #swagger.responses[404] = { description: "Listing not found" }
  [param('id').isUUID()],
  validate,
  ctrl.getListing
);

router.put(
  '/:id',
  // #swagger.tags = ['Listings']
  // #swagger.summary = Update draft or rejected listing
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters[0] = { name: "id", in: "path" }
  // #swagger.requestBody = { content: { "application/json": { example: { title: "New title", price: 999 } } } }
  // #swagger.responses[200] = { description: "OK" }
  auth,
  [
    param('id').isUUID(),
    body('title').optional().trim(),
    body('description').optional().trim(),
    body('price').optional().isFloat({ min: 1 }),
    body('original_price').optional().isFloat({ min: 0 }),
    body('category_id').optional().isInt(),
    body('size').optional().isIn(sizeEnums),
    body('condition').optional().isIn(conditionEnums),
    body('brand').optional(),
    body('city').optional(),
    body('state').optional(),
  ],
  validate,
  ctrl.updateListing
);

router.delete(
  '/:id',
  // #swagger.tags = ['Listings']
  // #swagger.summary = Delete listing (not if sold)
  // #swagger.security = [{ bearerAuth: [] }]
  // #swagger.parameters[0] = { name: "id", in: "path" }
  // #swagger.responses[200] = { description: "Deleted" }
  auth,
  [param('id').isUUID()],
  validate,
  ctrl.deleteListing
);

module.exports = router;

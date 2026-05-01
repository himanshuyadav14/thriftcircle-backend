const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/category.controller');

router.get(
  '/',
  // #swagger.tags = ['Meta']
  // #swagger.summary = Public — list listing categories for forms and filters
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { success: true, data: { categories: [{ id: 1, name: "Shirts", slug: "shirts" }] } } } } }
  ctrl.list
);

module.exports = router;

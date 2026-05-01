require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const apiResponse = require("./utils/apiResponse");
const paymentController = require("./controllers/payment.controller");
const { generalLimiter } = require("./middleware/rateLimiter");

const rawParser = express.raw({ type: "*/*", limit: "2mb" });

const authRoutes = require("./routes/auth.routes");
const categoryRoutes = require("./routes/category.routes");
const userRoutes = require("./routes/user.routes");
const listingRoutes = require("./routes/listing.routes");
const moderationRoutes = require("./routes/moderation.routes");
const orderRoutes = require("./routes/order.routes");
const paymentRoutes = require("./routes/payment.routes");
const boostRoutes = require("./routes/boost.routes");
const chatRoutes = require("./routes/chat.routes");
const reviewRoutes = require("./routes/review.routes");
const notificationRoutes = require("./routes/notification.routes");
const adminRoutes = require("./routes/admin.routes");
const shiprocketRoutes = require("./routes/shiprocket.routes");

const app = express();

const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger-output.json");

const corsOrigins = () => {
  const raw = "*";
  if (!raw || String(raw).trim() === "*") return true;
  const parts = String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return true;
  return parts.length === 1 ? parts[0] : parts;
};

const corsOpts = {
  origin: corsOrigins(),
  credentials: true,
};

// Swagger UI needs CSP off (Helmet defaults block inline scripts/styles)
const helmetOpts =
  process.env.NODE_ENV === "production"
    ? { crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }
    : { contentSecurityPolicy: false };

app.use(cors(corsOpts));
app.use(helmet(helmetOpts));
app.use(generalLimiter);

app.use(morgan("dev"));

app.post(
  "/api/payment/webhook/razorpay",
  // #swagger.tags = ['Webhooks']
  // #swagger.summary = Razorpay raw JSON webhook — sign with RAZORPAY_WEBHOOK_SECRET
  // #swagger.parameters[1] = { name: "X-Razorpay-Signature", in: "header", schema: { type: "string" } }
  // #swagger.requestBody = { content: { "application/json": { example: { event: "payment.captured", payload: { payment: { entity: { order_id: "order_xxx" } } } } } } }
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { ok: true } } } }
  rawParser,
  paymentController.handleRazorpayWebhook,
);

app.post(
  "/api/payment/webhook/shiprocket",
  // #swagger.tags = ['Webhooks']
  // #swagger.summary = Shiprocket webhook — configure SHIPROCKET_WEBHOOK_SECRET in prod
  // #swagger.parameters[1] = { name: "X-Webhook-Signature", in: "header", schema: { type: "string" } }
  // #swagger.requestBody = { content: { "application/json": { example: { order_id: 123456, awb_code: "AWB123", current_status: "Delivered" } } } }
  // #swagger.responses[200] = { description: "OK" }
  rawParser,
  paymentController.handleShiprocketWebhook,
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, { customSiteTitle: "ThriftCircle API" }),
);
app.get("/api-docs.json", (_, res) => res.json(swaggerDocument));

app.get(
  "/health",
  // #swagger.tags = ['Health']
  // #swagger.summary = Liveness probe
  // #swagger.responses[200] = { description: "OK", content: { "application/json": { example: { ok: true } } } }
  (_, res) => res.json({ ok: true }),
);

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/moderation", moderationRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/boost", boostRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/shiprocket", shiprocketRoutes);

app.use((req, res) => apiResponse.error(res, "Not found", 404));

app.use((err, req, res, next) => {
  console.error(err);
  return apiResponse.error(res, "Something went wrong", 500);
});

module.exports = app;

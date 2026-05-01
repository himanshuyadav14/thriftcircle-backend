require('dotenv').config();
const fs = require('fs');
const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' });

const outputFile = './swagger-output.json';
/* Routes first (carry #swagger from route callbacks); app.js last for prefixes + webhooks */
const endpointsFiles = [
  './routes/auth.routes.js',
  './routes/user.routes.js',
  './routes/listing.routes.js',
  './routes/moderation.routes.js',
  './routes/order.routes.js',
  './routes/payment.routes.js',
  './routes/boost.routes.js',
  './routes/chat.routes.js',
  './routes/review.routes.js',
  './routes/notification.routes.js',
  './routes/admin.routes.js',
  './routes/shiprocket.routes.js',
  './app.js',
];

const doc = {
  openapi: '3.0.0',
  info: {
    title: 'ThriftCircle API',
    version: '1.0.0',
    description:
      'Second-hand clothing marketplace backend — JWT auth, listings, Razorpay, Shiprocket, Socket.io.',
  },
  servers: [
    { url: `http://localhost:${process.env.PORT || 5001}`, description: 'Local development' },
    { url: '/', description: 'Same origin (deployed)' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Access token from POST /api/auth/register or POST /api/auth/login — header: Authorization: Bearer <token>',
      },
    },
  },
  tags: [
    { name: 'Health', description: 'Service health check' },
    { name: 'Webhooks', description: 'Third-party webhook callbacks (signature verification)' },
    { name: 'Auth', description: 'Register, login, tokens' },
    { name: 'Users', description: 'Profiles and public seller pages' },
    { name: 'Listings', description: 'Listings CRUD and feed' },
    { name: 'Moderation', description: 'Admin listing review queue' },
    { name: 'Orders', description: 'Buyer orders and payments' },
    { name: 'Payment', description: 'Boost payments and gateways' },
    { name: 'Boost', description: 'Boost plans and listing boost status' },
    { name: 'Chat', description: 'Chat room listing (REST); messages via Socket.io' },
    { name: 'Reviews', description: 'Buyer reviews after order completed' },
    { name: 'Notifications', description: 'MongoDB notifications inbox' },
    { name: 'Admin', description: 'Platform admin dashboard and tools' },
    { name: 'Shiprocket', description: 'Courier tracking helper' },
  ],
};

function prunePaths(spec) {
  const next = {};
  for (const [key, methods] of Object.entries(spec.paths || {})) {
    if (
      key === '/health' ||
      ((key.startsWith('/api') || key.startsWith('/health')) &&
        !key.startsWith('/api-docs'))
    ) {
      next[key] = methods;
    }
  }
  spec.paths = next;
}

swaggerAutogen(outputFile, endpointsFiles, doc)
  .then(() => {
    try {
      const raw = fs.readFileSync(outputFile, 'utf8');
      const spec = JSON.parse(raw);
      prunePaths(spec);
      fs.writeFileSync(outputFile, JSON.stringify(spec, null, 2));
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
    console.log('Swagger spec written:', outputFile);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

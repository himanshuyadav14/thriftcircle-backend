# ThriftCircle Backend

REST API for **ThriftCircle** — a second-hand clothing marketplace: JWT auth, listings and moderation, Razorpay payments, Shiprocket shipping, Cloudinary uploads, Socket.io (chat + notifications), and a daily cron job for seller payouts.

**Stack:** Node.js 18+, Express, PostgreSQL (Sequelize), MongoDB (Mongoose), Socket.io.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer  
- [PostgreSQL](https://www.postgresql.org/) — create a database (e.g. `createdb thriftcircle`)  
- [MongoDB](https://www.mongodb.com/) running locally or connection string to Atlas  

## Quick start

1. **Environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env`: set `POSTGRES_URI`, `MONGO_URI`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, and any keys you need (Cloudinary, Razorpay, Shiprocket, Gmail). Defaults in `config/db.*` only help local boot — use real values in production.

2. **Install and run**

   ```bash
   npm install
   npm run dev
   ```

   Default URL: `http://localhost:5001` (override with `PORT` in `.env`).

| Script        | Purpose                                      |
|---------------|----------------------------------------------|
| `npm run dev` | Start API with `--watch` (auto-restart)      |
| `npm start`   | Production-style start (`node server.js`)  |
| `npm run swagger` | Regenerate `swagger-output.json` from routes |

On first boot the app syncs Postgres models, seeds categories, and creates a default **admin** if `ADMIN_EMAIL` / `ADMIN_PASSWORD` are set in `.env`.

## API base URL

- REST: `http://localhost:<PORT>/api` (default port **5001**).  
- Health: `GET /health`

Main route prefixes: `/api/auth`, `/api/users`, `/api/listings`, `/api/moderation`, `/api/orders`, `/api/payment`, `/api/boost`, `/api/chat`, `/api/reviews`, `/api/notifications`, `/api/admin`, `/api/shiprocket`.

## API documentation & Postman

- **Swagger UI:** `http://localhost:5001/api-docs` (adjust host/port if yours differs). Click **Authorize** and use `Bearer <accessToken>` for protected endpoints.
- **OpenAPI JSON:** `http://localhost:5001/api-docs.json`

**Import into Postman:** **Import → Link →** paste `/api-docs.json` URL → choose **Postman Collection** → **Import**. Optionally add an environment variable `baseUrl` = `http://localhost:5001`.

**Multipart endpoints:** `POST /api/auth/register` and listing create expect **form-data** (not raw JSON): text fields plus files (`avatar`, `images`). Using JSON will produce validation errors (422).

After changing routes or `// #swagger.*` hints in route files:

```bash
npm run swagger
```

## Socket.io

Connect with JWT in the handshake:

```javascript
socket.io(url, { auth: { token: '<accessToken>' } })
```

Per-user rooms use the user id; admins join `admins`. Useful events include `notification`, `order_update`, `new_message`, `listing_moderated`, plus chat: `send_message`, `mark_read`.

## Integration notes

- **Razorpay:** Payments need `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`. Payouts (RazorPayX-style) may need `RAZORPAYX_ACCOUNT_NUMBER` and correct dashboard setup.  
- **Webhooks:** In production expose HTTPS URLs pointing to `/api/payment/webhook/razorpay` and `/api/payment/webhook/shiprocket`, and set `RAZORPAY_WEBHOOK_SECRET` / `SHIPROCKET_WEBHOOK_SECRET` so signatures can be verified.  
- **CORS:** Controlled by `FRONTEND_URL` in `.env`.

## Troubleshooting

- **`database "thriftcircle" does not exist`** — Create the Postgres database (`createdb thriftcircle` or `CREATE DATABASE thriftcircle;`) or point `POSTGRES_URI` at an existing DB.  
- **Port 5000 busy on macOS** — Apple's AirPlay Receiver often uses TCP 5000. This project defaults to **5001** in `server.js` and `.env.example`; set `PORT` in `.env` if needed.

## Project layout

| Folder / file   | Role |
|-----------------|------|
| `config/`       | Postgres, Mongo, Cloudinary |
| `models/`       | Sequelize + Mongoose models |
| `controllers/`  | Route handlers |
| `routes/`       | Express routers + Swagger hints |
| `middleware/`   | Auth, admin, upload, validation, rate limits |
| `services/`     | Razorpay, Shiprocket, Cloudinary, email |
| `socket/`       | Socket.io server |
| `jobs/`         | Payout cron |
| `utils/`        | Helpers, JWT, seed categories |
| `swagger-autogen.js` | Regenerates OpenAPI spec |
| `swagger-output.json` | Generated OpenAPI (commit after `npm run swagger`) |

---

License: see `package.json` (`ISC`).

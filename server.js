require("dotenv").config();
const http = require("http");
const bcrypt = require("bcryptjs");
const app = require("./app");
const sequelize = require("./config/db.postgres");
const { connectMongo } = require("./config/db.mongo");
require("./models/postgres"); /* associations loaded */
const { User } = require("./models/postgres");
const seedCategories = require("./utils/seedCategories");
const { initSocket } = require("./socket/socket");
const { startPayoutCron } = require("./jobs/payoutJob");

const PORT = process.env.PORT || 5001;

const ensureAdminUser = async () => {
  const email = process.env.ADMIN_EMAIL;
  const plain = process.env.ADMIN_PASSWORD || "Admin@123";

  if (!email) return;

  const existing = await User.findOne({ where: { email } });
  if (existing) return;

  const hash = await bcrypt.hash(plain, 10);
  await User.create({
    full_name: "Admin",
    username: `thrift_admin_${Date.now()}`,
    email,
    password: hash,
    role: "admin",
    is_verified: true,
  });
  console.log("Default admin created:", email);
};

(async () => {
  try {
    await sequelize.authenticate();

    await sequelize.sync();

    await connectMongo();
    console.log("Mongo connected");

    await seedCategories();

    await ensureAdminUser();

    const server = http.createServer(app);
    initSocket(server);

    startPayoutCron();

    server.listen(PORT, () => {
      console.log(`ThriftCircle API on port ${PORT}`);
    });
  } catch (e) {
    console.error("Startup failed", e);
    process.exit(1);
  }
})();

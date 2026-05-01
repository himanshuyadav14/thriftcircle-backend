require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const sequelize = require('../config/db.postgres');
require('../models/postgres');
const {
  Review,
  OrderTimeline,
  Order,
  Boost,
  ListingImage,
  Listing,
  RefreshToken,
  User,
} = require('../models/postgres');

async function main() {
  await sequelize.authenticate();

  await Review.destroy({ where: {} });
  await OrderTimeline.destroy({ where: {} });
  await Order.destroy({ where: {} });
  await Boost.destroy({ where: {} });
  await ListingImage.destroy({ where: {} });
  await Listing.destroy({ where: {} });
  await RefreshToken.destroy({ where: {} });
  await User.destroy({ where: {} });

  console.log('✓ Database cleared successfully!');

  await sequelize.close();
}

main().catch(async (e) => {
  console.error(e);
  await sequelize.close();
  process.exit(1);
});

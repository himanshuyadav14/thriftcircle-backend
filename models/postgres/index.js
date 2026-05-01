const User = require('./User');
const Category = require('./Category');
const Listing = require('./Listing');
const ListingImage = require('./ListingImage');
const Order = require('./Order');
const OrderTimeline = require('./OrderTimeline');
const Review = require('./Review');
const Boost = require('./Boost');
const RefreshToken = require('./RefreshToken');

User.hasMany(Listing, { foreignKey: 'seller_id', as: 'listings' });
Listing.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

Category.hasMany(Listing, { foreignKey: 'category_id' });
Listing.belongsTo(Category, { foreignKey: 'category_id' });

Listing.hasMany(ListingImage, { foreignKey: 'listing_id', as: 'images' });
ListingImage.belongsTo(Listing, { foreignKey: 'listing_id' });

User.hasMany(Order, { foreignKey: 'buyer_id', as: 'buyerOrders' });
User.hasMany(Order, { foreignKey: 'seller_id', as: 'sellerOrders' });
Order.belongsTo(User, { foreignKey: 'buyer_id', as: 'buyer' });
Order.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

Listing.hasMany(Order, { foreignKey: 'listing_id' });
Order.belongsTo(Listing, { foreignKey: 'listing_id', as: 'listing' });

Order.hasMany(OrderTimeline, { foreignKey: 'order_id', as: 'timeline' });
OrderTimeline.belongsTo(Order, { foreignKey: 'order_id' });

Order.hasOne(Review, { foreignKey: 'order_id' });
Review.belongsTo(Order, { foreignKey: 'order_id' });
Review.belongsTo(User, { foreignKey: 'reviewer_id', as: 'reviewer' });
Review.belongsTo(User, { foreignKey: 'seller_id', as: 'reviewSeller' });

User.hasMany(Review, { foreignKey: 'reviewer_id', as: 'reviewsWritten' });
User.hasMany(Review, { foreignKey: 'seller_id', as: 'reviewsReceived' });

User.hasMany(Boost, { foreignKey: 'seller_id', as: 'boosts' });
Boost.belongsTo(User, { foreignKey: 'seller_id', as: 'boostSeller' });
Boost.belongsTo(Listing, { foreignKey: 'listing_id' });

User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  User,
  Category,
  Listing,
  ListingImage,
  Order,
  OrderTimeline,
  Review,
  Boost,
  RefreshToken,
};

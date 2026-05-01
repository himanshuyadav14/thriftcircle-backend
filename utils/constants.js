/** Boost pricing (INR) and duration map */
const BOOST_TIERS = {
  basic: { price: 29, days: 3 },
  featured: { price: 59, days: 7 },
  premium: { price: 99, days: 15 },
};

const BOOST_PLANS = Object.entries(BOOST_TIERS).map(([key, v]) => ({
  tier: key,
  price_inr: v.price,
  duration_days: v.days,
}));

module.exports = { BOOST_TIERS, BOOST_PLANS };

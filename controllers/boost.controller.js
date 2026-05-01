const apiResponse = require('../utils/apiResponse');
const { Listing } = require('../models/postgres');
const { BOOST_PLANS } = require('../utils/constants');

const plans = async (req, res) => {
  return apiResponse.success(res, {
    plans: BOOST_PLANS.map((p) => ({
      ...p,
      benefits:
        p.tier === 'basic'
          ? ['3 days boost', 'More visibility']
          : p.tier === 'featured'
            ? ['7 days boost', 'Better placement']
            : ['15 days boost', 'Top placement'],
    })),
  });
};

const activeBoost = async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.listingId);
    if (!listing) return apiResponse.error(res, 'Listing not found', 404);

    const now = new Date();
    const active =
      listing.is_boosted &&
      listing.boost_expires_at &&
      new Date(listing.boost_expires_at) > now;

    return apiResponse.success(res, {
      active,
      boost_tier: active ? listing.boost_tier : null,
      boost_expires_at: active ? listing.boost_expires_at : null,
    });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

module.exports = { plans, activeBoost };

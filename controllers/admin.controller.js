const { Op, fn, col } = require('sequelize');
const apiResponse = require('../utils/apiResponse');
const {
  User,
  Listing,
  Order,
  OrderTimeline,
  Category,
  ListingImage,
} = require('../models/postgres');

const dashboard = async (req, res) => {
  try {
    const [users, listings, orders, pendingMod] = await Promise.all([
      User.count(),
      Listing.count(),
      Order.count(),
      Listing.count({ where: { status: 'under_review' } }),
    ]);

    const revenueAgg = await Order.findAll({
      attributes: [[fn('SUM', col('platform_commission')), 'total']],
      where: { status: { [Op.in]: ['paid', 'pickup_scheduled', 'picked_up', 'shipped', 'delivered', 'completed'] } },
      raw: true,
    });

    const revenue = Number(revenueAgg[0]?.total || 0);

    return apiResponse.success(res, {
      users,
      listings,
      orders,
      pendingModeration: pendingMod,
      revenueCommission: revenue,
    });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const listUsers = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const page = Number(req.query.page) || 1;
    const offset = (page - 1) * limit;
    const q = req.query.search;

    const where = {};
    if (q) {
      where[Op.or] = [
        { username: { [Op.iLike]: `%${q}%` } },
        { email: { [Op.iLike]: `%${q}%` } },
        { full_name: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return apiResponse.paginated(res, rows, count, page, limit);
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const banUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return apiResponse.error(res, 'User not found', 404);
    if (user.role === 'admin') {
      return apiResponse.error(res, 'Cannot ban admin', 400);
    }

    await user.update({ is_banned: true });
    return apiResponse.success(res, { user });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const listOrders = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const page = Number(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.from && req.query.to) {
      where.createdAt = {
        [Op.between]: [new Date(req.query.from), new Date(req.query.to)],
      };
    }

    const { rows, count } = await Order.findAndCountAll({
      where,
      include: [
        { model: Listing, as: 'listing', include: [{ model: ListingImage, as: 'images', limit: 1 }] },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return apiResponse.paginated(res, rows, count, page, limit);
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const revenue = async (req, res) => {
  try {
    const commission = await Order.findAll({
      attributes: [[fn('SUM', col('platform_commission')), 'total']],
      where: {
        status: {
          [Op.in]: ['paid', 'pickup_scheduled', 'picked_up', 'shipped', 'delivered', 'completed'],
        },
      },
      raw: true,
    });

    const pendingPayouts = await Order.findAll({
      attributes: [[fn('SUM', col('seller_payout')), 'total']],
      where: {
        status: 'delivered',
        payout_released_at: null,
      },
      raw: true,
    });

    return apiResponse.success(res, {
      totalCommissionEarned: Number(commission[0]?.total || 0),
      pendingSellerPayoutsApprox: Number(pendingPayouts[0]?.total || 0),
    });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const forceComplete = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return apiResponse.error(res, 'Order not found', 404);

    await order.update({
      status: 'completed',
      payout_released_at: order.payout_released_at || new Date(),
      payout_scheduled_at: order.payout_scheduled_at || new Date(),
      payout_reference: order.payout_reference || 'ADMIN_FORCE_COMPLETE',
    });

    await OrderTimeline.create({
      order_id: order.id,
      status: 'completed',
      message: 'Manually marked complete by admin',
    });

    return apiResponse.success(res, { order });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const listListingsAdmin = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const page = Number(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.status) where.status = req.query.status;

    const { rows, count } = await Listing.findAndCountAll({
      where,
      include: [{ model: Category }, { model: ListingImage, as: 'images', limit: 1 }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return apiResponse.paginated(res, rows, count, page, limit);
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

module.exports = {
  dashboard,
  listUsers,
  banUser,
  listOrders,
  revenue,
  forceComplete,
  listListingsAdmin,
};

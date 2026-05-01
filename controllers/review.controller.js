const sequelize = require('../config/db.postgres');
const apiResponse = require('../utils/apiResponse');
const { Review, Order, User } = require('../models/postgres');
const { createNotification } = require('../utils/notify');

const createReview = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { order_id, rating, comment } = req.body;

    const order = await Order.findByPk(order_id, { transaction: t, lock: true });
    if (!order) {
      await t.rollback();
      return apiResponse.error(res, 'Order not found', 404);
    }

    if (order.buyer_id !== req.user.id) {
      await t.rollback();
      return apiResponse.error(res, 'Only buyer can review', 403);
    }

    if (order.status !== 'completed') {
      await t.rollback();
      return apiResponse.error(res, 'Order must be completed before review', 400);
    }

    const existing = await Review.findOne({ where: { order_id }, transaction: t });

    if (existing) {
      await t.rollback();
      return apiResponse.error(res, 'Review already submitted', 400);
    }

    const review = await Review.create(
      {
        order_id,
        reviewer_id: req.user.id,
        seller_id: order.seller_id,
        rating,
        comment: comment || null,
      },
      { transaction: t }
    );

    await t.commit();

    await createNotification({
      recipient_id: order.seller_id,
      sender_id: req.user.id,
      sender_username: req.user.username,
      sender_avatar: req.user.avatar_url,
      type: 'review_received',
      title: 'New review',
      message: `You got ${rating} stars`,
      order_id: order.id,
    });

    return apiResponse.success(res, { review }, 'Thanks for your review', 201);
  } catch (e) {
    await t.rollback();
    console.error(e);
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const sellerReviews = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { seller_id: req.params.userId },
      include: [
        { model: User, as: 'reviewer', attributes: ['id', 'username', 'full_name', 'avatar_url'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    let avg = null;
    if (reviews.length) {
      avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    }

    return apiResponse.success(res, { reviews, avgRating: avg });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

module.exports = { createReview, sellerReviews };

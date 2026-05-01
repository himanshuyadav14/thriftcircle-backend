const cron = require('node-cron');
const { Op } = require('sequelize');
const sequelize = require('../config/db.postgres');
const razorpayService = require('../services/razorpay.service');
const emailService = require('../services/email.service');
const { createNotification } = require('../utils/notify');
const ActivityLog = require('../models/mongo/ActivityLog');
const { Order, User } = require('../models/postgres');

const runPayouts = async () => {
  const orders = await Order.findAll({
    where: {
      status: 'delivered',
      payout_released_at: null,
      payout_scheduled_at: { [Op.lte]: new Date() },
    },
    include: [{ model: User, as: 'seller' }],
  });

  for (const order of orders) {
    const t = await sequelize.transaction();
    try {
      if (order.status === 'return_requested' || order.status === 'returned') {
        await t.commit();
        continue;
      }

      const seller = order.seller;
      if (!seller?.upi_id) {
        await t.rollback();
        console.error(`Order ${order.id}: seller missing UPI`);
        continue;
      }

      const payout = await razorpayService.createPayout(
        seller.upi_id,
        Number(order.seller_payout),
        'payout',
        `payout_${order.id}`
      );

      await order.update(
        {
          status: 'completed',
          payout_released_at: new Date(),
          payout_reference: payout.id || String(payout),
        },
        { transaction: t }
      );

      await User.increment(
        {
          total_earnings: Number(order.seller_payout),
          total_sales: 1,
        },
        { where: { id: seller.id }, transaction: t }
      );

      await t.commit();

      await createNotification({
        recipient_id: seller.id,
        type: 'payout_released',
        title: 'Payout sent',
        message: `₹${order.seller_payout} released for order ${order.id}`,
        order_id: order.id,
      });

      emailService.sendPayoutReleasedEmail(seller, order, order.seller_payout);

      await ActivityLog.create({
        user_id: seller.id,
        action: 'payout_released',
        metadata: { order_id: order.id, payout_ref: payout.id },
        ip_address: '',
      });
    } catch (e) {
      await t.rollback();
      console.error(`Payout failed order ${order.id}`, e.response?.data || e.message);
    }
  }
};

const startPayoutCron = () => {
  cron.schedule('0 0 * * *', () => {
    runPayouts().catch(console.error);
  });
};

module.exports = { startPayoutCron, runPayouts };

const apiResponse = require('../utils/apiResponse');
const razorpayService = require('../services/razorpay.service');
const shiprocketService = require('../services/shiprocket.service');
const { Listing, Boost, Order, OrderTimeline } = require('../models/postgres');
const { BOOST_TIERS } = require('../utils/constants');
const { createNotification } = require('../utils/notify');
const { emitToUser } = require('../socket/socket');

const createBoostPayment = async (req, res) => {
  try {
    const { listing_id, tier } = req.body;
    const meta = BOOST_TIERS[tier];
    if (!meta) return apiResponse.error(res, 'Invalid tier', 400);

    const listing = await Listing.findByPk(listing_id);
    if (!listing || listing.seller_id !== req.user.id) {
      return apiResponse.error(res, 'Listing not found', 404);
    }

    const razorpayOrder = await razorpayService.createOrder(
      meta.price,
      'INR',
      `boost_${listing.id.slice(0, 8)}_${tier}`
    );

    return apiResponse.success(res, {
      razorpay_order_id: razorpayOrder.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      amount_inr: meta.price,
      tier,
    });
  } catch (e) {
    console.error(e);
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const verifyBoostPayment = async (req, res) => {
  const t = await Listing.sequelize.transaction();

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, listing_id, tier } = req.body;

    const tierMeta = BOOST_TIERS[tier];
    const ok = razorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!ok || !tierMeta) {
      await t.rollback();
      return apiResponse.error(res, 'Invalid payment', 400);
    }

    const listing = await Listing.findOne({
      where: { id: listing_id, seller_id: req.user.id },
      transaction: t,
      lock: true,
    });

    if (!listing) {
      await t.rollback();
      return apiResponse.error(res, 'Listing not found', 404);
    }

    const starts_at = new Date();
    const expires_at = new Date(starts_at);
    expires_at.setDate(expires_at.getDate() + tierMeta.days);

    await listing.update(
      {
        is_boosted: true,
        boost_expires_at: expires_at,
        boost_tier: tier,
      },
      { transaction: t }
    );

    await Boost.create(
      {
        listing_id: listing.id,
        seller_id: req.user.id,
        tier,
        amount_paid: tierMeta.price,
        razorpay_payment_id,
        starts_at,
        expires_at,
        is_active: true,
      },
      { transaction: t }
    );

    await t.commit();

    return apiResponse.success(res, { listing });
  } catch (e) {
    console.error(e);
    await t.rollback();
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const mapShiprocketStatus = (raw) => {
  const s = String(raw || '').toLowerCase();
  if (s.includes('deliver')) return 'delivered';
  if (s.includes('pick')) return 'picked_up';
  if (s.includes('transit') || s.includes('ship') || s.includes('out for')) return 'shipped';
  return null;
};

const handleRazorpayWebhook = async (req, res) => {
  try {
    const sig = req.headers['x-razorpay-signature'];
    const bodyStr = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);

    if (!razorpayService.verifyWebhookSignature(bodyStr, sig)) {
      return res.status(400).send('invalid signature');
    }

    let event;
    try {
      event = JSON.parse(bodyStr);
    } catch {
      return res.status(400).send('bad json');
    }
    if (event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      if (payment?.order_id) {
        const order = await Order.findOne({ where: { razorpay_order_id: payment.order_id } });
        if (order && order.status === 'pending') {
          /* Client verify flow is primary; webhook is backup */
        }
      }
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).send('error');
  }
};

const handleShiprocketWebhook = async (req, res) => {
  try {
    const bodyStr = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);
    const sig = req.headers['x-webhook-signature'] || req.headers['x-shiprocket-signature'] || '';

    if (!shiprocketService.verifyWebhook(bodyStr, sig)) {
      return res.status(400).send('invalid signature');
    }

    let payload;
    try {
      payload = JSON.parse(bodyStr);
    } catch {
      return res.json({ ok: true });
    }
    const awb = payload.awb || payload.awb_code || payload.tracking_data?.awb;
    const statusText =
      payload.current_status ||
      payload.shipment_status ||
      payload.status ||
      payload.tracking_data?.shipment_status;

    if (!awb && !payload.order_id) {
      return res.json({ ok: true });
    }

    let order = null;

    if (payload.order_id) {
      order = await Order.findOne({
        where: { shiprocket_order_id: String(payload.order_id) },
      });
    }

    if (!order && awb) {
      order = await Order.findOne({ where: { awb_number: String(awb) } });
    }

    if (!order) return res.json({ ok: true });

    const mapped = mapShiprocketStatus(statusText);
    if (!mapped) return res.json({ ok: true });

    const updates = {};

    if (mapped === 'picked_up' && !['delivered', 'completed', 'return_requested', 'returned'].includes(order.status)) {
      updates.status = 'picked_up';
    }

    if (mapped === 'shipped' && !['delivered', 'completed', 'return_requested', 'returned'].includes(order.status)) {
      updates.status = 'shipped';
    }

    if (mapped === 'delivered') {
      updates.status = 'delivered';
      updates.delivered_at = new Date();
      const hold = new Date(updates.delivered_at);
      hold.setDate(hold.getDate() + 3);
      updates.payout_scheduled_at = hold;
    }

    if (Object.keys(updates).length) {
      await order.update(updates);

      await OrderTimeline.create({
        order_id: order.id,
        status: updates.status || order.status,
        message: `Shiprocket: ${statusText}`,
      });

      const msg = {
        orderId: order.id,
        status: updates.status || order.status,
      };

      emitToUser(order.buyer_id, 'order_update', msg);
      emitToUser(order.seller_id, 'order_update', msg);

      await createNotification({
        recipient_id: order.buyer_id,
        type: mapped === 'delivered' ? 'delivered' : 'shipped',
        title: 'Order update',
        message: `Status: ${mapped.replace('_', ' ')}`,
        order_id: order.id,
      });

      await createNotification({
        recipient_id: order.seller_id,
        type: mapped === 'delivered' ? 'delivered' : 'shipped',
        title: 'Order update',
        message: `Status: ${mapped.replace('_', ' ')}`,
        order_id: order.id,
      });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).send('error');
  }
};

module.exports = {
  createBoostPayment,
  verifyBoostPayment,
  handleRazorpayWebhook,
  handleShiprocketWebhook,
};

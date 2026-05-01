const { Op } = require('sequelize');
const apiResponse = require('../utils/apiResponse');
const razorpayService = require('../services/razorpay.service');
const shiprocketService = require('../services/shiprocket.service');
const emailService = require('../services/email.service');
const {
  Listing,
  ListingImage,
  Order,
  OrderTimeline,
  User,
} = require('../models/postgres');
const { createNotification } = require('../utils/notify');
const { emitToUser, emitToAdmins } = require('../socket/socket');

const timelineRow = async (orderId, status, message, t) =>
  OrderTimeline.create({ order_id: orderId, status, message }, { transaction: t });

const normalizeAddr = (a) =>
  typeof a === 'string' ? JSON.parse(a) : a;

const sellerPickupSnapshot = (seller) => ({
  email: seller.email,
  name: seller.full_name,
  phone: String(seller.phone || '').replace(/\D/g, '').slice(0, 10) || '9999999999',
  city: seller.city || 'city',
  state: seller.state || 'state',
  address: `${seller.city || ''}, ${seller.state || ''}`.trim().replace(/^,|, $/, '') || 'Pickup location',
  pincode: '110001',
});

const buildShiprocketPayload = (order, listing, buyerAddr, pickup) => ({
  order_id: order.id,
  order_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
  pickup_location: 'Primary',
  pickup_customer_name: pickup.name || 'Seller',
  pickup_last_name: '',
  pickup_address: pickup.address,
  pickup_city: pickup.city,
  pickup_state: pickup.state,
  pickup_pincode: String(pickup.pincode || '110001').slice(0, 6),
  pickup_country: 'India',
  pickup_email: pickup.email || 'support@example.com',
  pickup_phone: pickup.phone,

  billing_customer_name: buyerAddr.name,
  billing_last_name: '',
  billing_address: buyerAddr.address,
  billing_city: buyerAddr.city,
  billing_pincode: String(buyerAddr.pincode).slice(0, 6),
  billing_state: buyerAddr.state,
  billing_country: 'India',
  billing_email: 'support@example.com',
  billing_phone: String(buyerAddr.phone),

  billing_is_shipping: true,

  shipping_is_billing: true,

  order_items: [
    {
      name: listing.title,
      sku: listing.id.slice(0, 8),
      units: 1,
      selling_price: Number(order.amount),
    },
  ],

  payment_method: 'Prepaid',

  length: 10,
  breadth: 10,
  height: 5,
  weight: 0.5,

  shipping_customer_name: buyerAddr.name,
  shipping_last_name: '',
  shipping_address: buyerAddr.address,
  shipping_city: buyerAddr.city,
  shipping_pincode: String(buyerAddr.pincode).slice(0, 6),
  shipping_country: 'India',
  shipping_state: buyerAddr.state,
  shipping_email: 'support@example.com',
  shipping_phone: String(buyerAddr.phone),

  sub_total: Number(order.amount),
});

const createOrder = async (req, res) => {
  try {
    const { listing_id, delivery_address } = req.body;
    const listing = await Listing.findByPk(listing_id, {
      include: [{ model: User, as: 'seller' }],
    });

    if (!listing) return apiResponse.error(res, 'Listing not found', 404);

    if (listing.status !== 'published') {
      return apiResponse.error(res, 'Listing is not available', 400);
    }

    if (listing.seller_id === req.user.id) {
      return apiResponse.error(res, 'You cannot buy your own listing', 400);
    }

    const seller = listing.seller;
    if (!seller.phone) {
      return apiResponse.error(res, 'Seller missing phone — cannot schedule pickup yet', 400);
    }

    const amountDec = listing.price;

    let platformCommission = Number((Number(amountDec) * 0.1).toFixed(2));

    let sellerPayout = Number((Number(amountDec) - platformCommission).toFixed(2));

    const rzOrder = await razorpayService.createOrder(Number(amountDec), 'INR', listing_id.slice(0, 8));

    const order = await Order.create({
      listing_id: listing.id,
      buyer_id: req.user.id,
      seller_id: listing.seller_id,
      amount: amountDec,
      platform_commission: platformCommission,
      seller_payout: sellerPayout,
      status: 'pending',
      razorpay_order_id: rzOrder.id,
      buyer_address: delivery_address,
      seller_address: sellerPickupSnapshot(seller),
    });

    await OrderTimeline.create({
      order_id: order.id,
      status: 'pending',
      message: 'Awaiting payment',
    });

    return apiResponse.success(
      res,
      {
        order,
        razorpay_order_id: rzOrder.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        amount_inr: Number(amountDec),
      },
      'Order draft created',
      201
    );
  } catch (e) {
    console.error(e);
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const verifyPayment = async (req, res) => {
  const t = await Order.sequelize.transaction();

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const verified = razorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!verified) {
      await t.rollback();
      return apiResponse.error(res, 'Invalid signature', 400);
    }

    // Lock order row only (no eager join): PostgreSQL rejects FOR UPDATE on
    // LEFT OUTER JOIN nullable side when include + lock are combined.
    const order = await Order.findOne({
      where: { razorpay_order_id },
      transaction: t,
      lock: true,
    });

    if (!order) {
      await t.rollback();
      return apiResponse.error(res, 'Order not found', 404);
    }

    if (order.buyer_id !== req.user.id) {
      await t.rollback();
      return apiResponse.error(res, 'Not allowed', 403);
    }

    if (order.status !== 'pending') {
      await t.rollback();
      return apiResponse.error(res, 'Order already processed', 400);
    }

    const listing = order.listing_id
      ? await Listing.findByPk(order.listing_id, { transaction: t, lock: true })
      : null;
    if (!listing || listing.status === 'sold') {
      await t.rollback();
      return apiResponse.error(res, 'Listing no longer available', 400);
    }

    await order.update(
      { status: 'paid', razorpay_payment_id },
      { transaction: t }
    );

    await listing.update({ status: 'sold' }, { transaction: t });

    await timelineRow(order.id, 'paid', 'Payment received', t);

    const buyer = await User.findByPk(order.buyer_id, { transaction: t });
    const seller = await User.findByPk(order.seller_id, { transaction: t });

    const buyerAddr = normalizeAddr(order.buyer_address);

    let pickup = normalizeAddr(order.seller_address);
    pickup.email = pickup.email || seller?.email || 'support@example.com';
    pickup.phone = pickup.phone || String(seller?.phone || '9999999999');

    let courierOk = false;

    try {
      const srPayload = buildShiprocketPayload(order, listing, buyerAddr, pickup);
      const shiprocket = await shiprocketService.createOrder(srPayload);

      courierOk = !!(shiprocket && (shiprocket.awb_code || shiprocket.order_id));

      await order.update(
        {
          shiprocket_order_id: shiprocket.order_id || null,
          shiprocket_shipment_id: shiprocket.shipment_id || null,
          awb_number: shiprocket.awb_code || null,
          courier_name: shiprocket.courier_name || null,
          tracking_url: shiprocket.tracking_url || null,
          status: 'pickup_scheduled',
        },
        { transaction: t }
      );

      await timelineRow(order.id, 'pickup_scheduled', 'Courier pickup scheduled', t);
    } catch (e) {
      console.error('Shiprocket error', e.response?.data || e.message);
      await timelineRow(
        order.id,
        'paid',
        'Payment received — courier booking failed or pending retry',
        t
      );
    }

    await t.commit();

    const refreshed = await Order.findByPk(order.id, {
      include: [
        { model: Listing, as: 'listing' },
        {
          model: OrderTimeline,
          as: 'timeline',
          separate: true,
          order: [['createdAt', 'ASC']],
        },
      ],
    });

    if (buyer && refreshed) emailService.sendOrderConfirmationEmail(buyer, refreshed);

    if (seller) {
      await createNotification({
        recipient_id: seller.id,
        sender_id: buyer?.id || null,
        sender_username: buyer?.username,
        sender_avatar: buyer?.avatar_url,
        type: 'order_placed',
        title: 'New order',
        message: `${buyer?.username || 'Buyer'} bought "${listing.title}"`,
        order_id: refreshed.id,
        listing_id: listing.id,
      });

      await createNotification({
        recipient_id: seller.id,
        type: 'pickup_scheduled',
        title: courierOk ? 'Pickup scheduled' : 'Order paid — shipping pending',
        message: courierOk
          ? `AWB ${refreshed.awb_number || '-'} • ${refreshed.courier_name || ''}`
          : 'Courier details will appear once booking succeeds',
        order_id: refreshed.id,
        listing_id: listing.id,
      });

      emitToUser(seller.id, 'order_update', {
        orderId: refreshed.id,
        status: refreshed.status,
      });
    }

    if (buyer) {
      await createNotification({
        recipient_id: buyer.id,
        type: 'order_paid',
        title: 'Payment confirmed',
        message: courierOk
          ? `Track: ${refreshed.tracking_url || 'check order page'}`
          : 'Courier is being arranged — you will see tracking shortly',
        order_id: refreshed.id,
        listing_id: listing.id,
      });

      emitToUser(buyer.id, 'order_update', {
        orderId: refreshed.id,
        status: refreshed.status,
      });
    }

    return apiResponse.success(res, { order: refreshed });
  } catch (e) {
    console.error(e);
    await t.rollback();
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const listOrders = async (req, res) => {
  try {
    const rows = await Order.findAll({
      where: {
        [Op.or]: [{ buyer_id: req.user.id }, { seller_id: req.user.id }],
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Listing,
          as: 'listing',
          include: [{ model: ListingImage, as: 'images', limit: 1 }],
        },
        {
          model: OrderTimeline,
          as: 'timeline',
          limit: 5,
          separate: true,
          order: [['createdAt', 'DESC']],
        },
      ],
    });

    return apiResponse.success(res, { orders: rows });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const orderDetail = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: Listing,
          as: 'listing',
          include: [{ model: ListingImage, as: 'images' }],
        },
        {
          model: OrderTimeline,
          as: 'timeline',
          separate: true,
          order: [['createdAt', 'ASC']],
        },
      ],
    });

    if (!order) return apiResponse.error(res, 'Order not found', 404);

    const isParties =
      order.buyer_id === req.user.id || order.seller_id === req.user.id || req.user.role === 'admin';

    if (!isParties) return apiResponse.error(res, 'Not allowed', 403);

    return apiResponse.success(res, { order });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const requestReturn = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);

    if (!order) return apiResponse.error(res, 'Order not found', 404);

    if (order.buyer_id !== req.user.id) return apiResponse.error(res, 'Not allowed', 403);

    if (order.status !== 'delivered') {
      return apiResponse.error(res, 'Return only after delivery', 400);
    }

    if (!order.delivered_at) {
      return apiResponse.error(res, 'Delivery date missing', 400);
    }

    const deadline = new Date(order.delivered_at);
    deadline.setDate(deadline.getDate() + 3);

    if (Date.now() > deadline.getTime()) {
      return apiResponse.error(res, 'Return window closed', 400);
    }

    await order.update({
      status: 'return_requested',
      return_reason: req.body.reason,
    });

    await OrderTimeline.create({
      order_id: order.id,
      status: 'return_requested',
      message: req.body.reason,
    });

    await createNotification({
      recipient_id: order.seller_id,
      sender_id: req.user.id,
      sender_username: req.user.username,
      type: 'order_placed',
      title: 'Return requested',
      message: req.body.reason,
      order_id: order.id,
    });

    emitToAdmins('order_update', {
      orderId: order.id,
      status: 'return_requested',
      reason: req.body.reason,
    });

    emitToUser(order.seller_id, 'order_update', {
      orderId: order.id,
      status: 'return_requested',
    });

    return apiResponse.success(res, { order });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  listOrders,
  orderDetail,
  requestReturn,
};

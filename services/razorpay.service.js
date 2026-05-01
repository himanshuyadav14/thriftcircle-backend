require('dotenv').config();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const axios = require('axios');

const keyId = process.env.RAZORPAY_KEY_ID || 'placeholder';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'placeholder';

let razorpay = null;
const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys are not configured in .env');
  }
  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

const createOrder = async (amount, currency = 'INR', receipt) => {
  const amtPaise = Math.round(Number(amount) * 100);
  return getRazorpay().orders.create({
    amount: amtPaise,
    currency,
    receipt: receipt.slice(0, 40),
  });
};

const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expected === signature;
};

const verifyWebhookSignature = (body, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  if (!secret) return true;
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
};

/** RazorpayX payout to UPI (needs Route / X account configured) */
const createPayout = async (upiId, amount, purpose, referenceId) => {
  const accountNum = process.env.RAZORPAYX_ACCOUNT_NUMBER;
  if (!accountNum) {
    throw new Error('RAZORPAYX_ACCOUNT_NUMBER is not configured');
  }
  const amtPaise = Math.round(Number(amount) * 100);
  const payload = {
    account_number: accountNum,
    fund_account: {
      account_type: 'vpa',
      vpa: { address: upiId },
      contact: {
        name: 'Seller',
        type: 'vendor',
      },
    },
    amount: amtPaise,
    currency: 'INR',
    mode: 'UPI',
    purpose: purpose || 'payout',
    queue_if_low_balance: true,
    reference_id: referenceId.slice(0, 40),
  };

  const res = await axios.post('https://api.razorpay.com/v1/payouts', payload, {
    auth: {
      username: process.env.RAZORPAY_KEY_ID,
      password: process.env.RAZORPAY_KEY_SECRET,
    },
    headers: { 'Content-Type': 'application/json' },
  });

  return res.data;
};

module.exports = {
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  createPayout,
};

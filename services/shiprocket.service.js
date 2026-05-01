require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const BASE = 'https://apiv2.shiprocket.in/v1/external';

let cachedToken = null;
let cachedAt = 0;
const TTL_MS = 23 * 60 * 60 * 1000;

const login = async () => {
  const now = Date.now();
  if (cachedToken && now - cachedAt < TTL_MS) {
    return cachedToken;
  }

  const { data } = await axios.post(`${BASE}/auth/login`, {
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
  });

  if (!data.token) throw new Error('Shiprocket login failed');
  cachedToken = data.token;
  cachedAt = now;
  return cachedToken;
};

const authHeaders = async () => {
  const token = await login();
  return { Authorization: `Bearer ${token}` };
};

/**
 * Minimal order create — adjust pickup_location_id if you configure warehouse in Shiprocket dashboard.
 */
const createOrder = async (orderData) => {
  const headers = await authHeaders();
  const { data } = await axios.post(
    `${BASE}/orders/create/adhoc`,
    orderData,
    { headers }
  );

  const order_id = data.order_id != null ? String(data.order_id) : null;
  const shipment_data = data.shipment_data || data || {};

  let awb_code = shipment_data.awb_code || shipment_data.awb || null;
  let courier_name = shipment_data.courier_name || null;
  let tracking_url = shipment_data.tracking_url || null;

  if (Array.isArray(data.awbs) && data.awbs[0]) {
    awb_code = awb_code || data.awbs[0].awb_code;
    courier_name = courier_name || data.awbs[0].courier_name;
    tracking_url = tracking_url || data.awbs[0].tracking_url;
  }

  return {
    order_id,
    shipment_id:
      shipment_data.shipment_id != null ? String(shipment_data.shipment_id) : null,
    awb_code,
    courier_name,
    tracking_url,
  };
};

const getTracking = async (awbCode) => {
  const headers = await authHeaders();
  const { data } = await axios.get(`${BASE}/courier/track/awb/${awbCode}`, {
    headers,
  });
  return data;
};

const cancelOrder = async (shiprocketOrderId) => {
  const headers = await authHeaders();
  const { data } = await axios.post(
    `${BASE}/orders/cancel`,
    { ids: [Number(shiprocketOrderId)] },
    { headers }
  );
  return data;
};

const verifyWebhook = (bodyRaw, signature) => {
  const secret = process.env.SHIPROCKET_WEBHOOK_SECRET || '';
  if (!secret) return true;
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(bodyRaw).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
};

module.exports = {
  login,
  createOrder,
  getTracking,
  cancelOrder,
  verifyWebhook,
};

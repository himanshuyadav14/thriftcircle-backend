const apiResponse = require('../utils/apiResponse');
const shiprocketService = require('../services/shiprocket.service');
const { Order } = require('../models/postgres');

const refreshTracking = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return apiResponse.error(res, 'Order not found', 404);

    if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id) {
      return apiResponse.error(res, 'Not allowed', 403);
    }

    if (!order.awb_number) {
      return apiResponse.error(res, 'No AWB yet', 400);
    }

    const data = await shiprocketService.getTracking(order.awb_number);
    return apiResponse.success(res, { tracking: data });
  } catch (e) {
    console.error(e.response?.data || e.message);
    return apiResponse.error(res, 'Could not fetch tracking', 500);
  }
};

module.exports = { refreshTracking };

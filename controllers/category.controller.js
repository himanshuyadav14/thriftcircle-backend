const { Category } = require('../models/postgres');
const apiResponse = require('../utils/apiResponse');

const list = async (_req, res) => {
  try {
    const categories = await Category.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'slug'],
      order: [['name', 'ASC']],
    });
    return apiResponse.success(res, { categories });
  } catch (e) {
    console.error(e);
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

module.exports = { list };

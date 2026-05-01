const apiResponse = require('../utils/apiResponse');
const cloudinaryService = require('../services/cloudinary.service');
const { User, Listing, Review, Category, ListingImage } = require('../models/postgres');

const getOwnProfile = async (req, res) => {
  try {
    return apiResponse.success(res, { user: req.user });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const updateProfile = async (req, res) => {
  try {
    const { full_name, bio, city, state, upi_id } = req.body;

    let avatar_url = req.user.avatar_url;
    if (req.file?.buffer) {
      const up = await cloudinaryService.uploadImage(req.file.buffer, 'avatars');
      avatar_url = up.url;
    }

    await req.user.update({
      ...(full_name && { full_name }),
      ...(bio !== undefined && { bio }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(upi_id !== undefined && { upi_id }),
      ...(req.file?.buffer ? { avatar_url } : {}),
    });

    await req.user.reload();

    return apiResponse.success(res, { user: req.user }, 'Updated');
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { username: req.params.username },
      include: [
        {
          model: Listing,
          as: 'listings',
          where: { status: 'published' },
          required: false,
          limit: 10,
          order: [['createdAt', 'DESC']],
          include: [
            { model: Category },
            { model: ListingImage, as: 'images', limit: 1 },
          ],
        },
      ],
    });

    if (!user) return apiResponse.error(res, 'User not found', 404);

    const reviews = await Review.findAll({
      where: { seller_id: user.id },
      include: [{ model: User, as: 'reviewer', attributes: ['id', 'username', 'full_name', 'avatar_url'] }],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    let avgRating = null;
    if (reviews.length) {
      avgRating =
        reviews.reduce((s, r) => s + r.rating, 0) /
        reviews.length;
    }

    return apiResponse.success(res, {
      user,
      recentListings: user.listings,
      reviews,
      avgRating,
    });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const listingsBySeller = async (req, res) => {
  try {
    const user = await User.findOne({ where: { username: req.params.username } });
    if (!user) return apiResponse.error(res, 'User not found', 404);

    const limit = Number(req.query.limit) || 20;
    const page = Number(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const { rows, count } = await Listing.findAndCountAll({
      where: { seller_id: user.id, status: 'published' },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [
        { model: Category },
        { model: ListingImage, as: 'images' },
      ],
    });

    return apiResponse.paginated(res, rows, count, page, limit);
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const sellerReviewsList = async (req, res) => {
  try {
    const user = await User.findOne({ where: { username: req.params.username } });
    if (!user) return apiResponse.error(res, 'User not found', 404);

    const reviews = await Review.findAll({
      where: { seller_id: user.id },
      include: [{ model: User, as: 'reviewer', attributes: ['id', 'username', 'full_name', 'avatar_url'] }],
      order: [['createdAt', 'DESC']],
    });

    let avgRating = null;
    if (reviews.length) {
      avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    }

    return apiResponse.success(res, { reviews, avgRating });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

module.exports = {
  getOwnProfile,
  updateProfile,
  getPublicProfile,
  listingsBySeller,
  sellerReviewsList,
};

const { Op, Sequelize } = require('sequelize');
const apiResponse = require('../utils/apiResponse');
const cloudinaryService = require('../services/cloudinary.service');
const { emitToAdmins } = require('../socket/socket');
const {
  Listing,
  ListingImage,
  Category,
  User,
} = require('../models/postgres');

const includeDefault = [
  { model: Category },
  { model: User, as: 'seller', attributes: ['id', 'username', 'full_name', 'avatar_url', 'city'] },
  { model: ListingImage, as: 'images' },
];

const boostedNowSql = Sequelize.literal(`
  CASE
    WHEN "Listing"."is_boosted" = true AND "Listing"."boost_tier" = 'premium' AND "Listing"."boost_expires_at" > NOW() THEN 1
    WHEN "Listing"."is_boosted" = true AND "Listing"."boost_tier" = 'featured' AND "Listing"."boost_expires_at" > NOW() THEN 2
    WHEN "Listing"."is_boosted" = true AND "Listing"."boost_tier" = 'basic' AND "Listing"."boost_expires_at" > NOW() THEN 3
    ELSE 4 END
`);

const feedSort = [
  [boostedNowSql, 'ASC'],
  ['createdAt', 'DESC'],
];

const buildFeedWhere = (query) => {
  const where = { status: 'published', is_active: true };
  if (query.category_id) where.category_id = Number(query.category_id);
  if (query.size) where.size = query.size;
  if (query.condition) where.condition = query.condition;
  if (query.city) where.city = { [Op.iLike]: `%${query.city}%` };

  if (query.min_price || query.max_price) {
    where.price = {};
    if (query.min_price) where.price[Op.gte] = query.min_price;
    if (query.max_price) where.price[Op.lte] = query.max_price;
  }

  if (query.search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${query.search}%` } },
      { description: { [Op.iLike]: `%${query.search}%` } },
      { brand: { [Op.iLike]: `%${query.search}%` } },
    ];
  }

  return where;
};

const createListing = async (req, res) => {
  const t = await Listing.sequelize.transaction();
  try {
    const images = req.files || [];
    if (images.length < 2 || images.length > 5) {
      await t.rollback();
      return apiResponse.error(res, 'Upload between 2 and 5 images', 400);
    }

    const buffers = images.map((f) => f.buffer);
    const uploaded = await cloudinaryService.uploadMany(buffers, 'listings');

    const {
      title,
      description,
      price,
      original_price,
      category_id,
      size,
      condition,
      brand,
      city,
      state,
    } = req.body;

    const listing = await Listing.create(
      {
        seller_id: req.user.id,
        category_id,
        title,
        description,
        price,
        original_price: original_price || null,
        size,
        condition,
        brand: brand || null,
        city: city || null,
        state: state || null,
        status: 'under_review',
      },
      { transaction: t }
    );

    for (let i = 0; i < uploaded.length; i++) {
      await ListingImage.create(
        {
          listing_id: listing.id,
          image_url: uploaded[i].url,
          public_id: uploaded[i].public_id,
          is_primary: i === 0,
          order_index: i,
        },
        { transaction: t }
      );
    }

    await t.commit();

    const full = await Listing.findByPk(listing.id, {
      include: includeDefault,
    });

    emitToAdmins('listing_moderated', {
      type: 'moderation_queue',
      listingId: listing.id,
      message: 'New listing needs review',
    });

    return apiResponse.success(res, { listing: full }, 'Submitted for review', 201);
  } catch (e) {
    await t.rollback();
    console.error(e);
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const getFeed = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const page = Number(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const where = buildFeedWhere(req.query);

    const { rows, count } = await Listing.findAndCountAll({
      where,
      include: includeDefault,
      order: feedSort,
      limit,
      offset,
    });

    return apiResponse.paginated(res, rows, count, page, limit);
  } catch (e) {
    console.error(e);
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const getListing = async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id, { include: includeDefault });
    if (!listing) return apiResponse.error(res, 'Listing not found', 404);

    setImmediate(() => {
      Listing.increment('views_count', { where: { id: listing.id } });
    });

    return apiResponse.success(res, { listing });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id);
    if (!listing) return apiResponse.error(res, 'Listing not found', 404);

    if (listing.seller_id !== req.user.id) {
      return apiResponse.error(res, 'Not allowed', 403);
    }

    if (!['draft', 'rejected'].includes(listing.status)) {
      return apiResponse.error(res, 'Only draft or rejected listings can be edited', 400);
    }

    const allowed = ['title', 'description', 'price', 'original_price', 'category_id', 'size', 'condition', 'brand', 'city', 'state'];
    const patch = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }

    if (listing.status === 'rejected') {
      patch.status = 'under_review';
      patch.rejection_reason = null;
    }

    await listing.update(patch);

    return apiResponse.success(res, {
      listing: await Listing.findByPk(listing.id, { include: includeDefault }),
    });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id, {
      include: [{ model: ListingImage, as: 'images' }],
    });
    if (!listing) return apiResponse.error(res, 'Listing not found', 404);

    if (listing.seller_id !== req.user.id) {
      return apiResponse.error(res, 'Not allowed', 403);
    }

    if (listing.status === 'sold') {
      return apiResponse.error(res, 'Sold listing cannot be deleted', 400);
    }

    for (const img of listing.images || []) {
      if (img.public_id) await cloudinaryService.deleteImage(img.public_id);
    }

    await listing.destroy();

    return apiResponse.success(res, null, 'Deleted');
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const myListings = async (req, res) => {
  try {
    const rows = await Listing.findAll({
      where: { seller_id: req.user.id },
      order: [['updatedAt', 'DESC']],
      include: [
        { model: Category },
        { model: ListingImage, as: 'images', limit: 1 },
      ],
    });
    return apiResponse.success(res, { listings: rows });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const byCategorySlug = async (req, res) => {
  try {
    const cat = await Category.findOne({ where: { slug: req.params.slug, is_active: true } });
    if (!cat) return apiResponse.error(res, 'Category not found', 404);

    const limit = Number(req.query.limit) || 20;
    const page = Number(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const { rows, count } = await Listing.findAndCountAll({
      where: { category_id: cat.id, status: 'published', is_active: true },
      include: includeDefault,
      order: feedSort,
      limit,
      offset,
    });

    return apiResponse.paginated(res, rows, count, page, limit);
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

module.exports = {
  createListing,
  getFeed,
  getListing,
  updateListing,
  deleteListing,
  myListings,
  byCategorySlug,
};

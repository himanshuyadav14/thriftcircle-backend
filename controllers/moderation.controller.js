const { Op } = require('sequelize');
const apiResponse = require('../utils/apiResponse');
const { Listing, ListingImage, Category, User } = require('../models/postgres');
const { createNotification } = require('../utils/notify');
const { emitToUser } = require('../socket/socket');
const emailService = require('../services/email.service');

const includeModeration = [
  { model: Category },
  { model: ListingImage, as: 'images' },
  { model: User, as: 'seller', attributes: ['id', 'username', 'email', 'full_name'] },
];

const moderationQueue = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const page = Number(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const { rows, count } = await Listing.findAndCountAll({
      where: { status: 'under_review' },
      include: includeModeration,
      order: [['createdAt', 'ASC']],
      limit,
      offset,
    });

    return apiResponse.paginated(res, rows, count, page, limit);
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const approve = async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.listingId, {
      include: [{ model: User, as: 'seller' }],
    });
    if (!listing) return apiResponse.error(res, 'Listing not found', 404);
    if (listing.status !== 'under_review') {
      return apiResponse.error(res, 'Listing is not in review', 400);
    }

    await listing.update({ status: 'published', rejection_reason: null });

    const seller = listing.seller;
    if (seller) {
      emailService.sendListingApprovedEmail(seller, listing);

      await createNotification({
        recipient_id: seller.id,
        sender_id: null,
        type: 'listing_approved',
        title: 'Listing approved',
        message: `"${listing.title}" is live now.`,
        listing_id: listing.id,
      });

      emitToUser(seller.id, 'listing_moderated', {
        listingId: listing.id,
        status: 'published',
      });
    }

    return apiResponse.success(res, { listing });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const reject = async (req, res) => {
  try {
    const { reason } = req.body;
    const listing = await Listing.findByPk(req.params.listingId, {
      include: [{ model: User, as: 'seller' }],
    });
    if (!listing) return apiResponse.error(res, 'Listing not found', 404);
    if (listing.status !== 'under_review') {
      return apiResponse.error(res, 'Listing is not in review', 400);
    }

    await listing.update({ status: 'rejected', rejection_reason: reason || 'Does not meet guidelines' });

    const seller = listing.seller;
    if (seller) {
      emailService.sendListingRejectedEmail(seller, listing, reason);

      await createNotification({
        recipient_id: seller.id,
        sender_id: null,
        type: 'listing_rejected',
        title: 'Listing rejected',
        message: `"${listing.title}" was rejected. ${reason}`,
        listing_id: listing.id,
      });

      emitToUser(seller.id, 'listing_moderated', {
        listingId: listing.id,
        status: 'rejected',
        reason,
      });
    }

    return apiResponse.success(res, { listing });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

const stats = async (req, res) => {
  try {
    const pending = await Listing.count({ where: { status: 'under_review' } });

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const approvedToday = await Listing.count({
      where: {
        updatedAt: { [Op.between]: [start, end] },
        status: 'published',
      },
    });

    const rejectedToday = await Listing.count({
      where: {
        updatedAt: { [Op.between]: [start, end] },
        status: 'rejected',
      },
    });

    return apiResponse.success(res, { pending, approvedToday, rejectedToday });
  } catch {
    return apiResponse.error(res, 'Something went wrong', 500);
  }
};

module.exports = { moderationQueue, approve, reject, stats };

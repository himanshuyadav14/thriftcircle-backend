require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const sequelize = require('../config/db.postgres');
require('../models/postgres'); /* associations */
const {
  User,
  Category,
  Listing,
  ListingImage,
  Order,
  Review,
} = require('../models/postgres');

const { faker } = require('@faker-js/faker/locale/en_IN');

const PASSWORD_PLAIN = 'Test@1234';

const CITY_STATE = [
  { city: 'Mumbai', state: 'Maharashtra' },
  { city: 'Delhi', state: 'Delhi' },
  { city: 'Jaipur', state: 'Rajasthan' },
  { city: 'Bangalore', state: 'Karnataka' },
  { city: 'Pune', state: 'Maharashtra' },
];

const USERNAME_SUFFIXES = [
  'thrifts',
  'styles',
  'closet',
  'bazaar',
  'kurta_corner',
  'denim_daily',
  'preloved_picks',
  'street_styles',
];

const EXTRA_USER_EMAILS = [
  'vikram@test.com',
  'ananya@test.com',
  'rohan@test.com',
  'neha@test.com',
  'arjun@test.com',
  'kavya@test.com',
  'siddharth@test.com',
  'meera@test.com',
];

const IMAGE_POOLS = {
  shirts: [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600',
    'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600',
    'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600',
  ],
  jeans: [
    'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600',
    'https://images.unsplash.com/photo-1604176354204-9268737828e4?w=600',
  ],
  shoes: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
    'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600',
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600',
  ],
  dresses: [
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600',
    'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600',
  ],
  jackets: [
    'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600',
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600',
  ],
};

const BRANDS = [
  'H&M',
  'Zara',
  'Mango',
  "Levi's",
  'Allen Solly',
  'Van Heusen',
  'W',
  'Fabindia',
  'Nike',
  'Adidas',
];

const CONDITIONS = ['like_new', 'good', 'fair'];
const SIZES = ['S', 'M', 'L', 'XL'];
const REVIEW_SAMPLES = [
  'Bahut achha condition tha, highly recommend!',
  'Fast delivery, exactly as described',
  'Good quality, thoda size bada tha but ok',
  'Excellent seller, will buy again!',
];

/** 40 listings: 10 + 8 + 8 + 6 + 8 */
function buildListingBuckets() {
  const defs = [];

  for (let k = 0; k < 10; k += 1) {
    defs.push({
      slug: k % 2 === 0 ? 'shirts' : 'tshirts',
      pool: 'shirts',
      low: 199,
      high: 799,
      titleStem: k % 2 === 0 ? 'Shirt' : 'T-Shirt',
    });
  }
  for (let k = 0; k < 8; k += 1) {
    defs.push({ slug: 'jeans', pool: 'jeans', low: 299, high: 999, titleStem: 'Jeans' });
  }
  for (let k = 0; k < 8; k += 1) {
    const slug = k % 3 === 0 ? 'dresses' : 'tops';
    defs.push({
      slug,
      pool: 'dresses',
      low: 199,
      high: 799,
      titleStem: slug === 'dresses' ? 'Dress' : 'Top',
    });
  }
  for (let k = 0; k < 6; k += 1) {
    const slug = k % 2 === 0 ? 'shoes' : 'sneakers';
    defs.push({
      slug,
      pool: 'shoes',
      low: 499,
      high: 1499,
      titleStem: 'Footwear',
    });
  }
  for (let k = 0; k < 8; k += 1) {
    defs.push({
      slug: 'jackets',
      pool: 'jackets',
      low: 599,
      high: 1999,
      titleStem: 'Jacket',
    });
  }

  faker.helpers.shuffle(defs);
  const ids = defs.map(() => faker.string.nanoid(5));
  return defs.map((d, idx) => ({ ...d, id: ids[idx] }));
}

function indianPhoneDigits() {
  return `9${faker.string.numeric(9)}`;
}

function pickImages(poolKey, count) {
  const pool = IMAGE_POOLS[poolKey];
  const imgs = [];
  for (let c = 0; c < count; c += 1) imgs.push(pool[c % pool.length]);
  faker.helpers.shuffle(imgs);
  return imgs.slice(0, count);
}

function buyerAddrFromUser(user, city, state) {
  const phone = (user.phone || '').replace(/\D/g, '').slice(-10);
  return {
    name: user.full_name,
    phone: phone || indianPhoneDigits(),
    address: faker.location.streetAddress(),
    city: city || user.city || 'Delhi',
    state: state || user.state || 'Delhi',
    pincode: String(faker.number.int({ min: 110001, max: 400075 })),
  };
}

function sellerAddrSnapshot(user) {
  const raw = (user.phone || '').replace(/\D/g, '');
  const phone = raw.slice(0, 10) || '9999999999';
  const city = user.city || 'city';
  const state = user.state || 'state';
  return {
    email: user.email,
    name: user.full_name,
    phone,
    city,
    state,
    address: `${city}, ${state}`.trim(),
    pincode: '110001',
  };
}

async function main() {
  await sequelize.authenticate();

  const hash = await bcrypt.hash(PASSWORD_PLAIN, 10);

  const categories = await Category.findAll({ attributes: ['id', 'slug'] });
  const slugToId = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  const requiredSlugs = [
    'shirts',
    'tshirts',
    'jeans',
    'dresses',
    'tops',
    'shoes',
    'sneakers',
    'jackets',
  ];
  const missing = requiredSlugs.filter((s) => slugToId[s] == null);
  if (missing.length) {
    console.error('Missing categories in DB (run app once or seedCategories first):', missing.join(', '));
    process.exit(1);
  }

  const buckets = buildListingBuckets();
  const boosts = ['basic', 'featured', 'premium', 'basic', 'featured', 'premium', 'basic', 'featured'];

  const users = [];

  await sequelize.transaction(async (t) => {
    const planned = [];

    planned.push({
      full_name: 'Rahul Verma',
      username: 'rahul_thrifts',
      email: 'rahul@test.com',
      locIdx: 0,
    });
    planned.push({
      full_name: 'Priya Nair',
      username: 'priya_styles',
      email: 'priya@test.com',
      locIdx: 1,
    });

    for (let idx = 0; idx < EXTRA_USER_EMAILS.length; idx += 1) {
      const email = EXTRA_USER_EMAILS[idx];
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const suf = USERNAME_SUFFIXES[idx % USERNAME_SUFFIXES.length];
      const base = faker.helpers
        .slugify(`${first}_${suf}`)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 24);

      planned.push({
        full_name: `${first} ${last}`,
        username: `${base}_${faker.number.int({ min: 10, max: 99 })}`,
        email,
        locIdx: (idx + 2) % CITY_STATE.length,
      });
    }

    for (const p of planned) {
      const loc = faker.helpers.arrayElement(CITY_STATE);
      const fallbackLoc = CITY_STATE[p.locIdx % CITY_STATE.length];
      const city = faker.datatype.boolean({ probability: 0.6 }) ? loc.city : fallbackLoc.city;
      const stateEntry = CITY_STATE.find((x) => x.city === city);
      const state = stateEntry ? stateEntry.state : fallbackLoc.state;

      const u = await User.create(
        {
          full_name: p.full_name,
          username: p.username,
          email: p.email,
          password: hash,
          phone: indianPhoneDigits(),
          avatar_url: `https://i.pravatar.cc/150?u=${encodeURIComponent(p.email)}`,
          city,
          state,
          role: 'both',
          is_verified: true,
        },
        { transaction: t }
      );
      users.push(u);
    }

    const boostExpire = new Date();
    boostExpire.setDate(boostExpire.getDate() + 30);

    for (let i = 0; i < buckets.length; i += 1) {
      const b = buckets[i];
      const seller = users[i % users.length];
      const categoryId = slugToId[b.slug];
      const price = faker.number.int({ min: b.low, max: b.high });
      const mult = faker.number.float({ min: 2, max: 3, fractionDigits: 2 });
      const original = Number((price * mult).toFixed(2));

      const title = `${b.titleStem} — ${faker.helpers.arrayElement(BRANDS)} (${b.id})`;
      const description = `${faker.commerce.productDescription()} Thoda negotiable, DM for more pics.`;

      const isBoosted = i < 8;
      const listing = await Listing.create(
        {
          seller_id: seller.id,
          category_id: categoryId,
          title: title.slice(0, 100),
          description,
          price,
          original_price: original,
          size: faker.helpers.arrayElement(SIZES),
          condition: faker.helpers.arrayElement(CONDITIONS),
          brand: faker.helpers.arrayElement(BRANDS),
          city: seller.city,
          state: seller.state,
          status: 'published',
          is_boosted: isBoosted,
          boost_tier: isBoosted ? boosts[i] : null,
          boost_expires_at: isBoosted ? boostExpire : null,
        },
        { transaction: t }
      );

      const numImgs = faker.helpers.arrayElement([2, 3]);
      const urls = pickImages(b.pool, numImgs);
      for (let j = 0; j < urls.length; j += 1) {
        await ListingImage.create(
          {
            listing_id: listing.id,
            image_url: urls[j],
            is_primary: j === 0,
            order_index: j,
          },
          { transaction: t }
        );
      }
    }

    const createdListings = await Listing.findAll({
      where: { seller_id: { [Op.in]: users.map((u) => u.id) } },
      order: [['createdAt', 'ASC']],
      transaction: t,
    });

    const reviewPairs = [];

    for (let r = 0; r < 20; r += 1) {
      const listing = createdListings[r];
      const sellerId = listing.seller_id;

      const buyer = faker.helpers.arrayElement(users.filter((u) => u.id !== sellerId));
      const seller = users.find((u) => u.id === sellerId);
      if (!seller) throw new Error('Seller not found for listing');

      const amount = listing.price;
      const platformCommission = Number((Number(amount) * 0.1).toFixed(2));
      const sellerPayout = Number((Number(amount) - platformCommission).toFixed(2));

      const order = await Order.create(
        {
          listing_id: listing.id,
          buyer_id: buyer.id,
          seller_id: sellerId,
          amount,
          platform_commission: platformCommission,
          seller_payout: sellerPayout,
          status: 'completed',
          buyer_address: buyerAddrFromUser(buyer, buyer.city, buyer.state),
          seller_address: sellerAddrSnapshot(seller),
          delivered_at: faker.date.recent({ days: 14 }),
        },
        { transaction: t }
      );

      reviewPairs.push({ order, buyer, seller });
    }

    for (const { order, buyer } of reviewPairs) {
      const rating = faker.datatype.boolean({ probability: 0.85 })
        ? faker.helpers.arrayElement([4, 5])
        : faker.helpers.arrayElement([3, 4]);
      const comment = faker.helpers.arrayElement(REVIEW_SAMPLES);

      await Review.create(
        {
          order_id: order.id,
          reviewer_id: buyer.id,
          seller_id: order.seller_id,
          rating,
          comment,
        },
        { transaction: t }
      );
    }
  });

  console.log(`Seed complete!
 Users: 10 (password: ${PASSWORD_PLAIN})
 Listings: 40
 Reviews: 20
 
 Test accounts:
 Email: rahul@test.com / Pass: ${PASSWORD_PLAIN}
 Email: priya@test.com / Pass: ${PASSWORD_PLAIN}`);

  await sequelize.close();
}

main().catch(async (e) => {
  console.error(e);
  await sequelize.close();
  process.exit(1);
});

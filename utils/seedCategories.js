const { Category } = require('../models/postgres');

const categories = [
  { name: 'Shirts', slug: 'shirts' },
  { name: 'T-Shirts', slug: 'tshirts' },
  { name: 'Jeans', slug: 'jeans' },
  { name: 'Trousers', slug: 'trousers' },
  { name: 'Dresses', slug: 'dresses' },
  { name: 'Tops', slug: 'tops' },
  { name: 'Jackets', slug: 'jackets' },
  { name: 'Shoes', slug: 'shoes' },
  { name: 'Sneakers', slug: 'sneakers' },
  { name: 'Sandals', slug: 'sandals' },
  { name: 'Accessories', slug: 'accessories' },
  { name: 'Specs & Sunglasses', slug: 'specs' },
  { name: 'Bags', slug: 'bags' },
  { name: 'Watches', slug: 'watches' },
];

const seedCategories = async () => {
  for (const c of categories) {
    await Category.findOrCreate({ where: { slug: c.slug }, defaults: c });
  }
};

module.exports = seedCategories;

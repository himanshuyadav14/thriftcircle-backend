require('dotenv').config();
const mongoose = require('mongoose');

const connectMongo = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/thriftcircle';
  await mongoose.connect(uri);
};

module.exports = { connectMongo, mongoose };

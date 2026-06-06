const mongoose = require('mongoose');

const MONGO_URL = process.env.ATLASDB_URL || 'mongodb://127.0.0.1:27017/WanderLust';

module.exports.connectDB = async () => {
    await mongoose.connect(MONGO_URL);
};

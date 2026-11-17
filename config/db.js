const mongoose = require('mongoose');

const MONGO_URL = process.env.ATLASDB_URL || 'mongodb://127.0.0.1:27017/WanderLust';

module.exports.dbURL = MONGO_URL;

module.exports.connectDB = async () => {
    await mongoose.connect(MONGO_URL);
};

// Listings created before the isDemo flag existed: the seeded sample data (matched by
// its title, or by the `demo` user) becomes public. Listings with the flag are untouched.
module.exports.markDemoListings = async () => {
    const Listing = require('../models/listing.js');
    const User = require('../models/user.js');
    const titles = require('../init/data.js').data.map((l) => l.title);
    const demoUser = await User.findOne({ username: 'demo' });
    const match = [{ title: { $in: titles } }, ...(demoUser ? [{ author: demoUser._id }] : [])];
    const result = await Listing.updateMany(
        { isDemo: { $exists: false }, $or: match },
        { $set: { isDemo: true } }
    );
    if (result.modifiedCount) console.log(`Marked ${result.modifiedCount} sample listings as demo`);
};

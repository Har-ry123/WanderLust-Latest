const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const initData = require('./data.js');
const Listing = require('../models/listing.js');
const User = require('../models/user.js');
const { geocodeLocation } = require('../utils/geocoding.js');

const MONGO_URL = process.env.ATLASDB_URL || 'mongodb://127.0.0.1:27017/WanderLust';

// Every listing needs an author, so seed data is owned by a demo user.
const SEED_USER = { username: 'demo', email: 'demo@wanderlust.test', password: 'demo1234' };

const getSeedAuthor = async () => {
    const existing = await User.findOne({ username: SEED_USER.username });
    if (existing) return existing;
    const { password, ...fields } = SEED_USER;
    return User.register(new User(fields), password);
};

const initDB = async () => {
    await mongoose.connect(MONGO_URL);
    console.log('connected to database');

    const author = await getSeedAuthor();
    await Listing.deleteMany({});

    const listingsWithGeometry = [];
    for (const listing of initData.data) {
        const geometry = await geocodeLocation(listing.location, listing.country);
        listingsWithGeometry.push({
            ...listing,
            author: author._id,
            ...(geometry && { geometry }),
        });
    }

    await Listing.insertMany(listingsWithGeometry);
    console.log(`Database initialized with sample data (owner: ${SEED_USER.username} / ${SEED_USER.password})`);
};

initDB()
    .catch((err) => {
        console.error('Error initializing database', err);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());

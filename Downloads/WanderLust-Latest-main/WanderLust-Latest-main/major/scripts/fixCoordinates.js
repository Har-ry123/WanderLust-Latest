require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('../models/listing.js');
const { geocodeLocation } = require('../utils/geocoding.js');

const MONGO_URL = process.env.ATLASDB_URL || 'mongodb://127.0.0.1:27017/WanderLust';
const force = process.argv.includes('--force');

async function fixCoordinates() {
    await mongoose.connect(MONGO_URL);
    const listings = await Listing.find({});

    for (const listing of listings) {
        const geometry = await geocodeLocation(listing.location, listing.country);
        if (geometry) {
            await Listing.updateOne({ _id: listing._id }, { $set: { geometry } });
            console.log(`Updated: ${listing.title} -> ${geometry.coordinates.join(', ')}`);
        } else if (force) {
            console.log(`Skipped: ${listing.title}`);
        }
    }

    console.log('Done fixing listing coordinates');
    await mongoose.disconnect();
}

fixCoordinates().catch((err) => {
    console.error(err);
    process.exit(1);
});

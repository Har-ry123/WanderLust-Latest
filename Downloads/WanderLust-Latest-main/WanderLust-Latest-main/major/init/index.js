require('dotenv').config();
const mongoose = require('mongoose');
const initData = require('./data.js');
const Listing = require('../models/listing.js');
const { geocodeLocation } = require('../utils/geocoding.js');

const MONGO_URL = process.env.ATLASDB_URL || 'mongodb://127.0.0.1:27017/WanderLust';

main()
    .then(() => console.log('connected to database'))
    .catch((err) => console.log('Error connecting to database', err));

async function main() {
    await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
    await Listing.deleteMany({});

    const listingsWithGeometry = [];
    for (const listing of initData.data) {
        const geometry = await geocodeLocation(listing.location, listing.country);
        listingsWithGeometry.push({
            ...listing,
            ...(geometry && { geometry }),
        });
    }

    await Listing.insertMany(listingsWithGeometry);
    console.log('Database initialized with sample data');
};

initDB();

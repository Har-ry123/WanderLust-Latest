const express = require('express');
const router = express.Router();
const Listing = require('../models/listing.js');
const { aiEnabled, describeListing, planTrip } = require('../services/ai.js');

// JSON endpoints used by public/js/ai.js; errors are returned as JSON too
const jsonRoute = (handler) => async (req, res) => {
    if (!aiEnabled()) {
        return res.status(503).json({ error: 'AI features are off. Add ANTHROPIC_API_KEY to your .env file.' });
    }
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Please log in to use the AI assistant.' });
    }
    try {
        res.json(await handler(req));
    } catch (err) {
        if (err.name === 'CastError') return res.status(404).json({ error: 'Listing not found.' });
        if (!err.statusCode) console.error(err);
        res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Something went wrong.' });
    }
};

router.post('/describe', jsonRoute(async (req) => {
    const { title = '', location = '', country = '', price = '' } = req.body || {};
    return { text: await describeListing({ title, location, country, price }) };
}));

router.post('/trip/:id', jsonRoute(async (req) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        const err = new Error('Listing not found.');
        err.statusCode = 404;
        throw err;
    }
    return { text: await planTrip(listing) };
}));

module.exports = router;

const { MAPBOX_TOKEN } = require('../config/mapbox.js');

module.exports.mapboxLocals = (req, res, next) => {
    res.locals.mapboxToken = MAPBOX_TOKEN;
    next();
};

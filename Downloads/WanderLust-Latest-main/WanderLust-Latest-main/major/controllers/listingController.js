const Listing = require('../models/listing.js');
const ExpressError = require('../utils/ExpressError.js');
const wrapAsync = require('../utils/wrapAsync.js');
const { resolveGeometry, hasValidCoordinates } = require('../utils/geocoding.js');

const buildMapListings = (listings) =>
    listings
        .filter((listing) => hasValidCoordinates(listing.geometry?.coordinates))
        .map((listing) => ({
            id: listing._id,
            title: listing.title,
            location: listing.location,
            country: listing.country,
            price: listing.price,
            coordinates: listing.geometry.coordinates,
        }));

module.exports.index = wrapAsync(async (req, res) => {
    const allListings = await Listing.find({});
    res.render('listings/index.ejs', {
        allListings,
        mapListings: buildMapListings(allListings),
    });
});

module.exports.renderNewForm = (req, res) => {
    res.render('listings/new.ejs');
};

module.exports.showListing = wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({ path: 'reviews', populate: { path: 'author' } })
        .populate('author');
    if (!listing) {
        req.session.error = 'Listing you requested does not exist!';
        return res.redirect('/listings');
    }
    res.render('listings/show.ejs', { listing });
});

module.exports.createListing = wrapAsync(async (req, res) => {
    const { lng, lat, ...listingFields } = req.body.listing;
    const geometry = await resolveGeometry({
        lng,
        lat,
        location: listingFields.location,
        country: listingFields.country,
    });

    const newListing = new Listing({
        ...listingFields,
        author: req.user._id,
        ...(geometry && { geometry }),
    });
    await newListing.save();
    req.session.success = 'Listing created successfully!';
    res.redirect('/listings');
});

module.exports.renderEditForm = wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.session.error = 'Listing you requested does not exist!';
        return res.redirect('/listings');
    }
    res.render('listings/edit.ejs', { listing });
});

module.exports.updateListing = wrapAsync(async (req, res) => {
    if (!req.body.listing) {
        throw new ExpressError('Invalid request data', 400);
    }
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        throw new ExpressError('Listing not found', 404);
    }

    const { lng, lat, ...listingFields } = req.body.listing;
    const locationChanged =
        listingFields.location !== listing.location ||
        listingFields.country !== listing.country;

    const geometry = locationChanged
        ? await resolveGeometry({
              lng: '',
              lat: '',
              location: listingFields.location,
              country: listingFields.country,
          })
        : await resolveGeometry({
              lng,
              lat,
              location: listingFields.location,
              country: listingFields.country,
          });

    listing.set(listingFields);
    if (geometry) {
        listing.geometry = geometry;
    }
    await listing.save();
    req.session.success = 'Listing updated successfully!';
    res.redirect(`/listings/${id}`);
});

module.exports.deleteListing = wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.session.success = 'Listing deleted successfully!';
    res.redirect('/listings');
});

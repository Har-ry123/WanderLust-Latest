const Listing = require('../models/listing.js');
const Review = require('../models/review.js');
const wrapAsync = require('../utils/wrapAsync.js');

module.exports.isAuthor = wrapAsync(async (req, res, next) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.session.error = 'Listing you requested does not exist!';
        return res.redirect('/listings');
    }
    if (!req.user || !listing.author.equals(req.user._id)) {
        req.session.error = 'You do not have permission to do that!';
        return res.redirect(`/listings/${id}`);
    }
    next();
});

module.exports.isReviewAuthor = wrapAsync(async (req, res, next) => {
    const { reviewId, id } = req.params;
    const review = await Review.findById(reviewId);
    if (!review) {
        req.session.error = 'Review not found.';
        return res.redirect(`/listings/${id}`);
    }
    if (!req.user || !review.author.equals(req.user._id)) {
        req.session.error = 'You do not have permission to delete this review.';
        return res.redirect(`/listings/${id}`);
    }
    next();
});

const Listing = require('../models/listing.js');
const Review = require('../models/review.js');
const wrapAsync = require('../utils/wrapAsync.js');
const { canView } = require('../utils/access.js');

// A listing is reachable only if it is a demo listing or the visitor's own.
// Someone else's listing behaves exactly like one that does not exist.
module.exports.ensureAccess = wrapAsync(async (req, res, next) => {
    const listing = await Listing.findById(req.params.id).select('author isDemo');
    if (!listing || !canView(listing, req.user)) {
        req.session.error = 'Listing you requested does not exist!';
        return res.redirect('/listings');
    }
    next();
});
// edit/update/delete: login is checked separately, the visibility rule is the same
module.exports.isAuthor = module.exports.ensureAccess;

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

const Listing = require('../models/listing.js');
const Review = require('../models/review.js');
const ExpressError = require('../utils/ExpressError.js');
const wrapAsync = require('../utils/wrapAsync.js');

module.exports.createReview = wrapAsync(async (req, res) => {
    const { id } = req.params;
    if (!req.user) {
        req.session.error = 'You must be logged in to leave a review!';
        return res.redirect('/login');
    }
    const listing = await Listing.findById(id);
    if (!listing) {
        throw new ExpressError('Listing not found', 404);
    }
    const review = new Review({ ...req.body.review, author: req.user._id });
    await review.save();
    await Listing.findByIdAndUpdate(id, { $push: { reviews: review._id } });
    res.redirect(`/listings/${id}`);
});

module.exports.deleteReview = wrapAsync(async (req, res) => {
    const { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.session.success = 'Review deleted successfully!';
    res.redirect(`/listings/${id}`);
});

const express = require('express');
const router = express.Router({ mergeParams: true });
const reviewController = require('../controllers/reviewController.js');
const { isLoggedIn } = require('../middleware/auth.js');
const { isReviewAuthor } = require('../middleware/authorization.js');
const { validateReview } = require('../middleware/validation.js');

router.post('/', isLoggedIn, validateReview, reviewController.createReview);
router.delete('/:reviewId', isLoggedIn, isReviewAuthor, reviewController.deleteReview);

module.exports = router;

const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController.js');
const reviewRouter = require('./review.js');
const { isLoggedIn } = require('../middleware/auth.js');
const { isAuthor } = require('../middleware/authorization.js');
const { validateListing } = require('../middleware/validation.js');

router.get('/', listingController.index);
router.get('/new', isLoggedIn, listingController.renderNewForm);
router.get('/:id', listingController.showListing);
router.post('/', isLoggedIn, validateListing, listingController.createListing);
router.get('/:id/edit', isLoggedIn, isAuthor, listingController.renderEditForm);
router.put('/:id', isLoggedIn, isAuthor, validateListing, listingController.updateListing);
router.delete('/:id', isLoggedIn, isAuthor, listingController.deleteListing);

router.use('/:id/reviews', reviewRouter);

module.exports = router;

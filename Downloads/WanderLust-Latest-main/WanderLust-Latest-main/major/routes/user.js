const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController.js');

router.get('/signup', userController.renderSignup);
router.post('/signup', userController.signup);
router.get('/login', userController.renderLogin);
router.post('/login', userController.login);
router.get('/logout', userController.logout);

module.exports = router;

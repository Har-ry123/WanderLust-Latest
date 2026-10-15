const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('../models/user.js');

module.exports.configurePassport = () => {
    passport.use(new LocalStrategy(User.authenticate()));
    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());
};

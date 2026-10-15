const User = require('../models/user.js');
const passport = require('passport');
const wrapAsync = require('../utils/wrapAsync.js');

module.exports.renderSignup = (req, res) => {
    res.render('users/signup.ejs');
};

module.exports.signup = wrapAsync(async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        if (![username, email, password].every((v) => typeof v === 'string' && v.trim())) {
            req.session.error = 'Please fill in username, email and password.';
            return res.redirect('/signup');
        }
        const user = new User({ username, email });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, (err) => {
            if (err) return next(err);
            req.session.success = 'Welcome to Wanderlust!';
            res.redirect('/listings');
        });
    } catch (error) {
        req.session.error = error.message;
        res.redirect('/signup');
    }
});

module.exports.renderLogin = (req, res) => {
    res.render('users/login.ejs');
};

module.exports.login = (req, res, next) => {
    // only plain strings, so a crafted form can't send a database query object
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string') {
        req.session.error = 'Invalid username or password';
        return res.redirect('/login');
    }
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            req.session.error = info?.message || 'Invalid username or password';
            return res.redirect('/login');
        }
        req.login(user, (err) => {
            if (err) return next(err);
            req.session.success = 'Welcome back!';
            res.redirect('/listings');
        });
    })(req, res, next);
};

module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.session.success = 'You are logged out!';
        res.redirect('/listings');
    });
};

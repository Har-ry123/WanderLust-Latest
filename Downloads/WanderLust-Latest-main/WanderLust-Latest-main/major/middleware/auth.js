module.exports.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    req.session.error = 'You must be logged in to create a listing!';
    return res.redirect('/login');
};

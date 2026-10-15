module.exports.flash = (req, res, next) => {
    res.locals.success = req.session.success || null;
    res.locals.error = req.session.error || null;
    res.locals.currentUser = req.user;
    delete req.session.success;
    delete req.session.error;
    next();
};

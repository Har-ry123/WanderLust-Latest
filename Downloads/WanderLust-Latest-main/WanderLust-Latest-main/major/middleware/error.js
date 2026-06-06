const ExpressError = require('../utils/ExpressError.js');

module.exports.notFound = (req, res, next) => {
    next(new ExpressError('Page Not Found', 404));
};

module.exports.errorHandler = (err, req, res, next) => {
    const { statusCode = 500, message = 'Something went wrong' } = err;
    res.status(statusCode).render('error.ejs', { statusCode, message });
};

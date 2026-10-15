const isProduction = process.env.NODE_ENV === 'production';
const secret = process.env.SECRET || process.env.SECRET_KEY;

if (!secret && isProduction) {
    throw new Error('SECRET (or SECRET_KEY) must be set in production.');
}

module.exports.sessionOptions = {
    secret: secret || 'dev-only-insecure-secret',
    resave: false,
    // don't create a stored session for every visitor/bot, only once we write to it
    saveUninitialized: false,
    cookie: {
        // maxAge is relative to each response; a fixed `expires` date would be
        // computed once at server start and expire every cookie after 7 days of uptime
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction, // HTTPS-only cookies on the deployed site
    },
};

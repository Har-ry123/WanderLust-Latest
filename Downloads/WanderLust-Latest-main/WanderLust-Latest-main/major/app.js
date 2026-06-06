const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const passport = require('passport');

const { connectDB } = require('./config/db.js');
const { sessionOptions } = require('./config/session.js');
const { configurePassport } = require('./config/passport.js');
const { flash } = require('./middleware/flash.js');
const { mapboxLocals } = require('./middleware/mapbox.js');
const { notFound, errorHandler } = require('./middleware/error.js');
const listingsRouter = require('./routes/listing.js');
const userRouter = require('./routes/user.js');
const MongoStore = require('connect-mongo');


const app = express();
const { MAPBOX_TOKEN } = require('./config/mapbox.js');

if (!MAPBOX_TOKEN) {
    console.warn('MAPBOX_TOKEN is missing — maps will not load. Add it to your .env file.');
}

connectDB()
    .then(() => console.log('connected to database'))
    .catch((err) => console.log('Error connecting to database', err));
// Database URL (use Atlas if provided, otherwise local)
const dbURL = process.env.ATLASDB_URL || 'mongodb://127.0.0.1:27017/WanderLust';

// Create a Mongo-backed session store (support both new and older connect-mongo APIs)
let store;
try {
    if (MongoStore && typeof MongoStore.create === 'function') {
        // connect-mongo v4+ API
        store = MongoStore.create({
            mongoUrl: dbURL,
            crypto: { secret: sessionOptions.secret },
            touchAfter: 24 * 3600
        });
    } else if (typeof MongoStore === 'function') {
        // older connect-mongo returns a function(session)
        const Store = MongoStore(session);
        store = new Store({ url: dbURL, touchAfter: 24 * 3600, secret: sessionOptions.secret });
    } else {
        // fallback: try common property
        const Store = MongoStore && MongoStore.MongoStore;
        if (Store) {
            store = new Store({ mongoUrl: dbURL, touchAfter: 24 * 3600 });
        }
    }
} catch (err) {
    console.error('Failed to create MongoStore:', err);
}

if (store) sessionOptions.store = store;
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, 'public')));

app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());
configurePassport();

app.use(flash);
app.use(mapboxLocals);

app.use('/', userRouter);
app.use('/listings', listingsRouter);

app.get('/', (req, res) => {
    res.redirect('/listings');
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8088;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

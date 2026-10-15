const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const passport = require('passport');


const { connectDB, dbURL } = require('./config/db.js');
const { sessionOptions } = require('./config/session.js');
const { configurePassport } = require('./config/passport.js');
const { flash } = require('./middleware/flash.js');
const { mapboxLocals } = require('./middleware/mapbox.js');
const { notFound, errorHandler } = require('./middleware/error.js');
const listingsRouter = require('./routes/listing.js');
const userRouter = require('./routes/user.js');
const aiRouter = require('./routes/ai.js');
const { getAiStatus } = require('./services/ai.js');
const { MongoStore } = require('connect-mongo');


const app = express();
const { MAPBOX_TOKEN } = require('./config/mapbox.js');

if (!MAPBOX_TOKEN) {
    console.log('No MAPBOX_TOKEN set: using free OpenStreetMap maps instead.');
}
getAiStatus().then(({ label, canPlan }) => {
    console.log(`AI features: ${label}`);
    if (!canPlan) {
        console.log('Tip: start Ollama (free, https://ollama.com) with "ollama pull llama3.2" for the AI writer and trip planner.');
    }
});

connectDB()
    .then(() => console.log('connected to database'))
    .catch((err) => console.log('Error connecting to database', err));
// Mongo-backed session store (connect-mongo v6)
const store = MongoStore.create({
    mongoUrl: dbURL,
    crypto: { secret: sessionOptions.secret },
    touchAfter: 24 * 3600,
});
store.on('error', (err) => console.error('Session store error:', err));
sessionOptions.store = store;
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, 'public')));

app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());
configurePassport();

app.use(flash);
app.use(mapboxLocals);
app.use(async (req, res, next) => {
    res.locals.ai = await getAiStatus();
    next();
});

app.use('/', userRouter);
app.use('/listings', listingsRouter);
app.use('/ai', aiRouter);

app.get('/', (req, res) => {
    res.redirect('/listings');
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8088;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

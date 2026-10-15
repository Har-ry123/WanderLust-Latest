// Free, offline "smart search": reads prices, countries, places and kinds of
// stay out of a plain-English request with simple rules (no AI needed).

const COUNTRY_ALIASES = {
    us: 'United States', usa: 'United States', america: 'United States', 'united states': 'United States',
    uk: 'United Kingdom', britain: 'United Kingdom', england: 'United Kingdom', scotland: 'United Kingdom',
    uae: 'United Arab Emirates', dubai: 'United Arab Emirates',
};

// Words that mean the same kind of stay, mapped to what listings actually say
const SYNONYMS = {
    beach: ['beach', 'beaches', 'seaside', 'sea', 'ocean', 'coast', 'coastal', 'shore', 'beachfront'],
    mountain: ['mountain', 'mountains', 'hill', 'hills', 'alps', 'peak', 'ski', 'snow', 'himalaya', 'himalayas'],
    cabin: ['cabin', 'cabins', 'lodge', 'chalet', 'cottage', 'hut'],
    villa: ['villa', 'villas', 'mansion'],
    island: ['island', 'islands', 'tropical'],
    lake: ['lake', 'lakeside', 'lakefront'],
    city: ['city', 'downtown', 'urban', 'loft', 'apartment'],
    castle: ['castle', 'castles', 'historic', 'history'],
    pool: ['pool', 'pools', 'swimming'],
    camping: ['camping', 'camp', 'tent', 'treehouse', 'glamping'],
    safari: ['safari', 'wildlife', 'jungle', 'forest'],
    desert: ['desert', 'dunes'],
    farm: ['farm', 'farmhouse', 'countryside', 'rural', 'vineyard'],
    luxury: ['luxury', 'luxurious', 'premium', 'lavish', 'penthouse'],
};
const SYNONYM_LOOKUP = Object.fromEntries(
    Object.entries(SYNONYMS).flatMap(([keyword, words]) => words.map((word) => [word, keyword]))
);

const USD_TO_INR = 83;

const toNumber = (raw, unit) => {
    let value = Number(raw.replace(/,/g, ''));
    if (/^k$/i.test(unit || '')) value *= 1000;
    return value;
};

const parsePrices = (text) => {
    const usd = /\$|usd|dollar/i.test(text);
    const scale = (value) => (value == null ? null : Math.round(usd ? value * USD_TO_INR : value));
    const num = '(\\d[\\d,]*(?:\\.\\d+)?)\\s*(k)?';

    const range = text.match(new RegExp(`(?:between\\s+)?[₹$]?${num}\\s*(?:-|to|and)\\s*[₹$]?${num}`, 'i'));
    if (range && /between|-|to/i.test(range[0])) {
        return { minPrice: scale(toNumber(range[1], range[2])), maxPrice: scale(toNumber(range[3], range[4])) };
    }
    const max = text.match(new RegExp(`(?:under|below|less than|cheaper than|max(?:imum)?|up ?to|within|<)\\s*[₹$]?${num}`, 'i'));
    const min = text.match(new RegExp(`(?:over|above|more than|at least|min(?:imum)?|from|>)\\s*[₹$]?${num}`, 'i'));
    return {
        minPrice: min ? scale(toNumber(min[1], min[2])) : null,
        maxPrice: max ? scale(toNumber(max[1], max[2])) : null,
    };
};

// knownCountries / knownLocations come from the listings in the database
module.exports.parseSearchWithRules = (query, { knownCountries = [], knownLocations = [] } = {}) => {
    const text = query.toLowerCase();
    const { minPrice, maxPrice } = parsePrices(text);
    const hasWord = (word) => new RegExp(`(^|[^a-z])${word.toLowerCase()}($|[^a-z])`).test(text);

    let country = knownCountries.find((name) => hasWord(name)) || null;
    if (!country) {
        const alias = Object.keys(COUNTRY_ALIASES).find((name) => hasWord(name));
        if (alias) country = COUNTRY_ALIASES[alias];
    }

    const places = new Set();
    for (const location of knownLocations) {
        const place = location.split(',')[0].trim();
        if (place.length > 2 && hasWord(place)) places.add(place);
    }
    const keywords = new Set();
    for (const word of text.match(/[a-z]+/g) || []) {
        if (SYNONYM_LOOKUP[word]) keywords.add(SYNONYM_LOOKUP[word]);
    }

    const parts = [];
    if (keywords.size) parts.push([...keywords].join(', '));
    if (places.size) parts.push(`in ${[...places].join(' or ')}`);
    if (country) parts.push(`in ${country}`);
    if (minPrice != null && maxPrice != null) parts.push(`₹${minPrice}-₹${maxPrice} a night`);
    else if (maxPrice != null) parts.push(`up to ₹${maxPrice} a night`);
    else if (minPrice != null) parts.push(`from ₹${minPrice} a night`);

    return {
        keywords: [...keywords].slice(0, 6),
        places: [...places],
        country,
        minPrice,
        maxPrice,
        summary: parts.length ? `Looking for: ${parts.join(' ')}` : 'Showing everything that matches your words',
    };
};

// Words that say nothing about the kind of place, so they make poor keywords
module.exports.GENERIC_WORDS = new Set([
    'stay', 'stays', 'place', 'places', 'trip', 'travel', 'vacation', 'holiday', 'holidays',
    'rental', 'home', 'house', 'room', 'rooms', 'night', 'nights', 'somewhere', 'something',
    'cheap', 'budget', 'affordable', 'expensive', 'nice', 'good', 'great', 'best', 'beautiful',
    'week', 'weekend', 'days', 'getaway', 'escape', 'retreat', 'accommodation', 'hotel',
    'cozy', 'cosy', 'romantic', 'quiet', 'peaceful', 'relaxing', 'charming', 'lovely',
]);

module.exports.expandKeyword =(keyword) => SYNONYMS[keyword.toLowerCase()] || [keyword];

const { MAPBOX_TOKEN } = require('../config/mapbox.js');

const COUNTRY_CODES = {
    'united states': 'us',
    usa: 'us',
    india: 'in',
    'united kingdom': 'gb',
    uk: 'gb',
    canada: 'ca',
    australia: 'au',
    mexico: 'mx',
    france: 'fr',
    germany: 'de',
    italy: 'it',
    spain: 'es',
    japan: 'jp',
    china: 'cn',
    brazil: 'br',
    switzerland: 'ch',
    netherlands: 'nl',
    greece: 'gr',
    thailand: 'th',
    indonesia: 'id',
    'united arab emirates': 'ae',
    uae: 'ae',
    tanzania: 'tz',
    fiji: 'fj',
    maldives: 'mv',
    'costa rica': 'cr',
    'new zealand': 'nz',
    portugal: 'pt',
    turkey: 'tr',
    egypt: 'eg',
    'south africa': 'za',
    argentina: 'ar',
    chile: 'cl',
    colombia: 'co',
    peru: 'pe',
    sweden: 'se',
    norway: 'no',
    denmark: 'dk',
    finland: 'fi',
    ireland: 'ie',
    scotland: 'gb',
    wales: 'gb',
    england: 'gb',
};

const LOCATION_HINTS = {
    'lake tahoe': ['california', 'nevada', 'south lake tahoe'],
    'scottish highlands': ['scotland', 'highland', 'inverness'],
    'serengeti national park': ['tanzania', 'serengeti'],
    'cotswolds': ['england', 'gloucestershire', 'oxfordshire'],
    'new york city': ['new york, new york'],
};

const FALLBACK_QUERIES = {
    'scottish highlands|united kingdom': 'Inverness, Scotland',
    'serengeti national park|tanzania': 'Serengeti, Tanzania',
};

const normalize = (value = '') => value.trim().toLowerCase();

const getCountryCode = (country = '') => COUNTRY_CODES[normalize(country)] || '';

const countryMatches = (feature, country) => {
    const target = normalize(country);
    if (!target) return true;

    const countryContext = feature.context?.find((item) => item.id.startsWith('country'));
    if (countryContext && normalize(countryContext.text) === target) return true;

    return normalize(feature.place_name).includes(target);
};

const buildSearchQueries = (location, country) => {
    const cleanLocation = location?.trim() || '';
    const cleanCountry = country?.trim() || '';
    const queries = [];
    const fallbackKey = `${normalize(cleanLocation)}|${normalize(cleanCountry)}`;

    if (FALLBACK_QUERIES[fallbackKey]) {
        queries.push(FALLBACK_QUERIES[fallbackKey]);
    }
    if (cleanLocation && cleanCountry && normalize(cleanLocation) !== normalize(cleanCountry)) {
        queries.push(`${cleanLocation}, ${cleanCountry}`);
    }
    if (cleanLocation) queries.push(cleanLocation);
    if (cleanCountry) queries.push(cleanCountry);

    return [...new Set(queries)];
};

const scoreFeature = (feature, location, country) => {
    let score = feature.relevance || 0;
    const placeName = normalize(feature.place_name);
    const featureText = normalize(feature.text);
    const locationKey = normalize(location);

    if (countryMatches(feature, country)) score += 100;
    if (featureText === locationKey || placeName.startsWith(locationKey)) score += 60;
    if (placeName.includes(locationKey)) score += 30;

    const hints = LOCATION_HINTS[locationKey] || [];
    if (hints.some((hint) => placeName.includes(hint))) score += 80;
    if (hints.length && !hints.some((hint) => placeName.includes(hint))) score -= 100;

    if (locationKey.includes('lake tahoe') && placeName.includes('texas')) score -= 200;
    if (locationKey.includes('scottish highlands') && !placeName.includes('scotland') && !placeName.includes('highland')) {
        score -= 200;
    }

    return score;
};

const pickBestFeature = (features, location, country) => {
    if (!features?.length) return null;
    return [...features].sort((a, b) => scoreFeature(b, location, country) - scoreFeature(a, location, country))[0];
};

const fetchFeatures = async (query, { countryCode, types }) => {
    const params = new URLSearchParams({
        access_token: MAPBOX_TOKEN,
        limit: '5',
    });

    if (types) params.set('types', types);
    if (countryCode) params.set('country', countryCode);

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    return data.features || [];
};

module.exports.geocodeLocation = async (location, country) => {
    if (!MAPBOX_TOKEN) return null;

    const countryCode = getCountryCode(country);
    const queries = buildSearchQueries(location, country);
    const attempts = [
        { types: 'place,locality,neighborhood,address,region,district,poi', countryCode },
        { types: '', countryCode },
        { types: '', countryCode: '' },
    ];

    let bestFeature = null;
    let bestScore = -Infinity;

    for (const query of queries) {
        for (const attempt of attempts) {
            const features = await fetchFeatures(query, attempt);
            const feature = pickBestFeature(features, location, country);
            if (!feature) continue;

            const score = scoreFeature(feature, location, country);
            if (score > bestScore) {
                bestScore = score;
                bestFeature = feature;
            }
        }
    }

    if (!bestFeature) return null;

    const [lng, lat] = bestFeature.center;
    return { type: 'Point', coordinates: [lng, lat] };
};

module.exports.resolveGeometry = async ({ lng, lat, location, country }) => {
    const parsedLng = Number(lng);
    const parsedLat = Number(lat);
    if (!Number.isNaN(parsedLng) && !Number.isNaN(parsedLat)) {
        return { type: 'Point', coordinates: [parsedLng, parsedLat] };
    }
    return module.exports.geocodeLocation(location, country);
};

module.exports.hasValidCoordinates = (coordinates) =>
    Array.isArray(coordinates) && coordinates.length === 2;

module.exports.buildGeocodeUrl = (location, country, token) => {
    const query = encodeURIComponent(buildSearchQueries(location, country)[0] || location);
    const countryCode = getCountryCode(country);
    const params = new URLSearchParams({
        access_token: token,
        limit: '5',
        types: 'place,locality,neighborhood,address,region,district,poi',
    });
    if (countryCode) params.set('country', countryCode);
    return `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?${params}`;
};

module.exports.pickBestFeature = pickBestFeature;
module.exports.scoreFeature = scoreFeature;
module.exports.buildSearchQueries = buildSearchQueries;
module.exports.getCountryCode = getCountryCode;

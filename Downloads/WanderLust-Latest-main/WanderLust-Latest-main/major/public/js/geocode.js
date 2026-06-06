const COUNTRY_CODES = {
    'united states': 'us',
    usa: 'us',
    india: 'in',
    'united kingdom': 'gb',
    uk: 'gb',
    canada: 'ca',
    mexico: 'mx',
    italy: 'it',
    switzerland: 'ch',
    netherlands: 'nl',
    greece: 'gr',
    thailand: 'th',
    indonesia: 'id',
    'united arab emirates': 'ae',
    tanzania: 'tz',
    fiji: 'fj',
    maldives: 'mv',
    'costa rica': 'cr',
    japan: 'jp',
};

const LOCATION_HINTS = {
    'lake tahoe': ['california', 'nevada', 'south lake tahoe'],
    'scottish highlands': ['scotland', 'highland', 'inverness'],
    'serengeti national park': ['tanzania', 'serengeti'],
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

    return score;
};

const pickBestFeature = (features, location, country) => {
    if (!features?.length) return null;
    return [...features].sort((a, b) => scoreFeature(b, location, country) - scoreFeature(a, location, country))[0];
};

const fetchFeatures = async (query, token, { countryCode, types }) => {
    const params = new URLSearchParams({ access_token: token, limit: '5' });
    if (types) params.set('types', types);
    if (countryCode) params.set('country', countryCode);

    const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`
    );
    const data = await response.json();
    return data.features || [];
};

window.geocodePlace = async (location, country, token) => {
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
            const features = await fetchFeatures(query, token, attempt);
            const feature = pickBestFeature(features, location, country);
            if (!feature) continue;

            const score = scoreFeature(feature, location, country);
            if (score > bestScore) {
                bestScore = score;
                bestFeature = feature;
            }
        }
    }

    return bestFeature?.center || null;
};

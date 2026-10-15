// AI features with free options. Provider order:
//   1. Claude, if ANTHROPIC_API_KEY is set (paid)
//   2. Ollama running on this computer (free, local)
//   3. Built-in rules and templates (free, no AI)
const Anthropic = require('@anthropic-ai/sdk');
const { z } = require('zod');
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
const ExpressError = require('../utils/ExpressError.js');
const { isOllamaAvailable, ollamaText, ollamaJSON, OLLAMA_MODEL } = require('./ollama.js');
const { parseSearchWithRules, GENERIC_WORDS } = require('./searchRules.js');

const CLAUDE_MODEL = process.env.AI_MODEL || 'claude-opus-5-5';

const claudeEnabled = () =>
    Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

module.exports.getAiStatus = async () => {
    if (claudeEnabled()) return { provider: 'claude', label: 'Claude', canPlan: true };
    if (await isOllamaAvailable()) {
        return { provider: 'ollama', label: `${OLLAMA_MODEL} on your PC (free)`, canPlan: true };
    }
    return { provider: 'none', label: 'built-in rules (free)', canPlan: false };
};

// ---------- Claude ----------

// If a request is declined by Claude's safety classifiers, the API retries it
// on Anthropic's recommended fallback model instead of returning a refusal.
const FALLBACK_OPTIONS = {
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
};

let client;
const getClient = () => {
    if (!client) client = new Anthropic();
    return client;
};

const ensureNotRefused = (response) => {
    if (response.stop_reason === 'refusal') {
        throw new ExpressError("The AI assistant can't help with that request.", 422);
    }
};

const toAppError = (err) => {
    if (err instanceof ExpressError) return err;
    if (err instanceof Anthropic.AuthenticationError) {
        return new ExpressError('AI is not configured correctly (invalid ANTHROPIC_API_KEY).', 503);
    }
    if (err instanceof Anthropic.RateLimitError) {
        return new ExpressError('The AI assistant is busy right now. Please try again in a moment.', 429);
    }
    if (err instanceof Anthropic.APIError) {
        console.error(`Claude API error ${err.status}:`, err.message);
        return new ExpressError('The AI assistant is unavailable right now.', 502);
    }
    return err;
};

const claudeText = async (system, prompt) => {
    try {
        const response = await getClient().beta.messages.create({
            ...FALLBACK_OPTIONS,
            model: CLAUDE_MODEL,
            max_tokens: 4000,
            output_config: { effort: 'low' },
            system,
            messages: [{ role: 'user', content: prompt }],
        });
        ensureNotRefused(response);
        return response.content
            .filter((block) => block.type === 'text')
            .map((block) => block.text)
            .join('')
            .trim();
    } catch (err) {
        throw toAppError(err);
    }
};

// ---------- shared prompts ----------

const generateText = async (system, prompt) => {
    const { provider } = await module.exports.getAiStatus();
    if (provider === 'claude') return claudeText(system, prompt);
    if (provider === 'ollama') return ollamaText(system, prompt);
    throw new ExpressError(
        'Free AI is off. Start Ollama on this computer (or add ANTHROPIC_API_KEY) to use this.',
        503
    );
};

const DESCRIBE_SYSTEM =
    'You write vivid, honest descriptions for vacation-rental listings. ' +
    'Reply with the description only: 2-3 sentences, under 60 words, ' +
    'no headings, no quotation marks, no markdown. ' +
    'Do not invent amenities, room counts or facts that were not given.';

// Free fallback when no AI is available: a simple template
const templateDescription = ({ title, location, country }) => {
    const place = [location, country].filter(Boolean).join(', ');
    const name = title || 'This stay';
    return place
        ? `${name} is your base for discovering ${place}. Settle in, explore the neighbourhood at your own pace, and come back to a comfortable, welcoming place to unwind.`
        : `${name} is a comfortable, welcoming place to unwind. Settle in, explore at your own pace, and make yourself at home.`;
};

module.exports.describeListing = async (fields) => {
    const { provider } = await module.exports.getAiStatus();
    if (provider === 'none') return { text: templateDescription(fields), source: 'template' };
    const prompt = [
        `Title: ${fields.title || 'Untitled stay'}`,
        `Location: ${[fields.location, fields.country].filter(Boolean).join(', ') || 'unknown'}`,
        fields.price ? `Price per night: ₹${fields.price}` : '',
    ]
        .filter(Boolean)
        .join('\n');
    return { text: await generateText(DESCRIBE_SYSTEM, prompt), source: provider };
};

module.exports.planTrip = async (listing) => {
    const text = await generateText(
        'You are a friendly local travel guide. Plan a short stay for a guest of a vacation rental. ' +
            'Use plain text only - no markdown symbols such as #, * or **. ' +
            "Format exactly: three lines starting 'Day 1:', 'Day 2:' and 'Day 3:', " +
            "then a line 'Local tips:' followed by 2-3 lines starting with '- '. Keep it under 160 words.",
        `The guest is staying at "${listing.title}" in ${listing.location}, ${listing.country}.\n` +
            `About the stay: ${listing.description || 'n/a'}`
    );
    // small local models sometimes add markdown anyway
    return { text: text.replace(/\*\*|__|^#+\s*/gm, '') };
};

// ---------- smart search ----------

const SEARCH_SYSTEM =
    "Turn a traveller's request into search filters for a vacation-rental site. " +
    'keywords: 1-4 single words for the kind of place (e.g. beach, cabin, villa, mountain, lake), not countries. ' +
    'Prices are nightly, in Indian rupees; convert other currencies roughly. ' +
    'Use null for anything the request does not mention.';

const SearchFilters = z.object({
    keywords: z.array(z.string()),
    country: z.string().nullable(),
    minPrice: z.number().nullable(),
    maxPrice: z.number().nullable(),
    summary: z.string().describe('A short friendly restatement of what the user is looking for'),
});

const SEARCH_JSON_SCHEMA = {
    type: 'object',
    properties: {
        keywords: { type: 'array', items: { type: 'string' } },
        country: { type: ['string', 'null'] },
        minPrice: { type: ['number', 'null'] },
        maxPrice: { type: ['number', 'null'] },
        summary: { type: 'string' },
    },
    required: ['keywords', 'country', 'minPrice', 'maxPrice', 'summary'],
};

const claudeSearch = async (query) => {
    try {
        const response = await getClient().beta.messages.parse({
            ...FALLBACK_OPTIONS,
            model: CLAUDE_MODEL,
            max_tokens: 4000,
            output_config: { effort: 'low', format: zodOutputFormat(SearchFilters) },
            system: SEARCH_SYSTEM,
            messages: [{ role: 'user', content: query }],
        });
        ensureNotRefused(response);
        if (!response.parsed_output) {
            throw new ExpressError("The AI couldn't understand that search. Try rephrasing it.", 422);
        }
        return response.parsed_output;
    } catch (err) {
        throw toAppError(err);
    }
};

// Rules are always right about prices and countries; AI adds understanding of
// the kind of place (e.g. "somewhere to surf" -> beach). Rules win on conflicts.
const mergeFilters = (rules, ai, query, { knownCountries, knownLocations }) => {
    const countryNames = new Set(knownCountries.map((c) => c.toLowerCase()));
    const placeNames = new Map(
        knownLocations.map((l) => l.split(',')[0].trim()).map((p) => [p.toLowerCase(), p])
    );
    const aiCountry =
        ai.country && knownCountries.find((c) => c.toLowerCase() === ai.country.toLowerCase());

    const keywords = new Set(rules.keywords);
    const places = new Set(rules.places);
    for (const word of ai.keywords || []) {
        const clean = String(word).trim().toLowerCase();
        if (placeNames.has(clean)) places.add(placeNames.get(clean));
        else if (
            clean.length >= 3 &&
            !/\s/.test(clean) &&
            !countryNames.has(clean) &&
            !GENERIC_WORDS.has(clean)
        ) {
            keywords.add(clean);
        }
    }

    // Only trust AI prices when the user typed a number the rules couldn't read
    let { minPrice, maxPrice } = rules;
    if (minPrice == null && maxPrice == null && /\d/.test(query)) {
        minPrice = ai.minPrice ?? null;
        maxPrice = ai.maxPrice ?? null;
        if (minPrice != null && minPrice === maxPrice) minPrice = null; // "under 2000" read as 2000-2000
    }

    return {
        keywords: [...keywords].slice(0, 6),
        places: [...places],
        country: rules.country || aiCountry || null,
        minPrice,
        maxPrice,
        summary: ai.summary || rules.summary,
    };
};

// context: { knownCountries, knownLocations } from the database
module.exports.smartSearch = async (query, context) => {
    const rules = parseSearchWithRules(query, context);
    const { provider } = await module.exports.getAiStatus();
    if (provider === 'none') return { ...rules, source: 'rules' };

    try {
        const ai =
            provider === 'claude'
                ? await claudeSearch(query)
                : await ollamaJSON(SEARCH_SYSTEM, query, SEARCH_JSON_SCHEMA);
        return { ...mergeFilters(rules, ai, query, context), source: provider };
    } catch (err) {
        console.error('AI search failed, using built-in rules:', err.message);
        return { ...rules, source: 'rules' };
    }
};

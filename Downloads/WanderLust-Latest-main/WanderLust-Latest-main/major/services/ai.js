const Anthropic = require('@anthropic-ai/sdk');
const { z } = require('zod');
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
const ExpressError = require('../utils/ExpressError.js');

const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';

// If a request is declined by Claude's safety classifiers, the API retries it
// on Anthropic's recommended fallback model instead of returning a refusal.
const FALLBACK_OPTIONS = {
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
};

module.exports.aiEnabled = () =>
    Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

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

const generateText = async (system, prompt) => {
    try {
        const response = await getClient().beta.messages.create({
            ...FALLBACK_OPTIONS,
            model: MODEL,
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

module.exports.describeListing = ({ title, location, country, price }) =>
    generateText(
        'You write vivid, honest descriptions for vacation-rental listings. ' +
            'Reply with the description only: 2-3 sentences, under 60 words, ' +
            'no headings, no quotation marks, no markdown.',
        [
            `Title: ${title || 'Untitled stay'}`,
            `Location: ${[location, country].filter(Boolean).join(', ') || 'unknown'}`,
            price ? `Price per night: ₹${price}` : '',
        ]
            .filter(Boolean)
            .join('\n')
    );

module.exports.planTrip = (listing) =>
    generateText(
        'You are a friendly local travel guide. Plan a short stay for a guest of a vacation rental. ' +
            'Use plain text only - no markdown symbols such as #, * or **. ' +
            "Format exactly: three lines starting 'Day 1:', 'Day 2:' and 'Day 3:', " +
            "then a line 'Local tips:' followed by 2-3 lines starting with '- '. Keep it under 160 words.",
        `The guest is staying at "${listing.title}" in ${listing.location}, ${listing.country}.\n` +
            `About the stay: ${listing.description || 'n/a'}`
    );

const SearchFilters = z.object({
    keywords: z
        .array(z.string())
        .describe('1-4 short single words describing the kind of place, e.g. beach, cabin, villa, mountain'),
    country: z.string().nullable().describe('Country name in English if the user named one, else null'),
    minPrice: z.number().nullable().describe('Minimum nightly price in INR, or null'),
    maxPrice: z.number().nullable().describe('Maximum nightly price in INR, or null'),
    summary: z.string().describe('A short friendly restatement of what the user is looking for'),
});

module.exports.parseSearch = async (query) => {
    try {
        const response = await getClient().beta.messages.parse({
            ...FALLBACK_OPTIONS,
            model: MODEL,
            max_tokens: 4000,
            output_config: { effort: 'low', format: zodOutputFormat(SearchFilters) },
            system:
                'Turn a traveller\'s request into search filters for a vacation-rental site. ' +
                'Prices are nightly, in Indian rupees (₹); convert other currencies roughly. ' +
                'Leave a filter null when the request does not mention it.',
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

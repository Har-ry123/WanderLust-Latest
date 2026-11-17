// Free hosted AI through Google Gemini (https://aistudio.google.com/apikey).
// Works on deployed servers (Render etc.), unlike Ollama which needs a local PC.
const ExpressError = require('../utils/ExpressError.js');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

module.exports.GEMINI_MODEL = GEMINI_MODEL;
module.exports.geminiEnabled = () => Boolean(process.env.GEMINI_API_KEY);

const generate = async (system, prompt, { json = false } = {}) => {
    let response;
    try {
        response = await fetch(`${API_BASE}/${GEMINI_MODEL}:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': process.env.GEMINI_API_KEY,
            },
            signal: AbortSignal.timeout(60 * 1000),
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: system }] },
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: json ? 0 : 0.7,
                    ...(json && { responseMimeType: 'application/json' }),
                },
            }),
        });
    } catch (err) {
        console.error('Gemini request failed:', err.message);
        throw new ExpressError('The AI assistant is unavailable right now.', 502);
    }
    if (response.status === 429) {
        throw new ExpressError('The AI assistant is busy right now. Please try again in a moment.', 429);
    }
    if (response.status === 400 || response.status === 401 || response.status === 403) {
        console.error(`Gemini API error ${response.status}: check GEMINI_API_KEY / GEMINI_MODEL`);
        throw new ExpressError('AI is not configured correctly (check GEMINI_API_KEY).', 503);
    }
    if (!response.ok) {
        console.error(`Gemini API error ${response.status}`);
        throw new ExpressError('The AI assistant is unavailable right now.', 502);
    }
    const data = await response.json();
    const text = (data.candidates?.[0]?.content?.parts || [])
        .map((part) => part.text || '')
        .join('')
        .trim();
    if (!text) throw new ExpressError("The AI assistant can't help with that request.", 422);
    return text;
};

module.exports.geminiText = (system, prompt) => generate(system, prompt);

module.exports.geminiJSON = async (system, prompt, schema) => {
    const text = await generate(
        `${system}\nReply with JSON only, matching this JSON schema: ${JSON.stringify(schema)}`,
        prompt,
        { json: true }
    );
    try {
        return JSON.parse(text);
    } catch {
        throw new ExpressError("The AI couldn't understand that. Try rephrasing it.", 422);
    }
};

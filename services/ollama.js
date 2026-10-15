// Free local AI through Ollama (https://ollama.com) running on this computer
const ExpressError = require('../utils/ExpressError.js');

const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const STATUS_TTL_MS = 30 * 1000;

let status = { available: false, checkedAt: 0 };

// Is Ollama running with the model pulled? Cached so pages don't wait on it.
module.exports.isOllamaAvailable = async () => {
    if (Date.now() - status.checkedAt < STATUS_TTL_MS) return status.available;
    let available = false;
    try {
        const response = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(800) });
        if (response.ok) {
            const { models = [] } = await response.json();
            available = models.some(
                (m) => m.name === OLLAMA_MODEL || m.name === `${OLLAMA_MODEL}:latest`
            );
        }
    } catch {
        available = false;
    }
    status = { available, checkedAt: Date.now() };
    return available;
};

module.exports.OLLAMA_MODEL = OLLAMA_MODEL;

const chat = async (system, prompt, format) => {
    let response;
    try {
        response = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(120 * 1000),
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                stream: false,
                ...(format && { format }),
                options: { temperature: format ? 0 : 0.7 },
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: prompt },
                ],
            }),
        });
    } catch (err) {
        status.checkedAt = 0; // re-check availability next time
        throw new ExpressError('The local AI (Ollama) is not responding. Is it running?', 503);
    }
    if (!response.ok) {
        throw new ExpressError(`The local AI (Ollama) returned an error (${response.status}).`, 502);
    }
    const data = await response.json();
    return (data.message?.content || '').trim();
};

module.exports.ollamaText = (system, prompt) => chat(system, prompt);

module.exports.ollamaJSON = async (system, prompt, schema) => {
    const text = await chat(system, prompt, schema);
    try {
        return JSON.parse(text);
    } catch {
        throw new ExpressError("The local AI couldn't understand that. Try rephrasing it.", 422);
    }
};

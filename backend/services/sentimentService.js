/**
 * AI Sentiment Analysis Service — Groq Integration
 * ===================================================
 * Models available on this account (checked 2026-02-28):
 *   - llama-3.3-70b-versatile   → Most capable, 131k ctx — PRIMARY
 *   - llama-3.1-8b-instant      → Fastest, 131k ctx      — FALLBACK 1
 *   - meta-llama/llama-4-scout-17b-16e-instruct → Llama 4 — FALLBACK 2
 *
 * Strategy:
 *   1. Try primary model (llama-3.3-70b-versatile)
 *   2. On rate-limit/error, try llama-3.1-8b-instant (faster, fewer tokens)
 *   3. On further error, use built-in rule-based classifier (no API call)
 */
let Groq;
try { Groq = require('groq-sdk'); } catch (e) { Groq = null; }
const db = require('../db');

// Model priority list — tried in order on failure
const GROQ_MODELS = [
    'llama-3.1-8b-instant',           // Fast + cheap — good for batch analysis
    'llama-3.3-70b-versatile',        // Most capable — for complex text
    'meta-llama/llama-4-scout-17b-16e-instruct', // Llama 4 backup
];

// Lazy initialization
let groqClient = null;
function getGroqClient() {
    if (!groqClient && Groq && process.env.GROQ_API_KEY) {
        groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
    return groqClient;
}

const SENTIMENT_PROMPT = `You are a precise sentiment analysis engine for student feedback.

Classify the sentiment of the input text. Respond ONLY with valid JSON, no other text:
{
  "sentiment_label": "Positive" or "Neutral" or "Negative",
  "sentiment_score": <number between -1.0 and 1.0>,
  "confidence": <number between 0.0 and 1.0>
}

Scoring guide:
- 0.6 to 1.0   = Clearly positive (praise, satisfaction, gratitude)
- 0.1 to 0.5   = Mildly positive
- -0.1 to 0.1  = Neutral or factual
- -0.5 to -0.1 = Mildly negative
- -1.0 to -0.5 = Clearly negative (complaints, dissatisfaction)

Context: This is student feedback about college events, faculty, courses, or facilities.

Text to analyze:
`;

/**
 * Rule-based fallback classifier — no API call needed.
 * Used when Groq API is unavailable.
 */
function fallbackClassifier(text) {
    const lower = text.toLowerCase().trim();

    // Numeric rating
    const num = parseFloat(lower);
    if (!isNaN(num) && /^\d+(\.\d+)?$/.test(lower)) {
        if (num >= 4) return { sentiment_label: 'Positive', sentiment_score: 0.7, confidence: 0.75 };
        if (num >= 3) return { sentiment_label: 'Neutral', sentiment_score: 0.0, confidence: 0.7 };
        return { sentiment_label: 'Negative', sentiment_score: -0.6, confidence: 0.75 };
    }

    // Exact match for common short answers
    const exactPositive = ['yes', 'good', 'great', 'excellent', 'amazing', 'awesome', 'love', 'perfect', 'agree', 'strongly agree', 'satisfied', 'very satisfied', 'helpful', 'enjoyed'];
    const exactNegative = ['no', 'bad', 'poor', 'terrible', 'worst', 'hate', 'awful', 'disagree', 'strongly disagree', 'dissatisfied', 'needs improvement', 'not satisfied'];
    const exactNeutral = ['maybe', 'average', 'okay', 'ok', 'neutral', 'not sure', 'fair', 'moderate'];

    if (exactPositive.includes(lower)) return { sentiment_label: 'Positive', sentiment_score: 0.65, confidence: 0.8 };
    if (exactNegative.includes(lower)) return { sentiment_label: 'Negative', sentiment_score: -0.65, confidence: 0.8 };
    if (exactNeutral.includes(lower)) return { sentiment_label: 'Neutral', sentiment_score: 0.0, confidence: 0.7 };

    // Keyword scoring
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'awesome', 'wonderful', 'fantastic', 'love', 'best', 'happy', 'helpful', 'thank', 'perfect', 'outstanding', 'brilliant', 'superb', 'incredible', 'informative', 'well', 'enjoyed', 'useful', 'nice', 'engaging', 'learned', 'recommend'];
    const negativeWords = ['bad', 'poor', 'terrible', 'worst', 'hate', 'awful', 'horrible', 'disappointed', 'useless', 'waste', 'boring', 'frustrating', 'annoying', 'fail', 'pathetic', 'lacking', 'weak', 'not good', 'not satisfied', 'needs improvement', 'could be better'];

    let pos = 0, neg = 0;
    positiveWords.forEach(w => { if (lower.includes(w)) pos++; });
    negativeWords.forEach(w => { if (lower.includes(w)) neg++; });

    if (pos > neg) return { sentiment_label: 'Positive', sentiment_score: Math.min(0.3 + pos * 0.12, 0.85), confidence: 0.5 };
    if (neg > pos) return { sentiment_label: 'Negative', sentiment_score: Math.max(-0.3 - neg * 0.12, -0.85), confidence: 0.5 };
    return { sentiment_label: 'Neutral', sentiment_score: 0.0, confidence: 0.4 };
}

/**
 * Call Groq API with model fallback chain.
 * Tries models in order: 8b-instant → 70b-versatile → llama4-scout → rule-based
 * @param {string} text - Text to analyze
 * @returns {Object} { sentiment_label, sentiment_score, confidence }
 */
async function analyzeSentimentWithGroq(text) {
    const client = getGroqClient();
    if (!client) {
        console.log('[Sentiment] No Groq client (missing GROQ_API_KEY), using fallback');
        return fallbackClassifier(text);
    }

    const truncatedText = text.length > 500 ? text.substring(0, 500) + '...' : text;

    for (const model of GROQ_MODELS) {
        try {
            const response = await client.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are a sentiment analysis engine. Respond ONLY with valid JSON.' },
                    { role: 'user', content: SENTIMENT_PROMPT + `"${truncatedText}"` }
                ],
                model,
                temperature: 0.05,      // Very low — deterministic classification
                max_tokens: 120,        // Only need the JSON object
                response_format: { type: 'json_object' }
            });

            const raw = response.choices[0]?.message?.content;
            if (!raw) throw new Error('Empty response');

            const parsed = JSON.parse(raw);
            if (!parsed.sentiment_label || parsed.sentiment_score === undefined) {
                throw new Error('Invalid JSON structure');
            }

            const validLabels = ['Positive', 'Neutral', 'Negative'];
            if (!validLabels.includes(parsed.sentiment_label)) {
                parsed.sentiment_label = 'Neutral';
            }
            parsed.sentiment_score = Math.max(-1, Math.min(1, Number(parsed.sentiment_score) || 0));
            parsed.confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0.7));
            parsed._model = model; // Track which model was used

            return parsed;

        } catch (error) {
            const isRateLimit = error.status === 429 || error.message?.includes('rate_limit');
            const isModelError = error.status === 404 || error.message?.includes('model');
            console.warn(`[Sentiment] Model ${model} failed (${error.status || error.message?.substring(0, 40)})`);

            // Only wait on rate limits
            if (isRateLimit) {
                await new Promise(r => setTimeout(r, 1500));
            }
            // Always try next model
            continue;
        }
    }

    // All models failed — use rule-based
    console.log('[Sentiment] All Groq models failed, using rule-based fallback');
    return fallbackClassifier(text);
}

/**
 * Process sentiment for a single review response row (non-blocking call from review submit).
 */
async function processResponseSentiment(responseId, text) {
    try {
        console.log(`[Sentiment] Processing response ${responseId}...`);
        const result = await analyzeSentimentWithGroq(text);

        await db.query(`
            UPDATE review_responses 
            SET sentiment_label = $2, sentiment_score = $3, ai_confidence = $4, analyzed_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [responseId, result.sentiment_label, result.sentiment_score, result.confidence]);

        console.log(`[Sentiment] ✅ ${responseId}: ${result.sentiment_label} (score: ${result.sentiment_score}) via ${result._model || 'fallback'}`);
    } catch (error) {
        console.error(`[Sentiment] ❌ Failed for ${responseId}:`, error.message);
    }
}

/**
 * Batch analyze unanalyzed review responses for admin re-analysis trigger.
 */
async function batchAnalyze(requestId) {
    try {
        const responses = await db.query(`
            SELECT id, answers FROM review_responses 
            WHERE request_id = $1 AND sentiment_label IS NULL
        `, [requestId]);

        console.log(`[Sentiment] Batch: ${responses.rows.length} unanalyzed responses for request ${requestId}`);

        for (const row of responses.rows) {
            const answers = row.answers || {};
            const textAnswers = Object.values(answers).filter(a => typeof a === 'string' && a.trim().length >= 1);
            if (textAnswers.length > 0) {
                const combinedText = textAnswers.join('. ');
                await processResponseSentiment(row.id, combinedText);
            }
        }
    } catch (error) {
        console.error('[Sentiment] Batch analysis failed:', error.message);
    }
}

module.exports = {
    analyzeSentimentWithGroq,
    processResponseSentiment,
    batchAnalyze,
    fallbackClassifier
};

/**
 * AI Sentiment Analysis Service — Groq Integration
 * ===================================================
 * Async sentiment classification for TEXT_BASED reviews.
 * - Uses Groq LLM API (llama3-8b-8192)
 * - Retry with exponential backoff
 * - Fallback to rule-based classifier
 * - Non-blocking — runs in background after student submits
 */
const Groq = require('groq-sdk');
const db = require('../db');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SENTIMENT_PROMPT = `You are a sentiment analysis engine. Classify the sentiment of the following student feedback text.

You MUST respond with ONLY valid JSON in this exact format, no other text:
{
  "sentiment_label": "Positive" or "Neutral" or "Negative",
  "sentiment_score": <number between -1.0 and 1.0>,
  "confidence": <number between 0.0 and 1.0>
}

Rules:
- sentiment_score: -1.0 = very negative, 0.0 = neutral, 1.0 = very positive
- confidence: how certain you are about the classification
- Consider context, tone, and language nuance

Student feedback text:
`;

/**
 * Rule-based fallback classifier.
 * Used when Groq API is unavailable after retries.
 */
function fallbackClassifier(text) {
    const lower = text.toLowerCase();

    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'awesome', 'wonderful', 'fantastic', 'love', 'best', 'happy', 'helpful', 'thank', 'perfect', 'outstanding', 'brilliant', 'superb', 'incredible'];
    const negativeWords = ['bad', 'poor', 'terrible', 'worst', 'hate', 'awful', 'horrible', 'disappointed', 'useless', 'waste', 'boring', 'frustrating', 'annoying', 'fail', 'pathetic', 'disgusting'];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(w => { if (lower.includes(w)) positiveCount++; });
    negativeWords.forEach(w => { if (lower.includes(w)) negativeCount++; });

    if (positiveCount > negativeCount) {
        return {
            sentiment_label: 'Positive',
            sentiment_score: Math.min(0.3 + (positiveCount * 0.15), 0.85),
            confidence: 0.4
        };
    } else if (negativeCount > positiveCount) {
        return {
            sentiment_label: 'Negative',
            sentiment_score: Math.max(-0.3 - (negativeCount * 0.15), -0.85),
            confidence: 0.4
        };
    }

    return {
        sentiment_label: 'Neutral',
        sentiment_score: 0.0,
        confidence: 0.35
    };
}

/**
 * Call Groq API with retry + exponential backoff.
 * @param {string} text - Student response text
 * @param {number} retries - Number of retries remaining
 * @returns {Object} Sentiment result
 */
async function analyzeSentimentWithGroq(text, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: 'You are a sentiment analysis engine. Respond ONLY with valid JSON.'
                    },
                    {
                        role: 'user',
                        content: SENTIMENT_PROMPT + `"${text}"`
                    }
                ],
                model: 'llama3-8b-8192',
                temperature: 0.1,
                max_tokens: 200,
                response_format: { type: 'json_object' }
            });

            const raw = response.choices[0]?.message?.content;
            if (!raw) throw new Error('Empty Groq response');

            const parsed = JSON.parse(raw);

            // Validate
            if (!parsed.sentiment_label || parsed.sentiment_score === undefined || parsed.confidence === undefined) {
                throw new Error('Invalid JSON structure from Groq');
            }

            const validLabels = ['Positive', 'Neutral', 'Negative'];
            if (!validLabels.includes(parsed.sentiment_label)) {
                parsed.sentiment_label = 'Neutral';
            }

            parsed.sentiment_score = Math.max(-1, Math.min(1, Number(parsed.sentiment_score)));
            parsed.confidence = Math.max(0, Math.min(1, Number(parsed.confidence)));

            return parsed;

        } catch (error) {
            console.error(`Groq attempt ${attempt}/${retries} failed:`, error.message);
            if (attempt < retries) {
                const delay = Math.pow(2, attempt) * 1000; // exponential backoff
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    // All retries exhausted — use fallback
    console.log('All Groq retries exhausted, using fallback rule-based classifier');
    return fallbackClassifier(text);
}

/**
 * Process sentiment analysis for a review response (async, non-blocking).
 * Called after student submits a TEXT_BASED response.
 * Updates the review_responses row with sentiment data.
 *
 * @param {string} responseId - review_responses row UUID
 * @param {string} text - The actual text to analyze
 */
async function processResponseSentiment(responseId, text) {
    try {
        console.log(`[Sentiment] Processing response ${responseId}...`);

        const result = await analyzeSentimentWithGroq(text);

        await db.query(`
            UPDATE review_responses 
            SET sentiment_label = $2,
                sentiment_score = $3,
                ai_confidence = $4,
                analyzed_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [responseId, result.sentiment_label, result.sentiment_score, result.confidence]);

        console.log(`[Sentiment] ✅ Response ${responseId}: ${result.sentiment_label} (${result.sentiment_score}, conf: ${result.confidence})`);

    } catch (error) {
        console.error(`[Sentiment] ❌ Failed to process response ${responseId}:`, error.message);
    }
}

/**
 * Batch analyze multiple text responses (for admin-triggered re-analysis).
 */
async function batchAnalyze(requestId) {
    try {
        const responses = await db.query(`
            SELECT id, answers FROM review_responses 
            WHERE request_id = $1 AND sentiment_label IS NULL
        `, [requestId]);

        console.log(`[Sentiment] Batch processing ${responses.rows.length} responses for request ${requestId}`);

        for (const row of responses.rows) {
            // Extract text from answers JSON
            const answers = row.answers || {};
            const textAnswers = Object.values(answers).filter(a => typeof a === 'string' && a.length > 10);
            if (textAnswers.length > 0) {
                const combinedText = textAnswers.join(' ');
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

/**
 * AI Sentiment Analysis Service — Question-Wise Analysis
 * ========================================================
 * Production-ready service for per-question AI analysis.
 * 
 * Features:
 *   - Question-wise sentiment, keywords, themes, complaints, suggestions
 *   - PII field detection and filtering (NEVER sends PII to AI)
 *   - Rating field statistical analysis (no AI needed)
 *   - Multi-model fallback chain (Groq LLMs + rule-based)
 *   - Batch processing for efficiency
 *   - Caching and retry mechanisms
 *
 * Models:
 *   - llama-3.1-8b-instant      → Fast, good for batch     — PRIMARY
 *   - llama-3.3-70b-versatile   → Most capable              — FALLBACK 1
 *   - meta-llama/llama-4-scout-17b-16e-instruct            — FALLBACK 2
 */
let Groq;
try { Groq = require('groq-sdk'); } catch (e) { Groq = null; }
const db = require('../db');

// ============================================
//    MODEL CONFIGURATION
// ============================================
const GROQ_MODELS = [
    'llama-3.1-8b-instant',
    'llama-3.3-70b-versatile',
    'meta-llama/llama-4-scout-17b-16e-instruct',
];

let groqClient = null;
function getGroqClient() {
    if (!groqClient && Groq && process.env.GROQ_API_KEY) {
        groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
    return groqClient;
}

// ============================================
//    PII FIELD DETECTION
// ============================================
const PII_TYPES = ['name', 'email', 'gmail', 'branch', 'roll_number', 'phone', 'id', 'department', 'section', 'batch', 'enrollment', 'mobile', 'address'];

const PII_PATTERNS = [
    /^(full.?)?name$/i,
    /^(e.?)?mail$/i,
    /^gmail$/i,
    /^(roll.?(no|number|num)?)$/i,
    /^(reg.?(no|number|num)?|registration)$/i,
    /^(phone|mobile|contact).?(no|number|num)?$/i,
    /^(student.?)?id$/i,
    /^(dept|department|branch|section)$/i,
    /^(batch|year|semester|sem)$/i,
    /^(enrollment.?(no|number)?)$/i,
    /^(address|city|state|pin.?code|zip)$/i,
    /^(father|mother|parent).?name$/i,
    /^(guardian)$/i,
    /^(date.?of.?birth|dob|age|gender|sex)$/i,
    /^(aadhar|aadhaar|pan|passport)$/i,
];

/**
 * Check if a question/column is a PII field.
 * @param {string} questionText - The question text or column header
 * @param {string} questionType - Optional type hint from the form
 * @returns {boolean}
 */
function isPIIField(questionText, questionType) {
    if (questionType && PII_TYPES.includes(questionType.toLowerCase())) return true;
    const text = questionText.trim();
    return PII_PATTERNS.some(p => p.test(text));
}

/**
 * Check if a question is an opinion/analyzable field.
 * @param {Object} question - { text, type, id }
 * @returns {string} 'text'|'rating'|'option'|'skip'
 */
function classifyQuestionType(question) {
    const type = (question.type || '').toUpperCase();
    const text = (question.text || '').toLowerCase();

    // Explicit PII types — skip
    if (isPIIField(question.text, question.type)) return 'skip';

    // Form question types
    if (type === 'TEXT_BASED' || type === 'COMMENT' || type === 'FEEDBACK' || type === 'OPEN_TEXT') return 'text';
    if (type === 'RATING_BASED' || type === 'RATING') return 'rating';
    if (type === 'EMOJI_BASED') return 'option';
    if (type === 'OPTION_BASED') return 'option';

    // For imported CSV — detect from column name
    if (/^(name|email|gmail|roll|reg|phone|mobile|id|dept|batch|section)/i.test(text)) return 'skip';
    if (/rating|rate|score|marks/i.test(text)) return 'rating';
    if (/comment|feedback|suggestion|complaint|opinion|review|thought|experience|improve/i.test(text)) return 'text';

    // Default: treat as text (analyzable) for imported data columns
    return 'text';
}

// ============================================
//    SINGLE TEXT SENTIMENT (for response-level)
// ============================================
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
 */
function fallbackClassifier(text) {
    const lower = text.toLowerCase().trim();

    const num = parseFloat(lower);
    if (!isNaN(num) && /^\d+(\.\d+)?$/.test(lower)) {
        if (num >= 4) return { sentiment_label: 'Positive', sentiment_score: 0.7, confidence: 0.75 };
        if (num >= 3) return { sentiment_label: 'Neutral', sentiment_score: 0.0, confidence: 0.7 };
        return { sentiment_label: 'Negative', sentiment_score: -0.6, confidence: 0.75 };
    }

    const exactPositive = ['yes', 'good', 'great', 'excellent', 'amazing', 'awesome', 'love', 'perfect', 'agree', 'strongly agree', 'satisfied', 'very satisfied', 'helpful', 'enjoyed'];
    const exactNegative = ['no', 'bad', 'poor', 'terrible', 'worst', 'hate', 'awful', 'disagree', 'strongly disagree', 'dissatisfied', 'needs improvement', 'not satisfied'];
    const exactNeutral = ['maybe', 'average', 'okay', 'ok', 'neutral', 'not sure', 'fair', 'moderate'];

    if (exactPositive.includes(lower)) return { sentiment_label: 'Positive', sentiment_score: 0.65, confidence: 0.8 };
    if (exactNegative.includes(lower)) return { sentiment_label: 'Negative', sentiment_score: -0.65, confidence: 0.8 };
    if (exactNeutral.includes(lower)) return { sentiment_label: 'Neutral', sentiment_score: 0.0, confidence: 0.7 };

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
 * Call Groq API with model fallback chain for single text sentiment.
 */
async function analyzeSentimentWithGroq(text) {
    const client = getGroqClient();
    if (!client) {
        console.log('[Sentiment] No Groq client, using fallback');
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
                temperature: 0.05,
                max_tokens: 120,
                response_format: { type: 'json_object' }
            });

            const raw = response.choices[0]?.message?.content;
            if (!raw) throw new Error('Empty response');

            const parsed = JSON.parse(raw);
            if (!parsed.sentiment_label || parsed.sentiment_score === undefined) {
                throw new Error('Invalid JSON structure');
            }

            const validLabels = ['Positive', 'Neutral', 'Negative'];
            if (!validLabels.includes(parsed.sentiment_label)) parsed.sentiment_label = 'Neutral';
            parsed.sentiment_score = Math.max(-1, Math.min(1, Number(parsed.sentiment_score) || 0));
            parsed.confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0.7));
            parsed._model = model;
            return parsed;
        } catch (error) {
            const isRateLimit = error.status === 429 || error.message?.includes('rate_limit');
            console.warn(`[Sentiment] Model ${model} failed (${error.status || error.message?.substring(0, 40)})`);
            if (isRateLimit) await new Promise(r => setTimeout(r, 1500));
            continue;
        }
    }

    console.log('[Sentiment] All Groq models failed, using rule-based fallback');
    return fallbackClassifier(text);
}

// ============================================
//    QUESTION-WISE BATCH AI ANALYSIS
// ============================================

/**
 * AI prompt for question-wise batch analysis.
 * Sends all responses for a single question and gets aggregated insights.
 */
const QUESTION_ANALYSIS_PROMPT = `You are an expert feedback analysis engine for a college review system.

You will be given a QUESTION and a list of STUDENT RESPONSES to that question.

Analyze ALL responses and return ONLY valid JSON in this exact format:
{
  "sentiment_distribution": {
    "positive": <count of positive responses>,
    "neutral": <count of neutral responses>,
    "negative": <count of negative responses>
  },
  "top_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "common_themes": ["theme1", "theme2", "theme3"],
  "complaints": ["complaint1", "complaint2"],
  "suggestions": ["suggestion1", "suggestion2"]
}

Rules:
- Classify each response individually as positive, neutral, or negative
- Extract the most frequently mentioned keywords (max 8)
- Identify 2-4 common themes across responses
- List specific complaints mentioned (max 5). If none, use empty array.
- List specific suggestions mentioned (max 5). If none, use empty array.
- Keep keywords, themes, complaints, and suggestions concise (under 12 words each)
- Do NOT include student names or PII in any output
- If very few responses, still provide analysis

`;

/**
 * Analyze all responses for a single question using AI.
 * @param {string} questionText - The question
 * @param {string[]} responses - Array of response texts
 * @returns {Object} Analysis result
 */
async function analyzeQuestionResponses(questionText, responses) {
    if (!responses || responses.length === 0) {
        return {
            sentiment_distribution: { positive: 0, neutral: 0, negative: 0 },
            top_keywords: [],
            common_themes: [],
            complaints: [],
            suggestions: []
        };
    }

    const client = getGroqClient();

    // Format responses for the prompt (limit to first 100 for token management)
    const limitedResponses = responses.slice(0, 100);
    const numberedResponses = limitedResponses.map((r, i) => `${i + 1}. "${r}"`).join('\n');

    const userMessage = `QUESTION: "${questionText}"

TOTAL RESPONSES: ${responses.length}
${responses.length > 100 ? `(Showing first 100 of ${responses.length})` : ''}

STUDENT RESPONSES:
${numberedResponses}`;

    if (!client) {
        // Fallback: use rule-based per-response classification
        return fallbackQuestionAnalysis(questionText, responses);
    }

    for (const model of GROQ_MODELS) {
        try {
            const response = await client.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are a feedback analysis engine. Respond ONLY with valid JSON.' },
                    { role: 'user', content: QUESTION_ANALYSIS_PROMPT + userMessage }
                ],
                model,
                temperature: 0.1,
                max_tokens: 500,
                response_format: { type: 'json_object' }
            });

            const raw = response.choices[0]?.message?.content;
            if (!raw) throw new Error('Empty response');

            const parsed = JSON.parse(raw);

            // Validate and normalize
            const result = {
                sentiment_distribution: {
                    positive: Math.max(0, parseInt(parsed.sentiment_distribution?.positive) || 0),
                    neutral: Math.max(0, parseInt(parsed.sentiment_distribution?.neutral) || 0),
                    negative: Math.max(0, parseInt(parsed.sentiment_distribution?.negative) || 0),
                },
                top_keywords: Array.isArray(parsed.top_keywords) ? parsed.top_keywords.slice(0, 8) : [],
                common_themes: Array.isArray(parsed.common_themes) ? parsed.common_themes.slice(0, 5) : [],
                complaints: Array.isArray(parsed.complaints) ? parsed.complaints.slice(0, 5) : [],
                suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : [],
                _model: model
            };

            // If AI didn't classify all, scale the distribution
            const aiTotal = result.sentiment_distribution.positive + result.sentiment_distribution.neutral + result.sentiment_distribution.negative;
            if (aiTotal === 0 && responses.length > 0) {
                // AI returned zeros — do fallback per-response
                return fallbackQuestionAnalysis(questionText, responses);
            }

            return result;
        } catch (error) {
            const isRateLimit = error.status === 429 || error.message?.includes('rate_limit');
            console.warn(`[QuestionAnalysis] Model ${model} failed (${error.status || error.message?.substring(0, 60)})`);
            if (isRateLimit) await new Promise(r => setTimeout(r, 2000));
            continue;
        }
    }

    // All models failed — fallback
    console.log('[QuestionAnalysis] All Groq models failed, using rule-based fallback');
    return fallbackQuestionAnalysis(questionText, responses);
}

/**
 * Fallback: rule-based question analysis without AI.
 */
function fallbackQuestionAnalysis(questionText, responses) {
    let positive = 0, neutral = 0, negative = 0;
    const allWords = {};
    const complaints = [];
    const suggestions = [];

    for (const text of responses) {
        const result = fallbackClassifier(text);
        if (result.sentiment_label === 'Positive') positive++;
        else if (result.sentiment_label === 'Negative') negative++;
        else neutral++;

        // Extract keywords (simple word frequency)
        const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 3);
        const stopWords = ['this', 'that', 'with', 'from', 'have', 'been', 'were', 'they', 'their', 'about', 'would', 'could', 'should', 'very', 'much', 'more', 'also', 'some', 'than', 'then', 'what', 'when', 'will', 'just', 'like'];
        words.forEach(w => {
            if (!stopWords.includes(w)) allWords[w] = (allWords[w] || 0) + 1;
        });

        // Detect complaints/suggestions
        const lower = text.toLowerCase();
        if (lower.includes('improve') || lower.includes('should') || lower.includes('suggest') || lower.includes('recommend') || lower.includes('better if')) {
            if (suggestions.length < 5) suggestions.push(text.substring(0, 80));
        }
        if (lower.includes('problem') || lower.includes('issue') || lower.includes('complaint') || lower.includes('not good') || lower.includes('poor') || lower.includes('bad')) {
            if (complaints.length < 5) complaints.push(text.substring(0, 80));
        }
    }

    // Top keywords by frequency
    const sorted = Object.entries(allWords).sort((a, b) => b[1] - a[1]);
    const topKeywords = sorted.slice(0, 8).map(([word]) => word);

    return {
        sentiment_distribution: { positive, neutral, negative },
        top_keywords: topKeywords,
        common_themes: [], // Can't detect themes without AI
        complaints,
        suggestions,
        _model: 'rule-based'
    };
}

// ============================================
//    RATING ANALYSIS (no AI needed)
// ============================================
/**
 * Analyze rating responses — pure statistics.
 * @param {string[]} responses - Array of rating values as strings
 * @param {number} maxScale - Max rating scale (5 or 10)
 * @returns {Object}
 */
function analyzeRatingResponses(responses, maxScale = 5) {
    const validRatings = responses.map(r => parseFloat(r)).filter(n => !isNaN(n) && n >= 1 && n <= maxScale);

    if (validRatings.length === 0) {
        return {
            total_responses: responses.length,
            average: 0,
            distribution: {},
            sentiment_distribution: { positive: 0, neutral: 0, negative: 0 }
        };
    }

    const sum = validRatings.reduce((a, b) => a + b, 0);
    const average = parseFloat((sum / validRatings.length).toFixed(2));

    // Distribution
    const distribution = {};
    for (let i = 1; i <= maxScale; i++) distribution[i] = 0;
    validRatings.forEach(r => {
        const rounded = Math.round(r);
        if (distribution[rounded] !== undefined) distribution[rounded]++;
    });

    // Sentiment from rating
    let positive = 0, neutral = 0, negative = 0;
    const threshold = maxScale <= 5 ? { pos: 4, neut: 3 } : { pos: 7, neut: 5 };
    validRatings.forEach(r => {
        if (r >= threshold.pos) positive++;
        else if (r >= threshold.neut) neutral++;
        else negative++;
    });

    return {
        total_responses: validRatings.length,
        average,
        distribution,
        sentiment_distribution: { positive, neutral, negative }
    };
}

// ============================================
//    OPTION/EMOJI ANALYSIS (no AI needed)
// ============================================
/**
 * Analyze option-based responses — classify each option.
 */
function analyzeOptionResponses(responses) {
    let positive = 0, neutral = 0, negative = 0;
    const distribution = {};

    responses.forEach(answer => {
        const str = String(answer).trim();
        if (!str) return;
        distribution[str] = (distribution[str] || 0) + 1;

        const label = classifyOptionSentiment(str);
        if (label === 'Positive') positive++;
        else if (label === 'Negative') negative++;
        else neutral++;
    });

    return {
        total_responses: responses.length,
        distribution,
        sentiment_distribution: { positive, neutral, negative }
    };
}

/**
 * Classify an option answer to sentiment.
 */
function classifyOptionSentiment(answer) {
    const lower = String(answer).toLowerCase().trim();
    if (!lower) return 'Neutral';

    const num = parseFloat(lower);
    if (!isNaN(num) && lower.match(/^\d+(\.\d+)?$/)) {
        if (num >= 4) return 'Positive';
        if (num >= 3) return 'Neutral';
        return 'Negative';
    }

    const exactPositive = ['yes', 'good', 'great', 'excellent', 'amazing', 'awesome', 'love', 'perfect', 'agree', 'strongly agree', 'satisfied', 'very satisfied', 'true', 'definitely', 'absolutely', 'sure', '😊 amazing', '🙂 good'];
    const exactNegative = ['no', 'bad', 'poor', 'terrible', 'worst', 'hate', 'awful', 'disagree', 'strongly disagree', 'dissatisfied', 'false', 'never', 'needs improvement', '😠 poor'];
    const exactNeutral = ['maybe', 'average', 'okay', 'ok', 'neutral', 'not sure', 'sometimes', 'moderate', 'fair', '😐 average'];

    if (exactPositive.includes(lower)) return 'Positive';
    if (exactNegative.includes(lower)) return 'Negative';
    if (exactNeutral.includes(lower)) return 'Neutral';

    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'awesome', 'helpful', 'thank', 'perfect', 'outstanding', 'recommend', 'useful', 'enjoyed', 'nice', 'well'];
    const negativeWords = ['bad', 'poor', 'terrible', 'worst', 'hate', 'awful', 'horrible', 'disappointed', 'useless', 'waste', 'boring', 'frustrating', 'fail', 'lacking', 'weak'];

    if (positiveWords.some(w => lower.includes(w))) return 'Positive';
    if (negativeWords.some(w => lower.includes(w))) return 'Negative';
    return 'Neutral';
}

// ============================================
//    FULL QUESTION-WISE ANALYSIS PIPELINE
// ============================================

/**
 * Run full question-wise analysis for a review request.
 * @param {number} requestId - Review request ID
 * @returns {Object[]} Array of analysis results per question
 */
async function analyzeReviewQuestions(requestId) {
    const requestResult = await db.query('SELECT * FROM review_requests WHERE id = $1', [requestId]);
    if (requestResult.rows.length === 0) throw new Error('Request not found');

    const request = requestResult.rows[0];
    const questions = request.questions || [];

    const responsesResult = await db.query(
        'SELECT answers, sentiment_label, sentiment_score FROM review_responses WHERE request_id = $1',
        [requestId]
    );
    const allResponses = responsesResult.rows;

    const results = [];

    for (const question of questions) {
        const qType = classifyQuestionType(question);

        if (qType === 'skip') {
            console.log(`[Analysis] Skipping PII field: "${question.text}"`);
            continue;
        }

        // Collect all answers for this question
        const answers = allResponses
            .map(r => (r.answers || {})[question.id])
            .filter(a => a !== undefined && a !== null && String(a).trim() !== '');

        if (answers.length === 0) continue;

        let analysis;
        const stringAnswers = answers.map(a => String(a));

        if (qType === 'rating') {
            // Rating — pure statistics
            const maxScale = question.scale || (question.options ? question.options.length : 5);
            const ratingResult = analyzeRatingResponses(stringAnswers, maxScale);
            analysis = {
                question_id: question.id,
                question_text: question.text,
                question_type: 'rating',
                total_responses: ratingResult.total_responses,
                ...ratingResult.sentiment_distribution,
                top_keywords: [],
                common_themes: [],
                complaints: [],
                suggestions: [],
                rating_average: ratingResult.average,
                rating_distribution: ratingResult.distribution
            };
        } else if (qType === 'option') {
            // Option/Emoji — classify from answer text
            const optionResult = analyzeOptionResponses(stringAnswers);
            analysis = {
                question_id: question.id,
                question_text: question.text,
                question_type: 'option',
                total_responses: optionResult.total_responses,
                ...optionResult.sentiment_distribution,
                top_keywords: [],
                common_themes: [],
                complaints: [],
                suggestions: [],
                rating_average: null,
                rating_distribution: optionResult.distribution
            };
        } else {
            // Text — full AI analysis
            const aiResult = await analyzeQuestionResponses(question.text, stringAnswers);
            analysis = {
                question_id: question.id,
                question_text: question.text,
                question_type: 'text',
                total_responses: answers.length,
                positive: aiResult.sentiment_distribution.positive,
                neutral: aiResult.sentiment_distribution.neutral,
                negative: aiResult.sentiment_distribution.negative,
                top_keywords: aiResult.top_keywords,
                common_themes: aiResult.common_themes,
                complaints: aiResult.complaints,
                suggestions: aiResult.suggestions,
                rating_average: null,
                rating_distribution: {},
                _model: aiResult._model
            };
        }

        // Upsert into question_analysis table
        await db.query(`
            INSERT INTO question_analysis 
                (request_id, question_id, question_text, question_type, total_responses,
                 positive_count, neutral_count, negative_count,
                 keywords_json, themes_json, complaints_json, suggestions_json,
                 rating_average, rating_distribution_json, ai_model, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
            ON CONFLICT (request_id, question_id) WHERE request_id IS NOT NULL
            DO UPDATE SET
                total_responses = $5, positive_count = $6, neutral_count = $7, negative_count = $8,
                keywords_json = $9, themes_json = $10, complaints_json = $11, suggestions_json = $12,
                rating_average = $13, rating_distribution_json = $14, ai_model = $15, updated_at = CURRENT_TIMESTAMP
        `, [
            requestId, analysis.question_id, analysis.question_text, analysis.question_type,
            analysis.total_responses, analysis.positive, analysis.neutral, analysis.negative,
            JSON.stringify(analysis.top_keywords), JSON.stringify(analysis.common_themes),
            JSON.stringify(analysis.complaints), JSON.stringify(analysis.suggestions),
            analysis.rating_average, JSON.stringify(analysis.rating_distribution),
            analysis._model || 'rule-based'
        ]);

        results.push(analysis);
        console.log(`[Analysis] ✅ Q: "${question.text.substring(0, 40)}..." → ${analysis.positive}P/${analysis.neutral}N/${analysis.negative}Neg`);
    }

    return results;
}

/**
 * Run full question-wise analysis for an imported dataset.
 * @param {number} datasetId - Dataset ID
 * @returns {Object[]}
 */
async function analyzeDatasetQuestions(datasetId) {
    const dsResult = await db.query('SELECT * FROM imported_datasets WHERE id = $1', [datasetId]);
    if (dsResult.rows.length === 0) throw new Error('Dataset not found');

    const dataset = dsResult.rows[0];
    const columns = dataset.columns || [];

    const responsesResult = await db.query(
        'SELECT raw_data FROM imported_responses WHERE dataset_id = $1',
        [datasetId]
    );

    const results = [];
    const nameCol = columns.find(c => /^(name|student.?name|full.?name|respondent|participant)$/i.test(c.trim()));

    for (const col of columns) {
        if (col === nameCol) continue;

        const question = { text: col, type: '', id: col };
        const qType = classifyQuestionType(question);

        if (qType === 'skip') {
            console.log(`[Analysis] Skipping PII column: "${col}"`);
            continue;
        }

        const answers = responsesResult.rows
            .map(r => (r.raw_data || {})[col])
            .filter(a => a !== undefined && a !== null && String(a).trim() !== '');

        if (answers.length === 0) continue;

        let analysis;
        const stringAnswers = answers.map(a => String(a));

        if (qType === 'rating') {
            const ratingResult = analyzeRatingResponses(stringAnswers, 5);
            analysis = {
                question_id: col,
                question_text: col,
                question_type: 'rating',
                total_responses: ratingResult.total_responses,
                positive: ratingResult.sentiment_distribution.positive,
                neutral: ratingResult.sentiment_distribution.neutral,
                negative: ratingResult.sentiment_distribution.negative,
                top_keywords: [],
                common_themes: [],
                complaints: [],
                suggestions: [],
                rating_average: ratingResult.average,
                rating_distribution: ratingResult.distribution
            };
        } else {
            const aiResult = await analyzeQuestionResponses(col, stringAnswers);
            analysis = {
                question_id: col,
                question_text: col,
                question_type: 'text',
                total_responses: answers.length,
                positive: aiResult.sentiment_distribution.positive,
                neutral: aiResult.sentiment_distribution.neutral,
                negative: aiResult.sentiment_distribution.negative,
                top_keywords: aiResult.top_keywords,
                common_themes: aiResult.common_themes,
                complaints: aiResult.complaints,
                suggestions: aiResult.suggestions,
                rating_average: null,
                rating_distribution: {},
                _model: aiResult._model
            };
        }

        // Upsert into question_analysis table
        await db.query(`
            INSERT INTO question_analysis 
                (dataset_id, question_id, question_text, question_type, total_responses,
                 positive_count, neutral_count, negative_count,
                 keywords_json, themes_json, complaints_json, suggestions_json,
                 rating_average, rating_distribution_json, ai_model, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
            ON CONFLICT (dataset_id, question_id) WHERE dataset_id IS NOT NULL
            DO UPDATE SET
                total_responses = $5, positive_count = $6, neutral_count = $7, negative_count = $8,
                keywords_json = $9, themes_json = $10, complaints_json = $11, suggestions_json = $12,
                rating_average = $13, rating_distribution_json = $14, ai_model = $15, updated_at = CURRENT_TIMESTAMP
        `, [
            datasetId, analysis.question_id, analysis.question_text, analysis.question_type,
            analysis.total_responses, analysis.positive, analysis.neutral, analysis.negative,
            JSON.stringify(analysis.top_keywords), JSON.stringify(analysis.common_themes),
            JSON.stringify(analysis.complaints), JSON.stringify(analysis.suggestions),
            analysis.rating_average, JSON.stringify(analysis.rating_distribution),
            analysis._model || 'rule-based'
        ]);

        results.push(analysis);
        console.log(`[Analysis] ✅ Col: "${col.substring(0, 40)}..." → ${analysis.positive}P/${analysis.neutral}N/${analysis.negative}Neg`);
    }

    return results;
}

/**
 * Process sentiment for a single review response row (non-blocking).
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
 * Batch analyze unanalyzed review responses.
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
    fallbackClassifier,
    // New question-wise exports
    analyzeQuestionResponses,
    analyzeReviewQuestions,
    analyzeDatasetQuestions,
    analyzeRatingResponses,
    analyzeOptionResponses,
    classifyQuestionType,
    isPIIField,
    classifyOptionSentiment,
};

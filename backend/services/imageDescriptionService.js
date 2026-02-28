/**
 * Image Description Service — OCR + Groq AI
 * ============================================
 * Extracts text from event poster images using OCR.space free API,
 * then feeds the extracted text to Groq LLM to generate a rich
 * event description suitable for students.
 * 
 * No WASM files needed — works on Vercel serverless.
 */
const axios = require('axios');
let Groq;
try { Groq = require('groq-sdk'); } catch (e) { Groq = null; }

// Lazy Groq client initialization
let groqClient = null;
function getGroqClient() {
    if (!groqClient && Groq && process.env.GROQ_API_KEY) {
        groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
    return groqClient;
}

/**
 * Extract text from an image buffer using OCR.space free API.
 * Free tier: 25,000 requests/month, no API key needed for basic use.
 * @param {Buffer} imageBuffer - Raw image bytes
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromImage(imageBuffer) {
    try {
        console.log('[OCR] Starting text extraction via OCR.space API...');

        const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

        const response = await axios.post('https://api.ocr.space/parse/image',
            new URLSearchParams({
                base64Image: base64Image,
                language: 'eng',
                isOverlayRequired: 'false',
                detectOrientation: 'true',
                scale: 'true',
                OCREngine: '2',
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'apikey': process.env.OCR_SPACE_API_KEY || 'helloworld', // free API key
                },
                timeout: 30000, // 30 second timeout
            }
        );

        if (response.data.IsErroredOnProcessing) {
            throw new Error(response.data.ErrorMessage?.[0] || 'OCR processing failed');
        }

        const text = response.data.ParsedResults
            ?.map(r => r.ParsedText)
            .join('\n')
            .trim() || '';

        console.log(`[OCR] Extracted ${text.length} characters of text`);
        return text;
    } catch (error) {
        console.error('[OCR] Text extraction failed:', error.message);
        throw new Error('Failed to extract text from image: ' + error.message);
    }
}

/**
 * Generate an event description using Groq LLM based on extracted text.
 * @param {string} extractedText - Text extracted from event poster via OCR
 * @returns {Promise<string>} Generated event description
 */
async function generateEventDescription(extractedText) {
    const client = getGroqClient();
    if (!client) {
        throw new Error('Groq AI client is not available. Check GROQ_API_KEY.');
    }

    const prompt = `You are an expert event description writer for a college campus. Based on the following text extracted from an event poster image, generate a clear, engaging, and informative event description for students.

The description should:
- Be 2-4 sentences long
- Highlight what the event is about
- Mention any key details like topics, activities, or benefits for students
- Be professional but enthusiastic
- Do NOT make up specific dates, times, or venue details that aren't in the text
- If the text is unclear or minimal, create a reasonable description based on whatever context is available

Extracted text from event poster:
"""
${extractedText}
"""

Generate ONLY the event description text, nothing else. No quotes, no labels, just the description paragraph.`;

    try {
        console.log('[AI] Generating event description with Groq...');
        const response = await client.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are a college event description writer. Write concise, engaging descriptions based on poster text.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            model: 'llama3-8b-8192',
            temperature: 0.7,
            max_tokens: 300
        });

        const description = response.choices[0]?.message?.content?.trim();
        if (!description) throw new Error('Empty response from Groq');

        console.log('[AI] ✅ Description generated successfully');
        return description;
    } catch (error) {
        console.error('[AI] Description generation failed:', error.message);
        throw new Error('Failed to generate description: ' + error.message);
    }
}

/**
 * Full pipeline: Image → OCR API → AI Description
 * @param {Buffer} imageBuffer - Raw image bytes
 * @returns {Promise<{description: string, extractedText: string}>}
 */
async function generateDescriptionFromImage(imageBuffer) {
    // Step 1: Extract text via OCR.space API
    const extractedText = await extractTextFromImage(imageBuffer);

    if (!extractedText || extractedText.length < 3) {
        throw new Error('Could not extract readable text from the image. Please ensure the poster has clear, visible text.');
    }

    // Step 2: Generate description via Groq AI
    const description = await generateEventDescription(extractedText);

    return {
        description,
        extractedText
    };
}

module.exports = {
    extractTextFromImage,
    generateEventDescription,
    generateDescriptionFromImage
};

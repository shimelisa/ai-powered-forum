// geminiTextCoach.service.js
import { GoogleGenAI } from '@google/genai'; // Ensure your project uses this SDK format, or change to @google/generative-ai if that is installed

// Initialize Gemini AI Client using the API Key loaded from your .env file
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Helper function to send prompts to Gemini and receive a raw text response
 * @param {string} prompt - The constructed prompt for the AI
 * @returns {Promise<string>} The raw text response from Gemini
 */
const fetchGeminiJsonTextResponse = async (prompt) => {
  const modelName = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
  
  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      // Instructs Gemini to output structured JSON data natively
      responseMimeType: 'application/json'
    }
  });

  return response.text;
};

/**
 * Helper function to safely parse a JSON string received from Gemini
 * @param {string} text - The raw text payload from the API
 * @returns {Object} The parsed JavaScript object
 */
const parseJsonObjectFromGeminiText = (text) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse Gemini JSON output:", e);
    return null;
  }
};

/**
 * T-17 Draft Coach Service
 * Reviews user question drafts for technical clarity, formatting, and completeness.
 * * @param {Object} params
 * @param {string} params.title - Optional title of the draft question
 * @param {string} params.content - Required content details of the question
 * @returns {Promise<Object>} An object containing an array of actionable tips
 */
export const generateQuestionDraftCoachService = async ({ title, content }) => {
  const userPrompt = `
You are a programming forum coach.

Review the draft question below and provide suggestions to improve:

1. Clarity
2. Completeness
3. Formatting
4. Missing technical details

QUESTION TITLE:
${title || "No title provided"}

QUESTION CONTENT:
${content}

Reply ONLY with valid JSON:

{
  "tips": [
    "tip 1",
    "tip 2",
    "tip 3"
  ]
}
`;

  try {
    // 1. Get raw text back from Gemini
    const raw = await fetchGeminiJsonTextResponse(userPrompt);

    // 2. Parse the text into a JavaScript Object
    const parsed = parseJsonObjectFromGeminiText(raw);

    // 3. Guarantee a valid return format matching the Task requirement
    return {
      tips: Array.isArray(parsed?.tips)
        ? parsed.tips
        : ["No suggestions available at this moment."],
    };
  } catch (error) {
    console.error("generateQuestionDraftCoachService error details:", error);

    // FIXED: Throws a standard JavaScript error instead of an undefined class reference
    throw new Error(
      "AI draft suggestions are temporarily unavailable. Please try again later."
    );
  }
};
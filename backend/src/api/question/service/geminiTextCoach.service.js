// geminiTextCoach.service.js
import { GoogleGenAI } from '@google/genai';
import { ServiceUnavailableError } from '../../../utils/errors/index.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash-lite';

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Strip optional markdown fence and parse JSON object from model text.
 * @param {string} raw
 * @returns {object|null}
 */
function parseJsonObjectFromGeminiText(raw) {
  if (!raw || typeof raw !== 'string') return null;

  let t = raw.trim();

  if (t.startsWith('```')) {
    t = t
      .replace(/^(?:```json)?\s*/i, '')
      .replace(/\s*```$/i, '');
  }

  try {
    const v = JSON.parse(t);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Helper for draft coach – uses dedicated model & config.
 */
async function fetchDraftCoachResponse(prompt) {
  const modelName = process.env.GEMINI_DRAFT_COACH_MODEL || 'gemini-2.5-flash';
  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: 'application/json'
    }
  });
  return response.text;
}

/**
 * Helper for assess answer – uses the main text model & config.
 */
async function fetchAssessAnswerResponse(prompt) {
  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: prompt,
    config: {
      maxOutputTokens: 300,
       temperature: 0.3,
      responseMimeType: 'application/json'

    },
  });
  const text = response?.text;
  return typeof text === 'string' ? text : '';
}

/**
 * T-17 Draft Coach Service
 * Reviews user question drafts for technical clarity, formatting, and completeness.
 * @param {Object} params
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
    const raw = await fetchDraftCoachResponse(userPrompt);
    const parsed = parseJsonObjectFromGeminiText(raw);
    return {
      tips: Array.isArray(parsed?.tips)
        ? parsed.tips
        : ["No suggestions available at this moment."],
    };
  } catch (error) {
    console.error("generateQuestionDraftCoachService error details:", error);
    throw new Error(
      "AI draft suggestions are temporarily unavailable. Please try again later."
    );
  }
};

/**
 * Whether a draft answer seems to address the question (relevance, not correctness).
 * @param {{ questionTitle: string; questionContent: string; answerText: string }} param
 * @returns {Promise<{ level: string; note: string }>}
 */
export const assessAnswerAgainstQuestionService = async ({
  questionTitle,
  questionContent,
  answerText,
}) => {
  const userPrompt = `You review whether a forum ANSWER draft addresses the QUESTION (relevance and completeness of engagement - not whether the answer is factually correct).

QUESTION TITLE:
${questionTitle}

QUESTION BODY:
${questionContent}

ANSWER DRAFT:
${answerText}

Reply with ONLY valid JSON (no markdown fences), exactly this shape:
{
  "level":"strong"|"partial"|"weak",
  "note":"one short sentence"
}

Rules:
- level: "strong" if the draft clearly engages with the question; "partial" if somewhat related but missing key parts of the ask; "weak" if mostly off-topic or too vague.
- note: one sentence, plain language, no markdown, under 280 characters. Frame as fit/relevance, not grading.`;

  try {
    const raw = await fetchAssessAnswerResponse(userPrompt);
    const parsed = parseJsonObjectFromGeminiText(raw);
    const levelRaw = parsed?.level;
    const noteRaw = parsed?.note;

    const level =
      levelRaw === 'strong' || levelRaw === 'partial' || levelRaw === 'weak'
        ? levelRaw
        : 'partial';

    const note =
      typeof noteRaw === 'string' && noteRaw.trim()
        ? noteRaw.trim().slice(0, 280)
        : 'Could not summarize fit; treat this as a partial match.';

    return { level, note };
  } catch (error) {
    console.error('assessAnswerAgainstQuestionService:', error);
    throw new ServiceUnavailableError(
      'AI fit check is temporarily unavailable. Please try again later.',
    );
  }
};
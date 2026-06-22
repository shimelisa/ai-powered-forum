import { GoogleGenAI } from "@google/genai";
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash-lite";
// ============================================================
// CONFIGURATION
// ============================================================

const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ============================================================
// EMBEDDING GENERATION
// ============================================================

export const generateEmbedding = async (text, options = {}) => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error("Text is required for embedding generation");
  }

  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const { taskType = "RETRIEVAL_DOCUMENT", outputDimensionality = 768 } = options;

  try {
    const response = await ai.models.embedContent({
      model: GEMINI_EMBEDDING_MODEL,
      contents: text,
      config: {
        taskType: taskType,
        outputDimensionality: outputDimensionality,
      },
    });

    const values = response.embeddings?.[0]?.values;
    
    if (!values || !Array.isArray(values) || values.length === 0) {
      throw new Error("API returned empty or invalid embedding values");
    }

    return values;
  } catch (error) {
    console.error("Error generating embedding:", error.message);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
};






export const generateAnswer = async (prompt) => {
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new Error("Prompt is required for answer generation");
  }

  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
    });

    const text = response?.text;
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new Error("API returned an empty or invalid answer");
    }

    return text;
  } catch (error) {
    console.error("Error generating answer:", error.message);
    throw new Error(`Failed to generate answer: ${error.message}`);
  }
};








export default {
  generateEmbedding,
  generateAnswer,
};
import { safeExecute } from "../../../../db/config.js"; // Added missing import
import {
  BadRequestError,
  ServiceUnavailableError,
} from "../../../utils/errors/index.js"; // Combined error imports, dropped circular import
import { GoogleGenAI } from "@google/genai";

const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

function normalizeWhitespace(value) {
  return value.trim().replace(/\s+/g, " ");
}

export const normalizeQuestionText = ({ title }) => {
  return normalizeWhitespace(`${title || ""}`.normalize("NFKC").toLowerCase());
};


export function compareVectorLengths(vectorA, vectorB) {
  if (vectorA.length !== vectorB.length) {
    throw new BadRequestError(
      "Vectors must be of the same length for cosine similarity calculation",
    );
  }
}

export async function generateQuestionEmbedding(sourceText, options = {}) {
  const { taskType = "RETRIEVAL_DOCUMENT", questionid = null } = options;

  try {
    const response = await ai.models.embedContent({
      model: GEMINI_EMBEDDING_MODEL,
      contents: sourceText,
      config: {
        taskType: taskType,
        outputDimensionality: 768,
      },
    });

    const values = response.embeddings[0].values;

    if (!Array.isArray(values) || values.length === 0) {
      throw new Error("API returned empty or invalid embedding values");
    }

    return {
      embedding: values,
    };
  } catch (error) {
    console.error("Error generating embedding:", error);
    console.error("::::::::::::::::::::::");
    throw error;
  }
}

function validateEmbedding(embedding) {
  if (!Array.isArray(embedding)) {
    throw new Error("Embedding must be an array");
  }
  if (embedding.length === 0) {
    throw new Error("Embedding array cannot be empty");
  }
  if (!embedding.every((v) => typeof v === "number" && !isNaN(v))) {
    throw new Error("Embedding array must contain only valid numbers");
  }
} 

export async function storeQuestionVector({
  questionId,
  sourceText,
  embedding = [],
  status = "ready",
}) {

  if (status === "failed" || !embedding || embedding.length === 0) {
    const sql = `
            INSERT INTO question_vectors (question_id, source_text, embedding, status) 
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
              source_text = VALUES(source_text),  
              embedding = VALUES(embedding), 
              status = VALUES(status),
              updated_at = CURRENT_TIMESTAMP
        `;
    await safeExecute(sql, [
      questionId,
      sourceText,
      JSON.stringify([]),
      "failed",
    ]);
    return;
  }

  // Validate embedding data before storing
  validateEmbedding(embedding);
  const embeddingJson = JSON.stringify(embedding);

  const sql = `
        INSERT INTO question_vectors (question_id, source_text, embedding, status) 
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          source_text = VALUES(source_text),  
          embedding = VALUES(embedding), 
          status = VALUES(status),
          updated_at = CURRENT_TIMESTAMP
    `;

  try {
    await safeExecute(sql, [questionId, sourceText, embeddingJson, status]);
  } catch (error) {
    console.error("MYSQL UPSERT ERROR");
    console.error("Operation: storeQuestionVector");
    console.error(`Question ID: ${questionId}`);
    console.error(`Embedding Length: ${embedding.length}`);
    console.error(`Status: ${status}`);
    console.error("Error:", error);
    console.error("::::::::::::::::::::::::::::::");
    throw error;
  }
}

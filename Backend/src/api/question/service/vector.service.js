import { GoogleGenAI } from "@google/genai";
import { safeExecute } from "../../../../db/config.js"; 
import {
  BadRequestError,
  ServiceUnavailableError,
} from "../../../utils/errors/index.js"; // Combined error imports, dropped circular import

// AI Configuration

const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const RECOMMEND_THRESHOLD = Number(process.env.RECOMMEND_THRESHOLD) || 0.75;
const RECOMMEND_K = Number(process.env.RECOMMEND_K) || 5;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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

/**
 * Calculate cosine similarity between two embedding vectors. | line 42
 * Formula: cos(θ) = (A · B) / (||A|| × ||B||)
 *
 * @param {number[]} vectorA - First embedding vector
 * @param {number[]} vectorB - Second embedding vector
 * @returns {number} Similarity score between -1 and 1 (typically 0 to 1 for embeddings)
 * @throws {Error} If vectors have different lengths
 */
export function calculateCosineSimilarity(vectorA, vectorB) {
  // Validate vectors have same length
  if (vectorA.length !== vectorB.length) {
    throw new Error(
      `Vectors must have the same length. Got ${vectorA.length} and ${vectorB.length}`,
    );
  }

  // Calculate dot product (sum of element-wise multiplication)
  let dotProduct = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
  }

  // Calculate magnitude of vectorA (square root of sum of squares) | line 64
  let magnitudeA = 0;
  for (let i = 0; i < vectorA.length; i++) {
    magnitudeA += vectorA[i] * vectorA[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);

  // Calculate magnitude of vectorB (square root of sum of squares)
  let magnitudeB = 0;
  for (let i = 0; i < vectorB.length; i++) {
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeB = Math.sqrt(magnitudeB);

  // Handle edge case: return 0 if either magnitude is 0
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  // Return dot product divided by product of magnitudes
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function generateQuestionEmbedding(sourceText, options = {}) {
  const { taskType = "RETRIEVAL_DOCUMENT" } = options;

  try {
    // Add questionid to embedding request config for tracking
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
    console.error("=== GEMINI API ERROR DURING EMBEDDING ===");
    console.error("Task type:", taskType);
    console.error("Error generating embedding:", error);
    console.error("=========================================");
    throw new ServiceUnavailableError(
      "Failed to generate embedding for search query. Please try again later.",
    );
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

/**
 * Retrieves all ready question embeddings from the question_vectors table.
 * Parses the JSON embedding column and skips any rows that fail to parse.
 *
 * @returns {Promise<Array<{ questionId: number, embedding: number[] }>>}
 */
async function retrieveReadyEmbeddings() {
  const sql = `
    SELECT question_id, embedding
    FROM question_vectors
    WHERE status = ?
  `;

  const rows = await safeExecute(sql, ["ready"]);

  const embeddings = [];

  for (const row of rows) {
    try {
      // The database driver might already parse JSON columns into objects/arrays.
      // If it's already an array, use it directly; otherwise, parse it.
      const embedding =
        typeof row.embedding === "string"
          ? JSON.parse(row.embedding)
          : row.embedding;

      // Add valid embedding to results
      embeddings.push({
        questionId: row.question_id,
        embedding,
      });
    } catch (parseError) {
      console.warn(
        `Skipping question ${row.question_id}: failed to parse embedding JSON`,
        parseError,
      );
      continue;
    }
  }

  return embeddings;
}

/**
 * Finds questions semantically similar to the given source text.
 *
 * Steps:
 *  1. Embed the source text via Gemini (RETRIEVAL_QUERY task type)
 *  2. Retrieve all ready embeddings from the DB
 *  3. Compute cosine similarity for each stored embedding
 *  4. Filter by threshold, sort descending, take top k
 *  5. Fetch full question + author details for the top-k IDs
 *
 * @param {Object} params
 * @param {string} params.sourceText  - The text to search for similar questions.
 * @param {number} [params.threshold] - Minimum similarity score threshold.
 * @param {number} [params.k]         - Maximum number of results to return.
 * @returns {Promise<Object>} The generated embedding and similar questions.
 */
export async function findSimilarQuestionsByText({ sourceText, threshold, k }) {
  const { recommendThreshold, recommendK } = getVectorConfig();

  // Normalize parameters
  const normalizedThreshold = threshold ?? recommendThreshold;
  const normalizedK = k ?? recommendK;

  // Use RETRIEVAL_QUERY task type when searching against stored documents
  let embeddingResult;
  try {
    embeddingResult = await generateQuestionEmbedding(sourceText, {
      taskType: "RETRIEVAL_QUERY",
    });
  } catch (error) {
    console.error("=== GEMINI API ERROR DURING SEARCH ===");
    console.error("Operation: findSimilarQuestionsByText");
    console.error("Search text:", sourceText);
    console.error("Error:", error);
    console.error("======================================");
    throw new ServiceUnavailableError(
      "Failed to generate embedding for search query. Please try again later.",
    );
  }

  const queryEmbedding = embeddingResult.embedding; // [0.0123213, -0.12324, .....]

  // Retrieve all ready embeddings from MySQL
  let storedEmbeddings;
  try {
    storedEmbeddings = await retrieveReadyEmbeddings();
  } catch (error) {
    console.error("=== DATABASE ERROR DURING SEARCH ===");
    console.error("Operation: findSimilarQuestionsByText");
    console.error("Search text:", sourceText);
    console.error("Error:", error);
    console.error("====================================");
    throw error;
  }

  // Calculate cosine similarity for each stored embedding
  const similarities = [];
  for (const stored of storedEmbeddings) {
    try {
      const score = calculateCosineSimilarity(queryEmbedding, stored.embedding);

      // Filter by threshold
      if (score >= normalizedThreshold) {
        similarities.push({
          questionId: stored.questionId,
          score,
        });
      }
    } catch (error) {
      console.warn(
        `Failed to calculate similarity for question ${stored.questionId}:`,
        error.message,
      );
      continue;
    }
  }

  // Sort by score descending
  similarities.sort((a, b) => b.score - a.score);

  // Limit to top k results
  const topResults = similarities.slice(0, normalizedK);

  if (topResults.length === 0) {
    return {
      ...embeddingResult,
      similarQuestions: [],
    };
  }

  // Fetch question details using IN clause
  const questionIds = topResults.map((r) => r.questionId);
  const placeholders = questionIds.map(() => "?").join(",");

  const sql = `
    SELECT
      q.question_id   AS questionId,
      q.question_hash AS questionHash,
      q.title,
      q.content,
      q.created_at    AS createdAt,
      q.updated_at    AS updatedAt,
      u.user_id       AS userId,
      u.first_name    AS firstName,
      u.last_name     AS lastName,
      COUNT(DISTINCT a.answer_id) AS answerCount
    FROM questions q
    JOIN users u ON u.user_id = q.user_id
    LEFT JOIN answers a ON a.question_id = q.question_id
    WHERE q.question_id IN (${placeholders})
    GROUP BY q.question_id, u.user_id
  `;

  let rows;
  try {
    rows = await safeExecute(sql, questionIds);
  } catch (error) {
    console.error("=== DATABASE ERROR FETCHING QUESTION DETAILS ===");
    console.error("Operation: findSimilarQuestionsByText - fetch details");
    console.error("Question IDs:", questionIds);
    console.error("Error:", error);
    console.error("================================================");
    throw error;
  }

  // Map MySQL results to question objects
  const questionMap = {};
  rows.forEach((row) => {
    questionMap[String(row.questionId)] = {
      id: row.questionId,
      questionHash: row.questionHash,
      title: row.title,
      content: row.content,
      answerCount: Number(row.answerCount),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      author: {
        id: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
      },
    };
  });

  // Return results with scores, preserving sort order
  const similarQuestions = topResults
    .filter((result) => questionMap[String(result.questionId)])
    .map((result) => ({
      score: Number(result.score.toFixed(6)),
      ...questionMap[String(result.questionId)],
    }));

  return {
    ...embeddingResult,
    similarQuestions,
  };
}

/**
 * Find similar questions using the pre-calculated embedding of an existing question from MySQL.| line 414
 * @param {Object} params - Search parameters.
 * @param {number|string} params.questionId - The ID of the question to find similarities for.
 * @param {number} [params.threshold] - Minimum similarity score threshold.
 * @param {number} [params.k] - Maximum number of results to return.
 * @returns {Promise<Array<Object>>} A list of similar questions
 */
export async function findSimilarQuestionsByQuestionId({
  questionId,
  threshold,
  k,
}) {
  // Normalize parameters | line 426
  const normalizedK = k > 0 ? Math.min(k, 20) : RECOMMEND_K;

  const normalizedThreshold =
    threshold > 0 && threshold < 1 ? threshold : RECOMMEND_THRESHOLD;

  // Retrieve source question embedding from MySQL | line 431
  const sql = `
    SELECT embedding, status
    FROM question_vectors
    WHERE question_id = ?
    `;

  let rows;
  try {
    rows = await safeExecute(sql, [questionId]);

    // Return empty array if no embedding or status != 'ready' | line 442
    if (rows.length === 0) {
      return [];
    }

    const row = rows[0];
    if (row.status !== "ready") {
      return [];
    }

    // Parse source embedding | line 452
    let sourceEmbedding;
    try {
      sourceEmbedding =
        typeof row.embedding === "string"
          ? JSON.parse(row.embedding)
          : row.embedding;

      // Validate source embedding | line 460
      if (!Array.isArray(sourceEmbedding) || sourceEmbedding.length === 0) {
        console.warn(
          `Source question ${questionId} has invalid embedding format`,
        );

        return [];
      }

      if (!sourceEmbedding.every((v) => typeof v === "number" && !isNaN(v))) {
        console.warn(
          `Source question ${questionId} has invalid embedding values`,
        );

        return [];
      }
    } catch (parseError) {
      console.warn(
        `Failed to parse embedding for question ${questionId}:`,
        parseError,
      );

      return [];
    }

    // Retrieve all other ready embeddings from MySQL  | line 482
    let storedEmbeddings;
    try {
      storedEmbeddings = await retrieveReadyEmbeddings();
    } catch (error) {
      console.error("=== DATABASE ERROR DURING SIMILAR QUESTIONS SEARCH ===");
      console.error(
        "Operation: findSimilarQuestionsByQuestionId - retrieve embeddings",
      );

      console.error("Question ID:", questionId);
      console.error("Error:", error);
      console.error("================================");
      throw error;
    }

    // Calculate cosine similarity for each stored embedding | line 497
    const similarities = [];
    for (const stored of storedEmbeddings) {
      // Exclude source question from results
      if (String(stored.questionId) === String(questionId)) {
        continue;
      }
      try {
        const score = calculateCosineSimilarity(
          sourceEmbedding,
          stored.embedding,
        );
        // Filter by threshold
        if (score > normalizedThreshold) {
          similarities.push({
            questionId: stored.questionId,
            score: score,
          });
        }
      } catch (error) {
        console.warn(
          `Failed to calculate similarity for question ${stored.questionId}:`,
          error.message,
        );
        continue;
      }
    }

    // Sort by score descending | line 524
    similarities.sort((a, b) => b.score - a.score);

    // Limit to top k results | line 527
    const topResults = similarities.slice(0, normalizedK);

    if (topResults.length === 0) {
      return [];
    }

    // Fetch question details using IN clause | line 534
    const questionIds = topResults.map((r) => r.questionId);
    const placeholders = questionIds.map(() => "?").join(",");
    const detailsSql = `
      SELECT
        q.question_id AS questionId,
        q.question_hash AS questionHash,
        q.title,
        q.content,
        q.created_at AS createdAt,
        q.updated_at AS updatedAt,
        u.user_id AS userId,
        u.first_name AS firstName,
        u.last_name AS lastName,
        COUNT(DISTINCT a.answer_id) AS answerCount
      FROM questions q
      JOIN users u ON u.user_id = q.user_id
      LEFT JOIN answers a ON a.question_id = q.question_id
      WHERE q.question_id IN (${placeholders})
      GROUP BY q.question_id, u.user_id
      `;

    let detailsRows;

    try {
      detailsRows = await safeExecute(detailsSql, questionIds);
    } catch (error) {
      console.error("=== DATABASE ERROR FETCHING QUESTION DETAILS ===");
      console.error(
        "Operation: findSimilarQuestionsByQuestionId - fetch details",
      );
      console.error("Source Question ID:", questionId);
      console.error("Target Question IDs:", questionIds);
      console.error("SQL:", detailsSql.trim().replace(/\s+/g, " "));
      console.error("Error:", error);
      console.error("===============================");
      throw error;
    }

    // Map MySQL results to question objects | line 576
    const questionMap = {};
    detailsRows.forEach((detailRow) => {
      questionMap[String(detailRow.questionId)] = {
        id: detailRow.questionId,
        questionHash: detailRow.questionHash,
        title: detailRow.title,
        content: detailRow.content,
        answerCount: detailRow.answerCount,
        createdAt: detailRow.createdAt,
        updatedAt: detailRow.updatedAt,
        author: {
          id: detailRow.userId,
          firstName: detailRow.firstName,
          lastName: detailRow.lastName,
        },
      };
    });

    // Return results with scores, preserving sort order | line 595
    return topResults
      .filter((result) => questionMap[String(result.questionId)])
      .map((result) => ({
        score: Number(result.score.toFixed(6)),
        ...questionMap[String(result.questionId)],
      }));
  } catch (error) {
    console.error("MYSQL FIND SIMILAR BY QUESTION ID ERROR =");
    console.error("Operation: findSimilarQuestionsByQuestionId");
    console.error("Question ID:", questionId);
    console.error("SQL:", sql.trim().replace(/\s+/g, ""));
    console.error("Error:", error);

    console.error("==============================");

    throw error;
  }
}
/**
 * Get the current vector search configuration values from environment variables or defaults. | line 614
 * @returns {Object} The current vector configuration values.
 */
export function getVectorConfig() {
  return {
    recommendThreshold: RECOMMEND_THRESHOLD,
    recommendK: RECOMMEND_K,
  };
}

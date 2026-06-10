import { BadRequestError } from "../../../utils/errors/index.js"; // Fixed extension
import { safeExecute } from "../../../../db/config.js"; // Fixed path step-back
import crypto from "crypto";
import {
  normalizeQuestionText,
  generateQuestionEmbedding,
  storeQuestionVector,
  findSimilarQuestionsByText,
  getVectorConfig,
} from "./vector.service.js"; // Combined and added missing function

export const createQuestionWithVectorService = async (payload) => {
  const { userId, title, content } = payload;

  const insertQuestionSql = `INSERT INTO questions (question_hash, user_id, title, content) VALUES (?, ?, ?, ?) `;

  // Generate a unique question hash per request execution
  const questionHash = crypto.randomBytes(8).toString("hex");
  let questionResult;

  try {
    questionResult = await safeExecute(insertQuestionSql, [
      questionHash,
      userId,
      title,
      content,
    ]);
  } catch (error) {
    if (error?.code === "ER_NO_REFERENCED_ROW_2") {
      throw new BadRequestError("User not found");
    }
    throw error;
  }

  const questionID = questionResult.insertId;

  const creationResult = {
    id: questionID,
    questionHash,
    content,
    title,
    userId,
  };

  // Normalize the question data before returning for embedding
  const sourceText = normalizeQuestionText({ title: payload.title });

  try {
    // Generate vector embedding for the normalized question text
    const embeddingResult = await generateQuestionEmbedding(sourceText, {
      questionid: creationResult.id,
    });

    // Store the generated vector embedding in the database
    await storeQuestionVector({
      
      questionId: creationResult.id,
      embedding: embeddingResult.embedding,
      status: "ready",
      sourceText,
    });
  } catch (error) {
    console.error("FAILED TO STORE VECTOR FOR QUESTION");
    console.error("Question ID:", creationResult.id);
    console.error("Operation: question creation");
    console.error("Error:", error);
    console.error("-----------------------------");

    await storeQuestionVector({
      questionId: creationResult.id,
      embedding: [],
      status: "failed",
      sourceText,
    }).catch((e) => console.error("failed to save status", e));
  }

  return {
    question: creationResult,
  };
}; 

/**
 * Performs semantic search over questions.
 *
 * Delegates embedding, similarity scoring, and DB lookup entirely to
 * vector.service — this layer only handles parameter normalisation
 * and shaping the final API response envelope.
 *
 * @param {{ query: string, k?: number, threshold?: number }} params
 * @returns {Promise<{ data: Object[], meta: Object }>}
 */

export const searchQuestionsSemanticService = async ({
  query,
  k = 5,
  threshold,
}) => {
  const sourceText = normalizeQuestionText({ title: query });
  const vectorConfig = getVectorConfig();
  const searchThreshold =
    threshold !== undefined ? threshold : vectorConfig.recommendThreshold;

  const result = await findSimilarQuestionsByText({
    sourceText,
    threshold: searchThreshold,
    k,
  });

  return {
    data: result.similarQuestions,
    meta: {
      query,
      k,
      threshold: searchThreshold,
      total: result.similarQuestions.length,
    },
  };
};
import { 
  BadRequestError,
  NotFoundError
 } from "../../../utils/errors/index.js"; // Fixed extension
import { safeExecute } from "../../../../db/config.js"; // Fixed path step-back
import crypto from "crypto";
import {
  normalizeQuestionText,
  generateQuestionEmbedding,
  storeQuestionVector,
  findSimilarQuestionsByQuestionId,
  getVectorConfig
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

export const getSimilarQuestionsService = async ({
  questionHash,
  k = 5,
  threshold,
}) => {
  const questionRows = await safeExecute(
    "SELECT question_id AS id FROM questions WHERE question_hash = ? LIMIT 1",
    [questionHash],
  );

  if (questionRows.length === 0) {
    throw new NotFoundError("Question not found");
  }

  const questionId = questionRows[0].id;

  const vectorConfig = getVectorConfig();

  const searchThreshold =
    threshold !== undefined ? threshold : vectorConfig.recommendThreshold;
  const similarQuestions = await findSimilarQuestionsByQuestionId({
    questionId,
    threshold: searchThreshold,
    k,
  });

  return {
    data: similarQuestions,
    meta: {
      questionHash,
      k,
      threshold: searchThreshold,
      total: similarQuestions.length,
    },
  };
};


// Service for getting single question details
export const getSingleQuestionService = async ({ questionHash }) => {
  const normalizedAnswerLimit = 100;//fixed limit for number of answers to retrieve

  const questionSql = `
  SELECT 
    q.question_id AS id,
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
  WHERE q.question_hash = ?
  GROUP BY q.question_id, u.user_id
  `;
  const questionRows = await safeExecute(questionSql, [questionHash]);

  if (questionRows.length === 0) {
    throw new NotFoundError("Question not found");
  }
  const question = questionRows[0];
  const questionId = question.id;

  const answersSql = `
  SELECT 
    a.answer_id AS id,
    a.content,
    a.created_at AS createdAt,
    a.updated_at AS updatedAt,
    au.user_id AS userId,
    au.first_name AS firstName,
    au.last_name AS lastName
  FROM answers a
  JOIN users au ON au.user_id = a.user_id
  WHERE a.question_id = ?
  ORDER BY a.created_at DESC
  LIMIT ${normalizedAnswerLimit}
  `;
  const answers = await safeExecute(answersSql, [questionId]);
  
  return {
    question: {
      id: question.id,
      questionHash: question.questionHash,
      title: question.title,
      content: question.content,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      author: {
        id: question.userId,
        firstName: question.firstName,
        lastName: question.lastName
      },
    },
    answers: answers.map((answer) => ({
      id: answer.id,
      content: answer.content,
      createdAt: answer.createdAt,
      updatedAt: answer.updatedAt,
      author: {
        id: answer.userId,
        firstName: answer.firstName,
        lastName: answer.lastName
      },
    })),
    answersMeta: {
      limit: normalizedAnswerLimit,
      total: answers.length,
    },
  };
};
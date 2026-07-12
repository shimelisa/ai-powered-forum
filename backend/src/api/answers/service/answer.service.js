import { safeExecute } from "../../../../db/config.js";
import {
  BadRequestError,
  NotFoundError,
  ServiceUnavailableError,
} from "../../../utils/errors/index.js";

const mapAnswer = (row) => ({
  id: row.answer_id,
  content: row.content,
  questionId: row.question_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  author: {
    id: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
  },
});

const getQuestionOwner = async (questionId) => {
  const query = `
    SELECT user_id
    FROM questions
    WHERE question_id = ?
  `;

  const rows = await safeExecute(query, [questionId]);

  if (!rows || rows.length === 0) {
    throw new NotFoundError("Question not found");
  }

  return rows[0].user_id;
};

export const createAnswerService = async (content, questionId, userId) => {
  const questionOwnerId = await getQuestionOwner(questionId);

  if (questionOwnerId === userId) {
    throw new BadRequestError("You cannot answer your own question");
  }

  const insertQuery = `
    INSERT INTO answers (
      content,
      question_id,
      user_id
    )
    VALUES (?, ?, ?)
  `;

  const insertResult = await safeExecute(insertQuery, [
    content,
    questionId,
    userId,
  ]);

  if (!insertResult.insertId) {
    throw new ServiceUnavailableError("Failed to create answer");
  }

  return await getAnswersService(questionId);
};

export const getAnswersService = async (questionId) => {
  const query = `
    SELECT
      a.*,
      u.first_name,
      u.last_name
    FROM answers a
    JOIN users u
      ON a.user_id = u.user_id
    WHERE a.question_id = ?
  `;

  const rows = await safeExecute(query, [questionId]);

  if (!rows || rows.length === 0) {
    throw new NotFoundError("Answers not found");
  }

  return rows.map(mapAnswer);
};

export const updateAnswerService = async (answerId, content, userId) => {
  const existingAnswer = await getAnswerByIdService(answerId);

  if (existingAnswer.author.id !== userId) {
    throw new BadRequestError("You can only update your own answer");
  }

  const query = `
    UPDATE answers
    SET
      content = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE answer_id = ?
  `;

  await safeExecute(query, [content, answerId]);

  return await getAnswerByIdService(answerId);
};

export const deleteAnswerService = async (answerId, userId) => {
  const existingAnswer = await getAnswerByIdService(answerId);

  if (existingAnswer.author.id !== userId) {
    throw new BadRequestError("You can only delete your own answer");
  }

  const query = `
    DELETE FROM answers
    WHERE answer_id = ?
  `;

  await safeExecute(query, [answerId]);

  return true;
};

import {safeExecute} from '../../../../db/config.js';
import{
    BadRequestError,
    NotFoundError,
    ServiceUnavailableError,
} 

from '../../../utils/errors/index.js';


const mapAnswer = row => ({
    id: row.id,
    content: row.content,
    questionId: row.question_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: {
        id: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
    }
});

const getQuestionOwner = async (questionId) => {
    const query = `
        SELECT user_id FROM questions WHERE id = $1
    `;
    const values = [questionId];
    const result = await safeExecute(query, values);
    if (result.rows.length === 0) {
        throw new NotFoundError('Question not found');
    }
    return result.rows[0].user_id;
}

export const createAnswerService = async (content, questionId, userId) => {
    const questionOwnerId = await getQuestionOwner(questionId);
    if (questionOwnerId === userId) {
        throw new BadRequestError('You cannot answer your own question');
    }
    const query = `
        INSERT INTO answers (content, question_id, user_id)
        VALUES ($1, $2, $3)
        RETURNING *
    `;
    const values = [content, questionId, userId];
    const result = await safeExecute(query, values);
    if (result.rows.length === 0) {
        throw new ServiceUnavailableError('Failed to create answer');
    }
    return mapAnswer(result.rows[0]);
}

export const getAnswersService = async (answerId) => {
    const query = `
        SELECT a.*, u.first_name, u.last_name
        FROM answers a
        JOIN users u ON a.user_id = u.id
        WHERE a.id = $1
    `;
    const values = [answerId];
    const result = await safeExecute(query, values);
    if (result.rows.length === 0) {
        throw new NotFoundError('Answer not found');
    }
    return mapAnswer(result.rows[0]);
}

export const updateAnswerService = async (answerId, content, userId) => {
    const existingAnswer = await getAnswersService(answerId);
    if (existingAnswer.author.id !== userId) {
        throw new BadRequestError('You can only update your own answer');
    }
    const query = `
        UPDATE answers
        SET content = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
    `;
    const values = [content, answerId];
    const result = await safeExecute(query, values);
    if (result.rows.length === 0) {
        throw new ServiceUnavailableError('Failed to update answer');
    }
    return mapAnswer(result.rows[0]);
}

export const deleteAnswerService = async (answerId, userId) => {
    const existingAnswer = await getAnswerById(answerId);
    if (existingAnswer.author.id !== userId) {
        throw new BadRequestError('You can only delete your own answer');
    }
    const query = `
        DELETE FROM answers
        WHERE id = $1
    `;
    const values = [answerId];
    await safeExecute(query, values);
}






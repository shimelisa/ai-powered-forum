import express from 'express';
import {
createAnswerController, 
deLeteAnswerController, 
getAnswersController, 
getSingleAnswerController, 
updateAnswerController,
} from'../controller/answer.controller.js';
import {
answerIdValidation,
createAnswerValidation,
getAnswersValidation,
updateAnswerValidation,
// deleteAnswerValidation
}from '../validations/answer.validation.js';
import {authenticateUser }from '../../../middleware/authentication.js';

const router = express. Router();

// ⁠  ⁠Groute POST /api/answers
//   ⁠@desc Post a new answer
//  ⁠Caccess Protected
// router-post(

authenticateUser, createAnswerValidation, createAnswerController,

// @route GET /api/answers
// @desc Get answers for a question with pagination
// @access Public
// router.get('/', getAnswersValidation, getAnswersController);

// ⁠  ⁠Groute GET /api/answers/:id
//   ⁠@desc Get a single answer by ID
//  ⁠Caccess Public
router.get('/:id', answerIdValidation, getSingleAnswerController);

// ⁠  ⁠Groute PUT /api/answers/:id
//   ⁠@desc Update an answer by ID
//  ⁠Caccess Protected
router.put('/:id', authenticateUser, updateAnswerValidation, updateAnswerController);

// ⁠  ⁠Groute DELETE /api/answers/:id
//   ⁠@desc Delete an answer by ID
//  ⁠Caccess Protected
router.delete('/:id', authenticateUser, answerIdValidation, deLeteAnswerController);

export default router;

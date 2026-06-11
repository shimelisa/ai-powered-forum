import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import {
  createQuestionController,
  getSimilarQuestionsController,
  getSingleQuestionController,
} from "../controller/question.controller.js";
import {
  createQuestionValidation,
  getSimilarQuestionsValidation,
  getSingleQuestionValidation,
} from "../validations/question.validation.js";

import { assessAnswerAgainstQuestionValidation } from "../validations/answer.validation.js";
import { assessAnswerAgainstQuestionController } from "../controller/answer.controller.js";
const router = express.Router();

// Create a new question
router.post(
  "/",
  authenticateUser,
  createQuestionValidation,
  createQuestionController,
);

/**
 * @route GET /api/questions/:questionHash/similar
 * @desc Get similar questions based on vector embeddings
 * @access Private   
 */
router.get(
  "/:questionHash/similar",
  authenticateUser,
  getSimilarQuestionsValidation,
  getSimilarQuestionsController,
);


//single question details
router.get(
  "/:questionHash",
  authenticateUser,
  getSingleQuestionValidation,
  getSingleQuestionController,
)


/**
 * @route POST /api/questions/:questionHash/answer-fit
 * @desc AI relevance check for an answer draft vs the question
 * @access Private
 */
router.post(
  '/:questionHash/answer-fit',
  authenticateUser,
  assessAnswerAgainstQuestionValidation,
  assessAnswerAgainstQuestionController,
);
/**
 * @route GET /api/questions/:questionHash
 * @desc Get one question with answers
 * @access Private
 */
// router.get(
//   '/:questionHash',
//   authenticateUser,
//   getSingleQuestionValidation,
//   getSingleQuestionController,
// )


export const questionRoutes = router;

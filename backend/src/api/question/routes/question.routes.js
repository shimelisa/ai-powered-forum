// question.routes.js
import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import { 
  createQuestionController,
  getQuestionsController,
  searchQuestionsSemanticController,
  generateQuestionDraftCoachController,
  getSimilarQuestionsController,
  getSingleQuestionController,
} from "../controller/question.controller.js"; 
import { 
  createQuestionValidation, 
  searchQuestionsValidation,
  getQuestionsValidation,
  generateQuestionDraftCoachValidation,
  getSimilarQuestionsValidation,
  getSingleQuestionValidation,
} from "../validations/question.validation.js";

import { assessAnswerAgainstQuestionValidation } from "../validations/question.validation.js";
import { assessAnswerAgainstQuestionController } from "../controller/question.controller.js";


const router = express.Router();

/**
 * @route POST/api/questions
 * @desc Post a new question
 * @access Protected (Bearer token required)
 */
router.post(
  "/",
  authenticateUser,
  createQuestionValidation,
  createQuestionController,
);

/**
 * @route GET/api/questions
 * @desc List questions with optional search and mine filters.
 * @access Protected (Bearer token required)
 */
router.get(
  "/",
  authenticateUser,
  getQuestionsValidation,
  getQuestionsController,
);

/**
 * @route   GET /api/questions/search
 * @desc    Semantic search over questions using vector cosine similarity
 * @access  Protected (Bearer token required)
 */
router.get(
  "/search",
  authenticateUser,
  searchQuestionsValidation,
  searchQuestionsSemanticController,
);

/**
 * @route   POST /api/questions/draft-coach
 * @desc    AI coach to review question drafts and generate suggestions
 * @access  Protected (Bearer token required)
 */
router.post(
  '/draft-coach',
  authenticateUser,
  generateQuestionDraftCoachValidation,
  generateQuestionDraftCoachController
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

/**
 * @route GET /api/questions/:questionHash/
 * @desc Fetch a specific question and all its associated answers.
 * @access Private   
 */
router.get(
  "/:questionHash",
  authenticateUser,
  getSingleQuestionValidation,
  getSingleQuestionController,
);

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

export default router;
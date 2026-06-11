import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import {
  createQuestionController,
  searchQuestionsSemanticController,
  getSimilarQuestionsController,
} from "../controller/question.controller.js";
import {
  createQuestionValidation,
  searchQuestionsValidation,
  getSimilarQuestionsValidation,
} from "../validations/question.validation.js";

const router = express.Router();

// Create a new question
router.post(
  "/",
  authenticateUser,
  createQuestionValidation,
  createQuestionController,
);

/**
 * @route  GET /api/questions/search
 * @desc   Semantic search over questions using vector cosine similarity
 * @access Protected (Bearer token required)
 */
router.get(
  "/search",
  authenticateUser,
  searchQuestionsValidation,
  searchQuestionsSemanticController,
);

export default router;
/**
 * @route GET /api/questions/:questionHash/similar
 * @desc Get similar questions based on vector embeddings
 * @access Private    >>> line 75
 */
router.get(
  "/:questionHash/similar",
  authenticateUser,
  getSimilarQuestionsValidation,
  getSimilarQuestionsController,
);

export const questionRoutes = router;

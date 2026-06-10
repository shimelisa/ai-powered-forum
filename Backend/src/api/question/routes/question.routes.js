import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import { createQuestionController } from "../controller/question.controller.js"; 
import { createQuestionValidation } from "../validations/question.validation.js";
import { getSimilarQuestionsValidation } from "../validations/question.validation.js";

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
 * @access Private    >>> line 75
 */
router.get(
  "/:questionHash/similar",
  authenticateUser,
  getSimilarQuestionsValidation,
  getSimilarQuestionsController,
);

export const questionRoutes = router;

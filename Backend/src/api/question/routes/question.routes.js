import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import { createQuestionController, searchQuestionsSemanticController } from "../controller/question.controller.js"; 
import { createQuestionValidation, searchQuestionsValidation } from "../validations/question.validation.js";

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
  '/search',
  authenticateUser,
  searchQuestionsValidation,
  searchQuestionsSemanticController
);

export default router;

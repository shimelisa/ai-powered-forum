// question.routes.js
import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import { 
  createQuestionController, 
  searchQuestionsSemanticController,
  generateQuestionDraftCoachController // Added this import
} from "../controller/question.controller.js"; 
import { 
  createQuestionValidation, 
  searchQuestionsValidation,
  generateQuestionDraftCoachValidation // Added this import
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
 * @route   GET /api/questions/search
 * @desc    Semantic search over questions using vector cosine similarity
 * @access  Protected (Bearer token required)
 */
router.get(
  '/search',
  authenticateUser,
  searchQuestionsValidation,
  searchQuestionsSemanticController
);

/**
 * @route   POST /api/questions/draft-coach
 * @desc    AI coach to review question drafts and generate suggestions
 * @access  Protected (Bearer token required)
 */
router.post(
  '/draft-coach',
  authenticateUser,                        // Uses your project's auth middleware
  generateQuestionDraftCoachValidation,    // Validation layer
  generateQuestionDraftCoachController     // Controller logic layer
);

export default router;
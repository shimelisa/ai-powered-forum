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


//single question details
router.get(
  "/:questionHash",
  authenticateUser,
  getSingleQuestionValidation,
  getSingleQuestionController,
)
export const questionRoutes = router;

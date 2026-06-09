import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import { createQuestionController } from "../controller/question.controller.js"; 
import { createQuestionValidation } from "../validations/question.validation.js";

const router = express.Router();

// Create a new question
router.post(
  "/",
  authenticateUser,
  createQuestionValidation,
  createQuestionController,
);

export const questionRoutes = router;

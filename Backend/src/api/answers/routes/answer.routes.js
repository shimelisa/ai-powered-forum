import express from "express";
import {
  createAnswerController,
  deleteAnswerController,
  getAnswersController,
  getSingleAnswerController,
  updateAnswerController,
} from "../controller/answer.controller.js";

import {
  answerIdValidation,
  createAnswerValidation,
  getAnswersValidation,
  updateAnswerValidation,
} from "../validations/answer.validation.js";

import { authenticateUser } from "../../../middleware/authentication.js";

const router = express.Router();

// POST /api/answers
router.post(
  "/",
  authenticateUser,
  createAnswerValidation,
  createAnswerController,
);

// GET /api/answers
router.get("/", getAnswersValidation, getAnswersController);

// GET /api/answers/:id
router.get("/:id", answerIdValidation, getSingleAnswerController);

// PUT /api/answers/:id
router.put(
  "/:id",
  authenticateUser,
  updateAnswerValidation,
  updateAnswerController,
);

// DELETE /api/answers/:id
router.delete(
  "/:id",
  authenticateUser,
  answerIdValidation,
  deleteAnswerController,
);

export default router;

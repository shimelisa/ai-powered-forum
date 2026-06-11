import { body, param, query } from "express-validator";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";

// Validation for creating a new question
export const createQuestionValidation = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .withMessage("Title must be a string")
    .isLength({ min: 5, max: 150 })
    .withMessage("Title must be between 5 and 150 characters")
    .trim(),
  body("content")
    .notEmpty()
    .withMessage("Content is required")
    .isString()
    .isLength({ min: 10 })
    .withMessage("Content must be at least 10 characters long")
    .trim(),
  validationErrorHandler,
];

export const getSimilarQuestionsValidation = [
  param("questionHash")
    .isString()
    .withMessage("Question hash is required")
    .matches(/^[a-f0-9]{16}$/)
    .withMessage("Question hash must be a 16-character lowercase hex string"),
  query("k")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("k must be between 1 and 20")
    .toInt(),
  query("threshold")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("threshold must be between 0 and 1")
    .toFloat(),
  validationErrorHandler,
];

// Validation for getting a single question details
export const getSingleQuestionValidation = [
  param("questionHash")
    .notEmpty()
    .withMessage("Question Hash is required")
    .isString()
    .withMessage("Question Hash must be a string")
    .matches(/^[a-f0-9]{16}$/)
    .withMessage("Question Hash must be a 16-character lowercase string"),
  validationErrorHandler,
];
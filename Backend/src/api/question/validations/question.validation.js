import {body, param, query} from 'express-validator';
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
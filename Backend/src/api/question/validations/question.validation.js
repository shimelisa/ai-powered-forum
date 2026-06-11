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

/**
 * Validation rules for GET /api/questions/search
 *
 * query  – required, string, min 5 chars
 * k      – optional, integer, 1–20  (defaults to RECOMMEND_K in service)
 * threshold – optional, float, 0–1 (defaults to RECOMMEND_THRESHOLD in service)
 */
export const searchQuestionsValidation = [
  query('query')
    .notEmpty()
    .withMessage('Search query is required')
    .isString()
    .withMessage('Search query must be a string')
    .isLength({ min: 5 })
    .withMessage('Search query must be at least 5 characters')
    .trim(),

  query('k')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('k must be an integer between 1 and 20')
    .toInt(),

  query('threshold')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('threshold must be a float between 0 and 1')
    .toFloat(),

  validationErrorHandler,
];

export const getQuestionsValidation = [
  query("search")
    .optional()
    .isString()
    .withMessage("Search must be a string")
    .trim(),

  query("mine")
    .optional()
    .isBoolean()
    .withMessage("Mine must be a boolean")
    .toBoolean(),

  validationErrorHandler,
];

/**
 * T-17 Draft Coach Validation
 */
export const generateQuestionDraftCoachValidation = [
  body("title")
    .optional()
    .isString()
    .withMessage("Title must be a string")
    .trim(),

  body("content")
    .notEmpty()
    .withMessage("Content is required")
    .isString()
    .withMessage("Content must be a string")
    .isLength({ min: 10 })
    .withMessage("Content must be at least 10 characters")
    .trim(),

  validationErrorHandler,
];
/**
 * @file rag.validation.js
 * @description Validation middleware for RAG document routes.
 */

import { param, body, query } from "express-validator";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";

/**
 * Validates :documentId route parameter.
 * Reusable across all RAG routes that use :documentId.
 */
export const documentIdParamValidation = [
  param("documentId")
    .notEmpty()
    .withMessage("Document ID is required")
    .isInt({ min: 1 })
    .withMessage("Document ID must be a positive integer")
    .toInt(),
  validationErrorHandler,
];

/**
 * Validates search query params for semantic search.
 * GET /api/rag/documents/:documentId/search
 */
export const searchDocumentValidation = [
  param("documentId")
    .notEmpty()
    .withMessage("Document ID is required")
    .isInt({ min: 1 })
    .withMessage("Document ID must be a positive integer")
    .toInt(),
  query("query")
    .notEmpty()
    .withMessage("Search query is required")
    .isString()
    .withMessage("Query must be a string")
    .trim(),
  query("k")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("k must be between 1 and 20")
    .toInt(),
  validationErrorHandler,
];

/**
 * Validates body for AI query.
 * POST /api/rag/documents/:documentId/query
 */
export const queryDocumentValidation = [
  param("documentId")
    .notEmpty()
    .withMessage("Document ID is required")
    .isInt({ min: 1 })
    .withMessage("Document ID must be a positive integer")
    .toInt(),
  body("query")
    .notEmpty()
    .withMessage("Query is required")
    .isString()
    .withMessage("Query must be a string")
    .trim(),
  validationErrorHandler,
];

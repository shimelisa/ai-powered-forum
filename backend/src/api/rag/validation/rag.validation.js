import { param, body, query} from "express-validator";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";




//AI Query Grounded document validation----ed
export const queryDocumentValidation = [
  param("documentId")
    .isInt({ min: 1 })
    .withMessage("Document ID must be a positive integer")
    .toInt(),
  body("query")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Query is required and must be a string")
    .isLength({ min: 8 })
    .withMessage("Query must be at least 8 characters"),
  validationErrorHandler,
];



// // ============================================================
// // DOCUMENT ID VALIDATION
// // ============================================================

export const documentIdParamValidation = [
  param('documentId')
    .isInt({ min: 1 })
    .withMessage('Document ID must be a positive integer')
    .toInt(),
    validationErrorHandler
];

// // ============================================================
// // DELETE DOCUMENT VALIDATION
// // ============================================================

// export const deleteDocumentValidation = [
//   param('documentId')
//     .isInt({ min: 1 })
//     .withMessage('Document ID must be a positive integer')
//     .toInt(),
// ];

// // ============================================================
// // SEARCH IN DOCUMENT VALIDATION
// // ============================================================

export const searchInDocumentValidation = [
  param('documentId')
    .isInt({ min: 1 })
    .withMessage('Document ID must be a positive integer')
    .toInt(),
  query('query')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  query('k')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('k must be between 1 and 50')
    .toInt(),
  query('threshold')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Threshold must be between 0 and 1')
    .toFloat(),
    validationErrorHandler
];



// // ============================================================
// // GLOBAL SEARCH VALIDATION
// // ============================================================

export const searchDocumentsValidation = [
  query('query')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('threshold')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Threshold must be between 0 and 1')
    .toFloat(),
    validationErrorHandler,
];

// // ============================================================
// // BULK DELETE VALIDATION
// // ============================================================

// export const bulkDeleteValidation = [
//   body('documentIds')
//     .isArray({ min: 1 })
//     .withMessage('documentIds must be a non-empty array')
//     .custom((ids) => {
//       if (!ids.every(id => Number.isInteger(id) && id > 0)) {
//         throw new Error('All document IDs must be positive integers');
//       }
//       return true;
//     }),
// ];

// // ============================================================
// // CREATE DOCUMENT VALIDATION
// // ============================================================


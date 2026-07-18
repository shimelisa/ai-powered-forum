/**
 * @file rag.routes.js
 * @description All RAG document routes.
 * Mount at: /api/rag/documents
 */ 

import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
import {
  ragUpload,
  createDocumentMulterErrorHandler,
} from "../config/rag.upload.config.js";
import {
  createDocumentController,
  listDocumentsController,
  getDocumentMetaController,
  getDocumentFileController,
  searchInDocumentController,
  queryDocumentController,
  deleteDocumentController,
} from "../controller/rag.controller.js";
import {
  documentIdParamValidation,
  searchDocumentValidation,
  queryDocumentValidation,
} from "../validation/rag.validation.js";

const router = express.Router();

// ── T-22 ───────────────────────────────
/**
 * @route POST /api/rag/documents
 * @desc  Upload and process a PDF
 */
router.post(
  '/',
  authenticateUser,
  ragUpload.single('file'),
  createDocumentMulterErrorHandler,
  createDocumentController
);

// ── T-24 ───────────────────────────────
/**
 * @route GET /api/rag/documents
 * @desc  List all documents for the user
 */
router.get('/', authenticateUser, listDocumentsController);

/**
 * @route GET /api/rag/documents/:documentId
 * @desc  Get document metadata
 */
router.get(
  '/:documentId',
  authenticateUser,
  documentIdParamValidation,
  getDocumentMetaController
);

/**
 * @route GET /api/rag/documents/:documentId/file
 * @desc Stream PDF blob for browser preview
 * @access Protected
 */
router.get(
  "/:documentId/file",
  authenticateUser,
  documentIdParamValidation,
  getDocumentFileController,
);

/**
 * @route DELETE /api/rag/documents/:documentId
 * @desc  Delete document (row + PDF bytes) from the DB
 */
router.delete(
  '/:documentId',
  authenticateUser,
  documentIdParamValidation,
  deleteDocumentController
);

// ── T-23 ───────────────────────────────
/**
 * @route GET /api/rag/documents/:documentId/search
 * @desc  Semantic search within a document
 */
router.get(
  '/:documentId/search',
  authenticateUser,
  searchDocumentValidation,
  searchInDocumentController
);

/**
 * @route POST /api/rag/documents/:documentId/query
 * @desc  AI query grounded in document
 */
router.post(
  '/:documentId/query',
  authenticateUser,
  queryDocumentValidation,
  queryDocumentController
);

export default router;

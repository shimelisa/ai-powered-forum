import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
// Fixed: Added config/ folder
import {
  uploadRagDocument,
  createDocumentMulterErrorHandler, uploadRagDocumentWithErrorHandling,
} from "../config/rag.upload.config.js";
import {
  createDocumentController,
  listDocumentsController,
  getDocumentMetaController,
  queryDocumentController,
  getDocumentFileController,
  searchInDocumentController,
  deleteDocumentController,
} from "../controller/rag.controller.js";
import { documentIdParamValidation } from "../validation/rag.validation.js";
import { queryDocumentValidation } from "../validation/rag.validation.js";

import { searchInDocumentValidation } from "../validation/rag.validation.js";

const router = express.Router();

// Upload document route

router.post(
  "/",
  authenticateUser,
  uploadRagDocumentWithErrorHandling,
  createDocumentController,
);


router.get("/", authenticateUser, listDocumentsController);

router.get(
  "/:documentId",
  authenticateUser,
  documentIdParamValidation,
  getDocumentMetaController,
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

//AI Query Grounded RAG system route
router.post(
  "/:documentId/query",
  authenticateUser,
  queryDocumentValidation,
  queryDocumentController,
);

router.delete(
  "/:documentId",
  authenticateUser,
  documentIdParamValidation,
  deleteDocumentController,
);

router.get(
  "/:documentId/search",
  authenticateUser,
  searchInDocumentValidation,
  searchInDocumentController,
);

export default router;

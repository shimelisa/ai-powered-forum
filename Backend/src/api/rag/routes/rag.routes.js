import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
// Fixed: Added config/ folder
import { uploadRagDocument, createDocumentMulterErrorHandler } from "../config/rag.upload.config.js";

import { queryDocumentValidation } from "../validation/rag.validation.js";

import {
  createDocumentController,
  listDocumentsController,
  queryDocumentController,
} from "../controller/rag.controller.js";

const router = express.Router();

// ============================================================
// DOCUMENT ROUTES - CREATE/UPLOAD ONLY
// ============================================================

// Upload document
router.post(
  "/documents",
  authenticateUser,
  (req, res, next) => {
    uploadRagDocument.single("file")(req, res, (err) => {
      if (err) {
        return createDocumentMulterErrorHandler(err, req, res, next);
      }
      next();
    });
  },
  createDocumentController
);

router.get("/documents", authenticateUser, listDocumentsController);


//AI Query Grounded RAG system route----ed
router.post(
  "/:documentId/query",
  authenticateUser,
  queryDocumentValidation,
  queryDocumentController,
);

export default router;
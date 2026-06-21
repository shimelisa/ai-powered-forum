import express from "express";
import { authenticateUser } from "../../../middleware/authentication.js";
// Fixed: Added config/ folder
import { uploadRagDocument, createDocumentMulterErrorHandler } from "../config/rag.upload.config.js";
import { createDocumentController, listDocumentsController,getDocumentMetaController,  queryDocumentController, getDocumentFileController} from "../controller/rag.controller.js";
import { documentIdParamValidation } from "../validation/rag.validation.js";
import { queryDocumentValidation } from "../validation/rag.validation.js";


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

router.get("/documents/:documentId",
  authenticateUser,
  documentIdParamValidation,
  getDocumentMetaController
)

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

//AI Query Grounded RAG system route----ed
router.post(
  "/:documentId/query",
  authenticateUser,
  queryDocumentValidation,
  queryDocumentController,
);

export default router;
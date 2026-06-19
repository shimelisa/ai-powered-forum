import express from "express";
import { authenticateUser } from "../../middleware/authentication.js";
// Fixed: Added config/ folder
import { uploadRagDocument, createDocumentMulterErrorHandler } from "../config/rag.upload.config.js";
import { createDocumentController } from "../controller/rag.controller.js";

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

export default router;
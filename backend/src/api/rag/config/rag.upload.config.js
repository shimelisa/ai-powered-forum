/**
 * @file rag.upload.config.js
 * @description Multer configuration for RAG PDF uploads.
 * Accepts only PDF files, enforces size limit from .env.
 *
 * NOTE: uses memoryStorage (not diskStorage). The uploaded file is
 * kept in RAM as req.file.buffer and persisted straight into MySQL
 * as a LONGBLOB — this is what makes uploads survive a deploy on
 * hosts with an ephemeral filesystem (Vercel, Render free tier, etc.),
 * since nothing is ever written to local disk.
 */

import multer from "multer";

const RAG_MAX_UPLOAD_MB = parseInt(process.env.RAG_MAX_UPLOAD_MB ?? "5", 10);

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

export const ragUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: RAG_MAX_UPLOAD_MB * 1024 * 1024 },
});

/**
 * Handles multer-specific errors (file too large, wrong type).
 * Must be placed after ragUpload middleware in the route chain.
 */
export const createDocumentMulterErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${RAG_MAX_UPLOAD_MB}MB.`,
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err?.message === "Only PDF files are allowed") {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
};

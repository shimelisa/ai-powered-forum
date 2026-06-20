import { StatusCodes } from "http-status-codes";
import { createDocumentFromUploadService, listDocumentsForUserService } from "../service/rag.service.js";

// ============================================================
// CREATE / UPLOAD DOCUMENT
// ============================================================

export const createDocumentController = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "No file uploaded. Please upload a PDF file.",
      });
    }

    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "User not authenticated.",
      });
    }

    const document = await createDocumentFromUploadService({
      file: req.file,
      userId: userId,
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Document uploaded and processed successfully.",
      data: document,
    });
  } catch (error) {
    console.error("❌ Controller error:", error);
    next(error);
  }
};

/**
 * GET /api/rag/documents
 * Returns all documents owned by the authenticated user.
 */

export const listDocumentsController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const documents = await listDocumentsForUserService(userId);
 
    return res.status(200).json({
      success: true,
      message: 'Documents fetched successfully.',
      data: documents,
    });
  } catch (error) {
    return next(error);
  }
}
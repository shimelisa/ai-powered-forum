import { StatusCodes } from "http-status-codes";
import {
  createDocumentFromUploadService,
  listDocumentsForUserService,
  getDocumentMetaService,
  queryDocumentService,
  getDocumentFileService,
  searchInDocumentService,
  deleteDocumentService,
} from "../service/rag.service.js";

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
    console.error(" Controller error:", error);
    next(error);
  }
};

/**
 * GET /api/rag/documents
 * Returns all documents owned by the authenticated user.
 * @route   GET /api/rag/documents/:documentId
 * @desc    Fetch document metadata
 * @access Protected
 */
export const getDocumentMetaController = async (req, res, next) => {
  try {
    const data = await getDocumentMetaService(
      req.params.documentId,
      req.user.id,
    );
    res.status(200).json({
      success: true,
      message: "Document fetched successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/rag/documents/:documentId/file
 * @desc Stream PDF file for browser preview
 * @access Protected
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const getDocumentFileController = async (req, res, next) => {
  try {
    const { absolutePath, title, mimeType } = await getDocumentFileService(
      req.params.documentId,
      req.user.id,
    );
    res.sendFile(
      absolutePath,
      {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `inline; filename="${title}"`,
        },
      },
      (err) => {
        if (err) next(err);
      },
    );
  } catch (error) {
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
      message: "Documents fetched successfully.",
      data: documents,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Handles incoming query requests for a specific document.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const queryDocumentController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { query } = req.body;
    const data = await queryDocumentService({
      documentId,
      userId: req.user.id,
      query,
    });
    res.status(200).json({
      success: true,
      message: "Answer and citations generated successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const searchInDocumentController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { query, k, threshold } = req.query;
    const data = await searchInDocumentService({
      documentId,
      userId: req.user.id,
      query,
      k,
      threshold,
    });
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Ranked chunk excerpts",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocumentController = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const data = await deleteDocumentService(documentId, req.user.id);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Document deleted successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

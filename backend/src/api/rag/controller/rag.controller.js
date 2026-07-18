/**
 * @file rag.controller.js
 * @description All RAG document controllers.
 */

import {
  createDocumentFromUploadService,
  listDocumentsForUserService,
  getDocumentMetaService,
  getDocumentFileService,
  searchInDocumentService,
  queryDocumentService,
  deleteDocumentService,
} from "../service/rag.service.js";

// ── T-22: Upload & Process ───────────────────────────────────────────────────
/**
 * @route  POST /api/rag/documents
 * @desc   Upload PDF, parse, chunk, embed, store
 * @access Protected
 */
export const createDocumentController = async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded." });
    }
    const userId = req.user.id;
    const data = await createDocumentFromUploadService({
      file: req.file,
      userId,
    });
    res.status(201).json({
      success: true,
      message: "Document uploaded and processed.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ── T-24: List Documents ─────────────────────────────────────────────────────
/**
 * @route  GET /api/rag/documents
 * @desc   List all documents for the logged-in user
 * @access Protected
 */
export const listDocumentsController = async (req, res, next) => {
  try {
    const data = await listDocumentsForUserService(req.user.id);
    res.status(200).json({
      success: true,
      message: "Documents fetched successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ── T-24: Get Metadata ───────────────────────────────────────────────────────
/**
 * @route  GET /api/rag/documents/:documentId
 * @desc   Fetch document metadata
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

// ── T-24: Stream File ────────────────────────────────────────────────────────
/**
 * @route GET /api/rag/documents/:documentId/file
 * @desc Stream PDF bytes (from DB, not disk) for browser preview
 * @access Protected
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const getDocumentFileController = async (req, res, next) => {
  try {
    const { buffer, title, mimeType } = await getDocumentFileService(
      req.params.documentId,
      req.user.id,
    );

    res.set({
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${title}"`,
      "Content-Length": buffer.length,
    });
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// ── T-23: Semantic Search ────────────────────────────────────────────────────
/**
 * @route  GET /api/rag/documents/:documentId/search
 * @desc   Semantic search within a document
 * @access Protected
 */
export const searchInDocumentController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { query, k } = req.query;
    const data = await searchInDocumentService({
      documentId,
      userId: req.user.id,
      query,
      k: k ? parseInt(k, 10) : undefined,
    });
    res.status(200).json({
      success: true,
      message: "Ranked chunk excerpts",
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ── T-23: AI Query ───────────────────────────────────────────────────────────
/**
 * @route  POST /api/rag/documents/:documentId/query
 * @desc   AI answer grounded in document chunks
 * @access Protected
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
      message: "Answer and citations",
      data,
    });
  } catch (error) {
    console.error("queryDocumentController error:", error);
    next(error);
  }
};

// ── T-24: Delete ─────────────────────────────────────────────────────────────
/**
 * @route  DELETE /api/rag/documents/:documentId
 * @desc   Delete PDF (from DB) and its chunks/vectors
 * @access Protected
 */
export const deleteDocumentController = async (req, res, next) => {
  try {
    const data = await deleteDocumentService(
      req.params.documentId,
      req.user.id,
    );
    res.status(200).json({
      success: true,
      message: "Document deleted successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

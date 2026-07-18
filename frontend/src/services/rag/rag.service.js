/**
 * @file rag.service.js  (FRONTEND)
 * @description Frontend service for RAG document API calls.
 * Path: src/services/rag/rag.service.js
 */

import { apiClient } from "../core/api.client.js";

/** List all documents for the logged-in user */
export const listDocuments = () => apiClient.get("/api/rag/documents");

/** Upload a PDF file */
export const uploadPdf = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await apiClient.post("/api/rag/documents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res;
  } catch (err) {
    console.log(
      "📤 upload error:",
      err.message,
      "| status:",
      err.response?.status,
      "| code:",
      err.code,
    ); // remove later
    throw err;
  }
};

/** Delete a document by ID */
export const deleteDocument = (documentId) =>
  apiClient.delete(`/api/rag/documents/${documentId}`);

/** Semantic search within a document */
export const searchInDocument = (documentId, query) =>
  apiClient.get(`/api/rag/documents/${documentId}/search`, {
    params: { query },
  });

/** AI query grounded in document context */
export const queryDocument = (documentId, query) =>
  apiClient.post(`/api/rag/documents/${documentId}/query`, { query });

/**
 * Stream RAG Document PDF (T-24)
 * Calls GET /api/rag/documents/:documentId/file
 * Returns a blob URL for use in an <iframe>.
 * IMPORTANT: caller must call URL.revokeObjectURL(url) on cleanup.
 */
export const fetchPdfObjectUrl = async (documentId) => {
  const res = await apiClient.get(`/api/rag/documents/${documentId}/file`, {
    responseType: "blob", // tells axios to return raw binary
  });
  return URL.createObjectURL(res.data); // creates temporary browser URL
};

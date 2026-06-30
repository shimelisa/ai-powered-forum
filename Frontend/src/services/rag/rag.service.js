import { apiClient } from "../core/api.client.js";

/**
 * Centralized Custom Error Handler
 * Translates backend failures or missing routes into user-friendly message strings.
 */
function handleRagError(error, action = "fetch") {
  if (!error.response) {
    if (error.code === "ECONNABORTED") {
      return new Error(
        "The request timed out. Please check your network speed and try again.",
      );
    }
    return new Error(
      "Unable to reach the server. Please verify your internet connection or check if the backend service is running.",
    );
  }

  const status = error.response.status;
  const backendMessage =
    error.response.data?.message || error.response.data?.msg;

  // Custom actionable feedback based on backend constraints
  if (status === 413) {
    return new Error(
      backendMessage ||
        "This PDF file is too large. The maximum allowed limit is 10MB.",
    );
  }
  if (status === 400) {
    return new Error(
      backendMessage ||
        "Invalid request. Please ensure you are uploading a valid PDF document.",
    );
  }
  if (status === 401) {
    return new Error(
      "Your session has expired. Please log in again to manage your knowledge base.",
    );
  }
  if (status === 403) {
    return new Error(
      "Access Denied. You do not have permission to view or manage this document.",
    );
  }
  if (status === 404) {
    return new Error(
      backendMessage ||
        "The requested service endpoint or document could not be found on the server.",
    );
  }

  return new Error(
    backendMessage ||
      `Failed to ${action} document data. Please try again later.`,
  );
}

/**
 * Maps raw database rows (snake_case) to standard frontend model keys (camelCase).
 * Matches the backend schema outputs.
 */

function mapDocument(row) {
  if (!row) return null;
  return {
    id: row.documentId ?? row.document_id ?? row.id,
    userId: row.userId ?? row.user_id,
    title: row.title,
    mimeType: row.mimeType ?? row.mime_type,
    byteSize: row.byteSize ?? row.byte_size,
    status: row.status,
    errorMessage: row.errorMessage ?? row.error_message ?? null,
    createdAt: row.createdAt ?? row.created_at,
    updatedAt: row.updatedAt ?? row.updated_at,
  };
}

/**
 * Upload & Process RAG Document
 * Endpoint: POST /api/rag/documents
 */
export const uploadPdf = async (file) => {
  try {
    const form = new FormData();
    form.append("file", file);

    const response = await apiClient.post("/api/rag/documents", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return mapDocument(response.data?.data);
  } catch (error) {
    throw handleRagError(error, "upload");
  }
};

/**
 * List My RAG Documents
 * Endpoint: GET /api/rag/documents
 */
export const listDocuments = async () => {
  try {
    const response = await apiClient.get("/api/rag/documents");
    const rawRows = response.data?.data || [];
    return { data: rawRows.map(mapDocument) };
  } catch (error) {
    throw handleRagError(error, "fetch list of");
  }
};

/**
 * Delete RAG Document
 * Endpoint: DELETE /api/rag/documents/:documentId
 */
export const deleteDocument = async (documentId) => {
  try {
    if (!documentId)
      throw new Error("A valid document identification key is required.");
    const response = await apiClient.delete(`/api/rag/documents/${documentId}`);
    return response.data;
  } catch (error) {
    throw handleRagError(error, "delete");
  }
};

/**
 * Semantic Search in RAG Document
 * Endpoint: GET /api/rag/documents/:documentId/search?query=...
 */
export const searchInDocument = async (documentId, query) => {
  try {
    if (!documentId || !query) {
      throw new Error(
        "Missing document context or search phrase target string.",
      );
    }

    const response = await apiClient.get(
      `/api/rag/documents/${documentId}/search`,
      {
        params: { query: query },
      },
    );

    const backendResults = response.data?.data?.results || [];

    // Convert backend `excerpt` key safely to `text` for your UI component mapping
    const standardized = backendResults.map((item) => ({
      score: item.score,
      text: item.excerpt || item.text || "",
    }));

    return { data: standardized };
  } catch (error) {
    throw handleRagError(error, "execute search inside");
  }
};

/**
 * AI Query Grounded in RAG Document
 * Endpoint: POST /api/rag/documents/:documentId/query
 */
export const queryDocument = async (documentId, query) => {
  try {
    if (!documentId || !query) {
      throw new Error("Missing document target context or query parameters.");
    }

    const response = await apiClient.post(
      `/api/rag/documents/${documentId}/query`,
      {
        query: query,
      },
    );

    const aiPayload = response.data?.data || response.data;

    // Safely structure source contexts to verify UI array iteration maps correctly
    if (aiPayload && aiPayload.citations) {
      aiPayload.citations = aiPayload.citations.map((citation) => ({
        text:
          citation.text ||
          `Reference passage chunk context index: ${citation.chunkIndex ?? ""}`,
      }));
    }

    return { data: aiPayload };
  } catch (error) {
    throw handleRagError(error, "generate AI reply for");
  }
};

/**
 * Stream RAG Document PDF
 * Endpoint: GET /api/rag/documents/:documentId/file
 */
export const fetchPdfObjectUrl = async (documentId) => {
  try {
    if (!documentId)
      throw new Error("A valid document identification key is required.");
    const response = await apiClient.get(
      `/api/rag/documents/${documentId}/file`,
      {
        responseType: "blob",
      },
    );
    return response;
  } catch (error) {
    throw handleRagError(error, "stream preview file for");
  }
};

/**
 * Get RAG Document Metadata
 * Endpoint: GET /api/rag/documents/:documentId
 */
export const getDocumentMeta = async (documentId) => {
  try {
    if (!documentId)
      throw new Error("A valid document identification key is required.");
    const response = await apiClient.get(`/api/rag/documents/${documentId}`);
    return { data: mapDocument(response.data?.data || response.data) };
  } catch (error) {
    throw handleRagError(error, "fetch details for");
  }
};

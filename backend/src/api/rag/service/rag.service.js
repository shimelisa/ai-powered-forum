/**
 * @file rag.service.js (BACKEND)
 * @description All RAG document service functions.
 *
 * STORAGE NOTE:
 *   PDF bytes are stored directly in MySQL (documents.file_data, LONGBLOB)
 *   instead of on local disk. Uploads use multer memoryStorage, so
 *   req.file.buffer is already in RAM — we never touch the filesystem.
 *   This is what makes uploads/downloads work when the backend is
 *   deployed somewhere with an ephemeral filesystem (Vercel, Render
 *   free tier, restarts/redeploys, multiple instances, etc.) — the
 *   file lives with the rest of the data in the database, not on
 *   whichever machine happened to handle the upload request.
 */
import { safeExecute } from "../../../../db/config.js";
import { GoogleGenAI } from "@google/genai";
import { PDFParse } from "pdf-parse";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash-lite";
const RAG_CHUNK_CHARS = parseInt(process.env.RAG_CHUNK_CHARS ?? "900", 10);
const RAG_CHUNK_OVERLAP = parseInt(process.env.RAG_CHUNK_OVERLAP ?? "120", 10);
const RAG_SEARCH_K = parseInt(process.env.RAG_SEARCH_K ?? "10", 10);
const SEMANTIC_LEN = parseInt(process.env.SEMANTIC_LEN ?? "250", 10);
const RAG_SEARCH_THRESHOLD = parseFloat(
  process.env.RAG_SEARCH_THRESHOLD ?? "0.45",
);
const RAG_DIMENSION = parseInt(
  process.env.RAG_OUTPUTDIMENSIONALITY ?? "768",
  10,
);

// ── Shared: assertOwnedDocument ──────────────────────────────────────────────
/**
 * Verifies that a document exists and belongs to the requesting user.
 * Reusable across all RAG controllers (file, search, query, delete, meta).
 *
 * @param {number} documentId - The document ID from the route param.
 * @param {number} userId - The authenticated user's ID from req.user.id.
 * @returns {Promise<Object>} The full document row from the DB (no file_data).
 * @throws {Error} 404 if not found or not owned by this user.
 */
export const assertOwnedDocument = async (documentId, userId) => {
  const rows = await safeExecute(
    `SELECT
       document_id, user_id, title,
       mime_type, byte_size,
       status, error_message, created_at, updated_at
     FROM documents
     WHERE document_id = ? AND user_id = ?
     LIMIT 1`,
    [documentId, userId],
  );

  if (rows.length === 0) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

// ── T-22: Upload & Process ───────────────────────────────────────────────────
const chunkText = (text) => {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + RAG_CHUNK_CHARS));
    start += RAG_CHUNK_CHARS - RAG_CHUNK_OVERLAP;
  }
  return chunks.filter((c) => c.trim().length > 0);
};

//! generates Embedding for texts
const generateEmbedding = async (text, taskType = "RETRIEVAL_DOCUMENT") => {
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType,
      outputDimensionality: RAG_DIMENSION,
    },
  });
  return result.embeddings[0].values;
};

export const createDocumentFromUploadService = async ({ file, userId }) => {
  // file.buffer comes from multer memoryStorage — never written to disk.
  const insertResult = await safeExecute(
    `INSERT INTO documents (user_id, title, mime_type, byte_size, file_data, status)
     VALUES (?, ?, ?, ?, ?, 'processing')`,
    [userId, file.originalname, file.mimetype, file.size, file.buffer],
  );
  const documentId = insertResult.insertId;

  try {
    const parser = new PDFParse({
      data: file.buffer,
    });

    const result = await parser.getText();
    const rawText = result.text;

    const chunks = chunkText(rawText);

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      const chunkResult = await safeExecute(
        `INSERT INTO document_chunks (document_id, chunk_index, content) VALUES (?, ?, ?)`,
        [documentId, i, content],
      );
      const embedding = await generateEmbedding(content, "RETRIEVAL_DOCUMENT");

      await safeExecute(
        `INSERT INTO document_chunk_vectors (chunk_id, source_text, embedding, status)
         VALUES (?, ?, ?, 'ready')`,
        [chunkResult.insertId, content, JSON.stringify(embedding)],
      );
    }

    await safeExecute(
      `UPDATE documents SET status = 'ready' WHERE document_id = ?`,
      [documentId],
    );
  } catch (err) {
    await safeExecute(
      `UPDATE documents SET status = 'failed', error_message = ? WHERE document_id = ?`,
      [err.message, documentId],
    );
  }

  const rows = await safeExecute(
    `SELECT document_id, user_id, title, mime_type, byte_size, status, error_message, created_at, updated_at
     FROM documents WHERE document_id = ? LIMIT 1`,
    [documentId],
  );
  return rows[0];
};

// ── T-23: Semantic Search ────────────────────────────────────────────────────
const cosineSimilarity = (a, b) => {
  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

const truncateAtSentence = (text, maxLength = 300) => {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(".");
  return lastPeriod > 0 ? truncated.slice(0, lastPeriod + 1) : truncated;
};

//! searchInDocumentService
export const searchInDocumentService = async ({
  documentId,
  userId,
  query,
  k = RAG_SEARCH_K,
}) => {
  const doc = await assertOwnedDocument(documentId, userId);

  if (doc.status !== "ready") {
    const err = new Error(`Document is not ready. Status: ${doc.status}`);
    err.statusCode = 409;
    throw err;
  }

  let queryVector;
  try {
    queryVector = await generateEmbedding(query, "RETRIEVAL_QUERY");
  } catch (embedErr) {
    throw embedErr;
  }

  const vectors = await safeExecute(
    `SELECT dcv.chunk_id, dcv.source_text, dcv.embedding, dc.chunk_index
     FROM document_chunk_vectors dcv
     JOIN document_chunks dc ON dc.chunk_id = dcv.chunk_id
     WHERE dc.document_id = ? AND dcv.status = 'ready'`,
    [documentId],
  );

  const allScored = vectors
    .map((row) => {
      try {
        const embedding =
          typeof row.embedding === "string"
            ? JSON.parse(row.embedding)
            : row.embedding;

        const score = cosineSimilarity(queryVector, embedding);
        return {
          chunkId: row.chunk_id,
          chunkIndex: row.chunk_index,
          excerpt: truncateAtSentence(row.source_text, SEMANTIC_LEN),
          score,
        };
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);

  const scored = allScored
    .filter((r) => r.score >= RAG_SEARCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return { query, results: scored };
};

// ── T-23: AI Query ───────────────────────────────────────────────────────────
export const queryDocumentService = async ({ documentId, userId, query }) => {
  const { results } = await searchInDocumentService({
    documentId,
    userId,
    query,
    k: 5,
  });

  if (results.length === 0) {
    return {
      answer: "No relevant content found in this document for your query.",
      citations: [],
      chunksUsed: [],
    };
  }

  const context = results.map((r, i) => `[${i + 1}] ${r.excerpt}`).join("\n\n");

  const prompt = `
You are an assistant that answers questions using the document excerpts below as your primary source of information.
Synthesize an answer using the relevant details across all excerpts, even if no single excerpt fully answers the question
on its own. Cite excerpt numbers like [1], [2] for any claim you make. Only say "This document does not cover that topic."
if NONE of the excerpts contain any information relevant to the question. 
Formatting rules:
- Always use Markdown formatting.
- Always separate paragraphs with a blank line.
- Never return the answer as a single paragraph.
- Keep each paragraph 2-3 sentences maximum.
- Keep citations like [1], [2] exactly where they support the information.

Document excerpts:
${context}

Question: ${query}

Answer (cite excerpt numbers like [1], [2] where relevant):`;

  const result = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
  });

  const answer = result.text;  

  // only include citations that Gemini actually referenced in the answer text
  const citedRefs = new Set(
    [...answer.matchAll(/\[(\d+)\]/g)].map((m) => parseInt(m[1], 10)),
  );

  const citations = results
    .map((r, i) => ({ ref: i + 1, chunkIndex: r.chunkIndex }))
    .filter((c) => citedRefs.has(c.ref));

  return {
    answer,
    citations,
    chunksUsed: results.map((r) => r.chunkId),
  };
};

// ── T-24: Get Metadata ───────────────────────────────────────────────────────
export const getDocumentMetaService = async (documentId, userId) =>
  assertOwnedDocument(documentId, userId);

// ── T-24: Stream File ────────────────────────────────────────────────────────
/**
 * Retrieves the PDF bytes straight out of the database (documents.file_data).
 * @param {number} documentId
 * @param {number} userId
 * @returns {{ buffer: Buffer, title: string, mimeType: string }}
 */
export const getDocumentFileService = async (documentId, userId) => {
  // ownership check first (also confirms the doc exists for this user)
  await assertOwnedDocument(documentId, userId);

  const rows = await safeExecute(
    `SELECT title, mime_type, file_data
     FROM documents
     WHERE document_id = ? AND user_id = ?
     LIMIT 1`,
    [documentId, userId],
  );

  if (rows.length === 0 || !rows[0].file_data) {
    const err = new Error("Document file not found");
    err.statusCode = 404;
    throw err;
  }

  const { title, mime_type, file_data } = rows[0];

  return {
    buffer: file_data,
    title,
    mimeType: mime_type,
  };
};

// ── T-24: List Documents ─────────────────────────────────────────────────────
// { "document_id": 32, "title": "...", "mime_type": "...", "byte_size": ..., "status": "ready", "created_at": "...", "updated_at":"..." }
export const listDocumentsForUserService = async (userId) => {
  const rows = await safeExecute(
    `SELECT document_id, title, mime_type, byte_size, status,
            error_message, created_at, updated_at
     FROM documents
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId],
  );

  return rows.map((row) => ({
    document_id: row.document_id,
    title: row.title,
    mime_type: row.mime_type,
    byte_size: row.byte_size,
    status: row.status,
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
};

// ── T-24: Delete ─────────────────────────────────────────────────────────────
export const deleteDocumentService = async (documentId, userId) => {
  const doc = await assertOwnedDocument(documentId, userId);

  // No disk cleanup needed — file_data lives in the documents row and is
  // removed by the DELETE below (chunks/vectors cascade via FK).
  await safeExecute("DELETE FROM documents WHERE document_id = ? AND user_id = ?", [
    documentId,
    userId,
  ]);
  return { id: doc.document_id };
};

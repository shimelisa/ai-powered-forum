import fs from "fs/promises";
import path from "path";
// import PDFParser from "pdf2json";
import { PDFParse } from "pdf-parse";
import { generateEmbedding, generateAnswer } from "./gemini.service.js";
import { db, safeExecute } from "../../../../db/config.js";
import {
  calculateCosineSimilarity,
  rankChunksByQuery,
} from "./vector.service.js";
import { answerFromRagChunksService } from "./gemini.service.js";

// Helper Functions

const safeDecodeURIComponent = (str) => {
  try {
    return decodeURIComponent(str);
  } catch (error) {
    return str;
  }
};

// Helper: resolve storage_path safely
/**
 * Converts a relative storage_path to an absolute path.
 * Uses process.cwd() (backend root) to avoid path doubling on Windows.
 * @param {string} storagePath - e.g. "uploads/rag/file.pdf"
 * @returns {string} absolute path
 */
const resolveStoragePath = (storagePath) => {
  // if storagePath is already absolute (e.g. Windows "C:\..." or POSIX "/..."), use it directly
  if (path.isAbsolute(storagePath)) {
    return storagePath;
  }
  return path.join(process.cwd(), storagePath);
};

//Shared: assertOwnedDocument
/**
 * Verifies that a document exists and belongs to the requesting user.
 * Reusable across all RAG controllers (file, search, query, delete, meta).
 *
 * @param {number} documentId - The document ID from the route param.
 * @param {number} userId - The authenticated user's ID from req.user.id.
 * @returns {Promise<Object>} The full document row from the DB.
 * @throws {Error} 404 if not found or not owned by this user.
 */
export const assertOwnedDocument = async (documentId, userId) => {
  const rows = await safeExecute(
    `SELECT
       document_id, user_id, title,
       storage_path, mime_type, byte_size,
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
/**
 * Chunk text into overlapping segments
 */
const chunkText = (text, chunkSize = 1000, overlap = 150) => {
  if (!text || text.length === 0) {
    return [];
  }

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    // Try to end at a sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(".", end);
      const lastNewline = text.lastIndexOf("\n", end);
      const lastSpace = text.lastIndexOf(" ", end);

      const boundary = Math.max(lastPeriod, lastNewline, lastSpace);
      if (boundary > start + chunkSize * 0.5) {
        end = boundary + 1;
      }
    }

    const chunk = text.substring(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = Math.min(end, start + chunkSize - overlap);

    // Prevent infinite loop
    if (start >= text.length) break;
  }

  return chunks;
};

/**
 * Generate embeddings for all chunks
 */
const generateEmbeddings = async (chunks) => {
  const embeddings = [];
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i], {
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: 768,
    });
    embeddings.push(embedding);
  }
  return embeddings;
};



const extractTextFromPDF = async (pdfBuffer) => {
  const parser = new PDFParse({ data: pdfBuffer });
  const result = await parser.getText();
  const rawText = result.text;
  return rawText.trim();
};


export const createDocumentFromUploadService = async ({ file, userId }) => {
  let documentId = null;
  const connection = await db.getConnection();

  try {
    // 1. Validate file
    if (!file) {
      throw new Error("No file provided");
    }

    if (file.mimetype !== "application/pdf") {
      throw new Error("Only PDF files are allowed");
    }

    // 2. Read file
    const fileBuffer = await fs.readFile(file.path);
    const fileSize = fileBuffer.length;

    // 3. Create initial document record with status 'pending'
    const [result] = await connection.execute(
      `INSERT INTO documents (user_id, title, mime_type, storage_path, byte_size, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
      [userId, file.originalname, file.mimetype, file.path, fileSize],
    );

    documentId = result.insertId;

    // 4. Get document and return immediately
    const [rows] = await connection.execute(
      `SELECT * FROM documents WHERE document_id = ?`,
      [documentId],
    );

    // 5. Start background processing (don't wait)
    setImmediate(() => {
      processDocumentInBackground(documentId, fileBuffer, file.path).catch((error) => {
        console.error(`Background processing failed for document ${documentId}:`, error);
      });
    });

    // 6. Return immediately with status='pending'
    return rows[0];

  } catch (error) {
    console.error("Error creating document:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// Background processing function
const processDocumentInBackground = async (documentId, fileBuffer, filePath) => {
  const connection = await db.getConnection();
  
  try {
    console.log(`Processing document ${documentId} in background...`);

    // 1. Parse PDF
    let pdfText;
    try {
      pdfText = await extractTextFromPDF(fileBuffer);
    } catch (error) {
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }

    // 2. Chunk text
    const chunks = chunkText(pdfText, 1000, 150);
    if (chunks.length === 0) {
      throw new Error("No text content extracted from PDF");
    }

    // 3. Generate embeddings
    let embeddings;
    try {
      embeddings = await generateEmbeddings(chunks);
    } catch (error) {
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }

    // 4. Store chunks and vectors
    try {
      await connection.beginTransaction();

      for (let i = 0; i < chunks.length; i++) {
        const [chunkResult] = await connection.execute(
          `INSERT INTO document_chunks (document_id, chunk_index, content, created_at) 
           VALUES (?, ?, ?, NOW())`,
          [documentId, i, chunks[i]],
        );

        const chunkId = chunkResult.insertId;

        await connection.execute(
          `INSERT INTO document_chunk_vectors (chunk_id, source_text, embedding, status, created_at, updated_at) 
           VALUES (?, ?, ?, 'ready', NOW(), NOW())`,
          [chunkId, chunks[i], JSON.stringify(embeddings[i])],
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw new Error(`Failed to store chunks and vectors: ${error.message}`);
    }

    // 5. Update status to 'ready'
    await connection.execute(
      `UPDATE documents SET status = 'ready', error_message = NULL, updated_at = NOW() 
       WHERE document_id = ?`,
      [documentId],
    );

    console.log(` Document ${documentId} processed successfully`);

  } catch (error) {
    console.error(` Error processing document ${documentId}:`, error);

    // Update status to 'failed'
    try {
      await connection.execute(
        `UPDATE documents SET status = 'failed', error_message = ?, updated_at = NOW() 
         WHERE document_id = ?`,
        [error.message, documentId],
      );
    } catch (updateError) {
      console.error("Error updating document status:", updateError);
    }
  } finally {
    connection.release();
  }
};


/**
 * Service to fetch metadata for a single RAG document.
 * Leverages the optimized assertOwnedDocument utility from above.
 */
export const getDocumentMetaService = async (documentId, userId) => {
  try {
    return await assertOwnedDocument(documentId, userId);
  } catch (error) {
    if (error.statusCode === 404) {
      throw new Error("DOCUMENT_NOT_FOUND");
    }
    throw error;
  }
};

/**
 * Retrieves document metadata and resolves the absolute file path.
 * @param {number} documentId
 * @param {number} userId
 * @returns {{ absolutePath, title, mimeType }}
 */
export const getDocumentFileService = async (documentId, userId) => {
  const { storage_path, title, mime_type } = await assertOwnedDocument(
    documentId,
    userId,
  );

  return {
    absolutePath: resolveStoragePath(storage_path),
    title,
    mimeType: mime_type,
  };
};

/**
 * Fetch all documents belonging to a user, newest first.
 * @param {number} userId
 * @returns {Promise<Array>}
 */
export const listDocumentsForUserService = async (userId) => {
  const rows = await safeExecute(
    `SELECT document_id, title, mime_type, byte_size, status, error_message, created_at, updated_at
     FROM documents
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId],
  );

  return rows.map((row) => ({
    documentId: row.document_id,
    title: row.title,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};



const SEARCH_SIMILARITY_THRESHOLD =
  Number(process.env.RAG_SEARCH_THRESHOLD) || 0.5;
const SEARCH_DEFAULT_K = Number(process.env.RAG_SEARCH_K) || 5;
export const searchInDocumentService = async ({
  documentId,
  userId,
  query,
  k,
  threshold,
}) => {
  // 1. Ownership + readiness
  const document = await assertOwnedDocument(documentId, userId);
  if (document.status !== "ready") {
    const err = new Error(
      `Document is not ready for search (status: ${document.status})`,
    );
    err.statusCode = 409;
    throw err;
  }

  // 2. Embed the search query — RETRIEVAL_QUERY, not RETRIEVAL_DOCUMENT,
  //    since this text is a question/topic, not a chunk being indexed
  const queryEmbedding = await generateEmbedding(query, {
    taskType: "RETRIEVAL_QUERY",
    outputDimensionality: 768,
  });

  // 3. Fetch every ready chunk + its vector + its text in one query.
  //    Joining content in here (rather than a separate "hydrate" query
  //    afterward) is a deliberate simplification: a single PDF has at
  //    most a few hundred chunks, so pulling all their text up front is
  //    cheaper than a second round trip for just the top k.
  const rows = await safeExecute(
    `SELECT dc.chunk_id, dc.chunk_index, dc.content, dcv.embedding
     FROM document_chunk_vectors dcv
     JOIN document_chunks dc ON dc.chunk_id = dcv.chunk_id
     WHERE dc.document_id = ? AND dcv.status = 'ready'`,
    [documentId],
  );

  // 4 & 5. Score every chunk, filter by threshold, sort, take top k
  const effectiveK = k ?? SEARCH_DEFAULT_K;
  const effectiveThreshold = threshold ?? SEARCH_SIMILARITY_THRESHOLD;

  const results = rows
    .map((row) => {
      const embedding =
        typeof row.embedding === "string"
          ? JSON.parse(row.embedding)
          : row.embedding;
      return {
        chunkId: row.chunk_id,
        chunkIndex: row.chunk_index,
        score: calculateCosineSimilarity(queryEmbedding, embedding),
        excerpt: row.content,
      };
    })
    .filter((r) => r.score >= effectiveThreshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, effectiveK);

  return { query, results };
};

export const deleteDocumentService = async (documentId, userId) => {
  const document = await assertOwnedDocument(documentId, userId);


// Delete physical file from disk
const absolutePath = resolveStoragePath(document.storage_path);
try {
  await fs.unlink(absolutePath);
} catch (err) {
  console.warn(`Could not delete file: ${err.message}`);
}

  await safeExecute(
    `
      DELETE FROM documents
      WHERE document_id = ? AND user_id = ?
    `,
    [documentId, userId],
  );

  return document;
};

/**
 * Service to retrieving relevant text chunks from a document and generating a grounded AI response with associated context citations.
 *
 * @param {Object} params - The service parameter object.
 * @param {string|number} params.documentId - The unique identifier of the document being queried.
 * @param {string|number} params.userId - The unique identifier of the user executing the query.
 * @param {string} params.query - The user's natural language question.
 * @throws {Error} If no text chunks match the query criteria (attaches a 404 statusCode).
 * @returns {Promise<Object>} An object containing the generated answer, citations array, and an array of chunk IDs used.
 */
export const queryDocumentService = async ({ documentId, userId, query }) => {
  try {
    const searchResponse = await searchInDocumentService({
      documentId,
      userId,
      query,
      k: 5,
    });
    const matchedChunks = searchResponse?.results || [];
    if (matchedChunks.length === 0) {
      const error = new Error(
        "No relevant document content found for this query based on threshold criteria.",
      );
      error.statusCode = 404;
      throw error;
    }
    const contextText = matchedChunks
      .map((chunk) => `[Chunk #${chunk.chunkIndex}]: ${chunk.excerpt || ""}`)
      .join("\n\n");
    const aiResponse = await answerFromRagChunksService(query, contextText);
    //Define fallback/low-confidence keywords or exact phrases
    const lowerResponse = aiResponse.toLowerCase();
    const isNotFound =
      lowerResponse.includes("does not cover") ||
      lowerResponse.includes("cannot find") ||
      lowerResponse.includes("no information");
    //Conditionally populate citations and chunksUsed
    const citations = isNotFound
      ? []
      : matchedChunks.map((chunk, index) => ({
          ref: index + 1,
          chunkIndex: chunk.chunkIndex,
        }));
    const chunksUsed = isNotFound
      ? []
      : matchedChunks.map((chunk) => chunk.chunkId);
    return {
      answer: aiResponse,
      citations,
      chunksUsed,
    };
  } catch (error) {
    throw error;
  }
};
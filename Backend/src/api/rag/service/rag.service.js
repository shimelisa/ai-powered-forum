import fs from "fs/promises";
import path from "path";
import PDFParser from "pdf2json";
import { generateEmbedding } from "./gemini.service.js";
import { db, safeExecute } from "../../../../db/config.js";

// ============================================================
// Helper Functions
// ============================================================

const safeDecodeURIComponent = (str) => {
  try {
    return decodeURIComponent(str);
  } catch (error) {
    return str;
  }
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

/**
 * Extract text from PDF using pdf2json
 */
const extractTextFromPDF = (pdfBuffer) => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData) => {
      reject(new Error(`PDF parsing error: ${errData.parserError}`));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      try {
        let fullText = "";
        if (pdfData && pdfData.Pages) {
          for (const page of pdfData.Pages) {
            if (page.Texts) {
              for (const text of page.Texts) {
                if (text.R) {
                  for (const line of text.R) {
                    if (line.T) {
                      fullText += safeDecodeURIComponent(line.T) + " ";
                    }
                  }
                }
              }
              fullText += "\n";
            }
          }
        }
        resolve(fullText.trim());
      } catch (error) {
        reject(new Error(`Failed to extract text: ${error.message}`));
      }
    });

    pdfParser.parseBuffer(pdfBuffer);
  });
};

// ============================================================
// Main Service: Create Document from Upload
// ============================================================

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
    console.log(`📄 Document ${documentId} created with status 'pending'`);

    // 4. Parse PDF using pdf2json
    let pdfText;
    try {
      pdfText = await extractTextFromPDF(fileBuffer);
      console.log(`📄 PDF parsed: ${pdfText.length} characters`);
    } catch (error) {
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }

    // 5. Chunk text
    const chunks = chunkText(pdfText, 1000, 150);
    console.log(`📄 Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      throw new Error("No text content extracted from PDF");
    }

    // 6. Generate embeddings using Gemini service
    let embeddings;
    try {
      embeddings = await generateEmbeddings(chunks);
      console.log(`📄 Generated ${embeddings.length} embeddings`);
    } catch (error) {
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }

    // 7. Store chunks and vectors in database
    try {
      // Start transaction
      await connection.beginTransaction();

      // Insert chunks and vectors
      for (let i = 0; i < chunks.length; i++) {
        // Insert chunk
        const [chunkResult] = await connection.execute(
          `INSERT INTO document_chunks (document_id, chunk_index, content, created_at) 
           VALUES (?, ?, ?, NOW())`,
          [documentId, i, chunks[i]],
        );

        const chunkId = chunkResult.insertId;

        // Insert vector
        await connection.execute(
          `INSERT INTO document_chunk_vectors (chunk_id, source_text, embedding, status, created_at, updated_at) 
           VALUES (?, ?, ?, 'ready', NOW(), NOW())`,
          [chunkId, chunks[i], JSON.stringify(embeddings[i])],
        );
      }

      // Commit transaction
      await connection.commit();
      console.log(`📄 Stored ${chunks.length} chunks and vectors in database`);
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      throw new Error(`Failed to store chunks and vectors: ${error.message}`);
    }

    // 8. Update document status to 'ready'
    await connection.execute(
      `UPDATE documents SET status = 'ready', error_message = NULL, updated_at = NOW() 
       WHERE document_id = ?`,
      [documentId],
    );

    console.log(`📄 Document ${documentId} processing complete. Status: ready`);

    // Get the updated document
    const [rows] = await connection.execute(
      `SELECT * FROM documents WHERE document_id = ?`,
      [documentId],
    );

    return rows[0];
  } catch (error) {
    console.error("❌ Error processing document:", error);

    // Update document status to 'failed' if document was created
    if (documentId) {
      try {
        await connection.execute(
          `UPDATE documents SET status = 'failed', error_message = ?, updated_at = NOW() 
           WHERE document_id = ?`,
          [error.message, documentId],
        );
        console.log(`📄 Document ${documentId} status updated to 'failed'`);
      } catch (updateError) {
        console.error("❌ Error updating document status:", updateError);
      }
    }

    throw error;
  } finally {
    connection.release();
  }
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


//AI Query Grounded in RAG system document service----ed
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

  const prompt = `You are an assistant that answers questions strictly based on provided document excerpts.
If the answer is not in the excerpts, say "This document does not cover that topic."

Document excerpts:
${context}

Question: ${query}

Answer (cite excerpt numbers like [1], [2] where relevant):`;

  const result = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
  });
  const answer = result.text;

  return {
    answer,
    citations: results.map((r, i) => ({
      ref: i + 1,
      chunkIndex: r.chunkIndex,
    })),
    chunksUsed: results.map((r) => r.chunkId),
  };
};
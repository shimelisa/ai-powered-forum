// api/rag/service/vector.service.js


/**
 * Calculate cosine similarity between two embedding vectors.
 * Formula: cos(θ) = (A · B) / (||A|| × ||B||)
 *
 * @param {number[]} vectorA - First embedding vector (e.g. the search query's embedding).
 * @param {number[]} vectorB - Second embedding vector (e.g. a stored chunk's embedding).
 * @returns {number} Similarity score. Typically 0 to 1 for embeddings, where
 *   1 means identical direction (most similar) and 0 means unrelated.
 * @throws {Error} If either input isn't an array, or the two vectors differ in length.
 */
export function calculateCosineSimilarity(vectorA, vectorB) {
  if (!Array.isArray(vectorA) || !Array.isArray(vectorB)) {
    throw new Error("Both vectors must be arrays");
  }

  if (vectorA.length !== vectorB.length) {
    throw new Error(
      `Vectors must have the same length. Got ${vectorA.length} and ${vectorB.length}`,
    );
  }

  if (vectorA.length === 0) {
    throw new Error("Vectors must not be empty");
  }

  // Single pass: accumulate the dot product and both magnitudes together,
  // rather than three separate loops over the same data.
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    const a = vectorA[i];
    const b = vectorB[i];
    dotProduct += a * b;
    magnitudeA += a * a;
    magnitudeB += b * b;
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  // A zero-magnitude vector (all zeros) has no defined direction —
  // treat it as having no similarity to anything rather than dividing by zero.
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Safely parse a stored embedding value into a plain number array.
 * The database driver sometimes returns the JSON column already parsed,
 * sometimes as a raw string, depending on the column type and driver
 * version — this normalizes either case to a consistent array.
 *
 * @param {string|number[]} rawEmbedding - The value read from the
 *   document_chunk_vectors.embedding column.
 * @returns {number[]}
 * @throws {Error} If the value can't be parsed into a valid number array.
 */
export function parseStoredEmbedding(rawEmbedding) {
  const parsed =
    typeof rawEmbedding === "string" ? JSON.parse(rawEmbedding) : rawEmbedding;

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Stored embedding is not a valid, non-empty array");
  }

  return parsed;
}

/**
 * Score, filter, and rank a list of candidate chunks against a single
 * query embedding. Pulled out of searchInDocumentService so the scoring
 * logic itself can be unit-tested independently of the database and the
 * Gemini API.
 *
 * @param {Object} params
 * @param {number[]} params.queryEmbedding - The embedded search query.
 * @param {Array<{chunkId:number, chunkIndex:number, content:string, embedding:string|number[]}>} params.candidates
 *   Raw rows fetched from the database — embedding may be a JSON string or an already-parsed array.
 * @param {number} params.threshold - Minimum similarity score to keep a result.
 * @param {number} params.k - Maximum number of results to return.
 * @returns {Array<{chunkId:number, chunkIndex:number, score:number, excerpt:string}>}
 *   Sorted highest score first, capped at k entries.
 */
export function rankChunksByQuery({
  queryEmbedding,
  candidates,
  threshold,
  k,
}) {
  return candidates
    .map((row) => ({
      chunkId: row.chunkId,
      chunkIndex: row.chunkIndex,
      score: calculateCosineSimilarity(
        queryEmbedding,
        parseStoredEmbedding(row.embedding),
      ),
      excerpt: row.content,
    }))
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

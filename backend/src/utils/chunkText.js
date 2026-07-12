// src/utils/chunkText.js

export const chunkText = (text, chunkSize = 500, overlap = 75) => {
  // Validate inputs
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Ensure chunkSize is valid
  if (chunkSize < 100) {
    chunkSize = 500;
  }

  // Ensure overlap is less than chunkSize
  if (overlap >= chunkSize) {
    overlap = Math.floor(chunkSize / 3);
  }

  // Clean up text
  const cleanText = text
    .replace(/\s+/g, ' ')
    .trim();
  
  if (cleanText.length === 0) {
    return [];
  }

  // Limit text size to prevent memory issues
  const MAX_TEXT_LENGTH = 200000;
  const processedText = cleanText.length > MAX_TEXT_LENGTH 
    ? cleanText.substring(0, MAX_TEXT_LENGTH) 
    : cleanText;

  const chunks = [];
  let start = 0;

  // Safety counter to prevent infinite loops
  let maxIterations = 10000;
  let iterations = 0;

  while (start < processedText.length && iterations < maxIterations) {
    iterations++;
    
    let end = Math.min(start + chunkSize, processedText.length);
    
    // Try to break at a sentence boundary for better chunks
    if (end < processedText.length) {
      // Look for good break points within the last 30% of the chunk
      const searchStart = Math.max(start, end - Math.floor(chunkSize * 0.3));
      const searchText = processedText.substring(searchStart, end);
      
      const lastPeriod = searchText.lastIndexOf('.');
      const lastNewline = searchText.lastIndexOf('\n');
      const lastSpace = searchText.lastIndexOf(' ');
      
      let breakPoint = -1;
      
      // Prefer period > newline > space
      if (lastPeriod > 0) {
        breakPoint = searchStart + lastPeriod + 1;
      } else if (lastNewline > 0) {
        breakPoint = searchStart + lastNewline + 1;
      } else if (lastSpace > 0) {
        breakPoint = searchStart + lastSpace + 1;
      }
      
      if (breakPoint > start && breakPoint < end) {
        end = breakPoint;
      }
    }
    
    // Ensure we're making progress
    if (end <= start) {
      // If no progress, force end to be at least start + 1
      end = Math.min(start + 1, processedText.length);
    }
    
    const chunk = processedText.slice(start, end).trim();
    
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    // Move start position, but ensure we're making progress
    start = end - overlap;
    
    // If overlap causes us to go backwards, move forward
    if (start < end - 1) {
      start = end - 1;
    }
    
    // If start hasn't advanced, force it
    if (start <= end - 1) {
      start = end;
    }
    
    // Safety check: if start reaches or exceeds processedText.length, break
    if (start >= processedText.length) break;
    if (start < 0) start = end;
  }

  // If no chunks were created, try with a smaller chunk size
  if (chunks.length === 0 && chunkSize > 100) {   
    return chunkText(text, Math.floor(chunkSize / 2), Math.floor(overlap / 2));
  }

  return chunks;
};
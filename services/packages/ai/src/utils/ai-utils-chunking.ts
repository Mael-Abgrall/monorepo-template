/**
 * Splits a document into chunks.
 * @param params - The parameters object
 * @param params.document - The text document to chunk
 * @param params.maxChunkSize - Maximum size of each chunk in characters (default: 512)
 * @param params.overlapSize - Number of characters to overlap between chunks (default: 50)
 * @returns Array of text chunks
 */
export async function chunkDocument({
  document,
  maxChunkSize = 512,
  overlapSize = 50,
}: {
  document: string;
  maxChunkSize?: number;
  overlapSize?: number;
}): Promise<string[]> {
  // Return empty array for empty documents
  if (!document || document.trim().length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let currentPosition = 0;

  while (currentPosition < document.length) {
    // Calculate end position for current chunk
    const endPosition = Math.min(
      currentPosition + maxChunkSize,
      document.length,
    );

    // Extract the chunk
    const chunk = document.slice(currentPosition, endPosition);

    // Add chunk if it's not empty
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }

    // Move position for next chunk, accounting for overlap
    currentPosition = endPosition - overlapSize;

    // Ensure we make progress even with large overlap
    if (
      currentPosition <= 0 ||
      currentPosition >= document.length ||
      endPosition === document.length
    ) {
      break;
    }
  }

  return chunks;
}

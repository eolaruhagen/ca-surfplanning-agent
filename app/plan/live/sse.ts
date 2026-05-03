export type ParsedSseChunk = {
  messages: string[];
  rest: string;
};

/**
 * Parse SSE text into discrete data payloads.
 * Keeps any trailing partial event in `rest` for the next chunk.
 */
export function parseSseChunk(buffer: string): ParsedSseChunk {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  const messages: string[] = [];

  for (const part of parts) {
    const lines = part.split("\n");
    const dataLines = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.replace(/^data:\s?/, ""));
    if (dataLines.length > 0) {
      messages.push(dataLines.join("\n"));
    }
  }

  return { messages, rest };
}

export type SseTokenEvent = { type: "token"; content: string };
export type SseDoneEvent = { type: "done" };
export type SseErrorEvent = { type: "error"; message: string };
export type SseEvent = SseTokenEvent | SseDoneEvent | SseErrorEvent;

function parseSseBlock(block: string): SseEvent | null {
  const dataLine = block.split("\n").find((line) => line.startsWith("data:"));
  if (!dataLine) return null;

  const payload = dataLine.replace(/^data:\s?/, "").trim();
  if (!payload) return null;

  return JSON.parse(payload) as SseEvent;
}

export async function readSseStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: SseEvent) => void
) {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const event = parseSseBlock(block);
      if (event) onEvent(event);

      boundary = buffer.indexOf("\n\n");
    }
  }

  if (buffer.trim()) {
    const event = parseSseBlock(buffer);
    if (event) onEvent(event);
  }
}

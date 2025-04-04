import { apiFetch } from './app-helpers-fetch';

/**
 * Helper for streaming SSE responses
 * @param root named parameters
 * @param root.body body of the request if this is a POST request
 * @param root.method method of the request
 * @param root.signal signal of the request
 * @param root.url url of the request
 * @yields
 */
export async function* sseStream<T>({
  body = undefined,
  method = 'GET',
  signal,
  url,
}: {
  body?: { [key: string]: unknown };
  method?: 'GET' | 'POST';
  signal: AbortSignal;
  url: string;
}): AsyncGenerator<T> {
  const response = await apiFetch(url, {
    body,
    method,
    responseType: 'stream',
    signal,
  });

  const decoder = new TextDecoder();
  let partialDataBuffer = '';

  // Important note on the "as unknown as AsyncIterable<Uint8Array>". This is needed to prevent a TS/ESlint error, although the code seems valid
  for await (const chunk of response as unknown as AsyncIterable<Uint8Array>) {
    partialDataBuffer += decoder.decode(chunk, { stream: true });

    const events = partialDataBuffer.split('\n\n');
    // keep incomplete events in the buffer
    partialDataBuffer = events.pop() ?? '';

    for (const event of events) {
      if (!event.trim() || event.length === 0) continue;

      const lines = event.split('\n');
      const output = linesToObject({ lines });

      // Only yield if we have something to yield
      if (Object.keys(output).length > 0) {
        yield output as T;
      }
    }
  }

  // Process remaining data in the buffer
  if (partialDataBuffer.trim()) {
    const lines = partialDataBuffer.split('\n');
    const output = linesToObject({ lines });
    if (Object.keys(output).length > 0) {
      yield output as T;
    }
  }
}

/**
 * convert a list of lines into a message object
 * @param root named parameters
 * @param root.lines the lines from the SSE
 * @returns the message parsed as an object
 */
function linesToObject({ lines }: { lines: string[] }): {
  [key: string]: unknown;
} {
  const output: { [key: string]: unknown } = {};

  for (const line of lines) {
    if (line.startsWith('data:')) {
      const asString = line.replace('data:', '').trim();
      output.data = softParse({ string: asString });
    }
    if (line.startsWith('event:')) {
      output.event = line.replace('event:', '').trim();
    }
    if (line.startsWith('id:')) {
      output.id = line.replace('id:', '').trim();
    }
  }

  return output;
}

/**
 * Attempt to parse a string to a JSON object, return the original string on failure
 * @param root named parameters
 * @param root.string string to parse
 * @returns parsed string or original string if it is not valid JSON
 */
function softParse({ string }: { string: string }): unknown {
  try {
    return JSON.parse(string);
  } catch {
    return string;
  }
}

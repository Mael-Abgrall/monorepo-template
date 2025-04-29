import { describe, expect, it } from 'vitest';
import { chunkDocument } from '../../ai-utils-chunking';

const lorem = `
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
`;

describe('chunkDocument', () => {
  it('should return an empty array for empty documents', async () => {
    const result = await chunkDocument({ document: '' });
    expect(result).toEqual([]);

    const resultWithWhitespace = await chunkDocument({ document: '   ' });
    expect(resultWithWhitespace).toEqual([]);
  });

  it('should return a single chunk for documents smaller than maxChunkSize', async () => {
    const document = 'This is a small document that should fit in one chunk.';
    const result = await chunkDocument({ document, maxChunkSize: 100 });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(document);
  });

  it('should split documents larger than maxChunkSize into multiple chunks', async () => {
    const document = lorem;
    const maxChunkSize = 30;
    const overlapSize = 10;

    const result = await chunkDocument({
      document,
      maxChunkSize,
      overlapSize,
    });

    expect(result.length).toBeGreaterThan(1);

    // Check that all chunks have the expected content
    expect(result[0]).toEqual(lorem.slice(0, maxChunkSize));

    // Check that chunks have proper overlap
    expect(result[0].slice(0, overlapSize)).toEqual(
      lorem.slice(0, overlapSize),
    );
    expect(result[1].slice(0, overlapSize)).toEqual(
      result[0].slice(-overlapSize),
    );

    // Check that the total content is preserved
    const combinedLength = result.reduce((sum: number, chunk: string) => {
      return sum + chunk.length;
    }, 0);
    expect(combinedLength).toBeGreaterThanOrEqual(document.length);
  });

  it.skipIf(process.env.DEBUG !== 'true')(
    'should be fast',
    async () => {
      const times: number[] = [];
      let total = 0;
      for (let index = 0; index < 50_000; index++) {
        const start = Date.now();
        const document = 'A'.repeat(1_000_000);
        const maxChunkSize = 300;
        const overlapSize = 50;

        await chunkDocument({
          document,
          maxChunkSize,
          overlapSize,
        });

        const elapsed = Date.now() - start;

        times.push(elapsed);
        total += elapsed;
      }

      const p75 = times.toSorted((a, b) => {
        return a - b;
      })[Math.floor(times.length * 0.75)];
      const p99 = times.toSorted((a, b) => {
        return a - b;
      })[Math.floor(times.length * 0.99)];

      expect(total / times.length).toBeLessThan(1); // 1ms
      expect(p75).toBeLessThan(5); // 5ms
      expect(p99).toBeLessThan(10); // 10ms
    },
    120_000,
  );
});

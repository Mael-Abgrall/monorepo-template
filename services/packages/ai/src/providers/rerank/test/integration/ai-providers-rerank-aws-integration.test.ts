import type { Environment } from 'service-utils/environment';
import { analytics } from 'service-utils/analytics';
import { setEnvironment } from 'service-utils/environment';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { SearchResultChunks } from '../../chunk';
import { rerankCohere } from '../../ai-provider-rerank-aws';

vi.mock('service-utils/analytics', () => {
  return {
    analytics: {
      capture: vi.fn(),
      captureException: vi.fn(),
    },
  };
});

beforeAll(() => {
  setEnvironment({ env: process.env as unknown as Environment });
});

const keywordResults: SearchResultChunks = [
  {
    chunkContent:
      'TypeScript is a strongly typed programming language that builds on JavaScript.',
    chunkID: 'k1',
    documentID: 'doc1',
    score: 0.9,
  },
  {
    chunkContent:
      'Python is a high-level, general-purpose programming language.',
    chunkID: 'k2',
    documentID: 'doc2',
    score: 0.7,
  },
  {
    chunkContent: 'React is a JavaScript library for building user interfaces.',
    chunkID: 'k3',
    documentID: 'doc3',
    score: 0.5,
  },
];

const vectorResults: SearchResultChunks = [
  {
    chunkContent:
      'JavaScript is a programming language that is one of the core technologies of the World Wide Web.',
    chunkID: 'v1',
    documentID: 'doc4',
    score: 0.85,
  },
  {
    chunkContent:
      'TypeScript adds optional static typing to JavaScript and is designed for large-scale applications.',
    chunkID: 'v2',
    documentID: 'doc5',
    score: 0.75,
  },
  {
    chunkContent:
      'Node.js is an open-source, cross-platform JavaScript runtime environment.',
    chunkID: 'v3',
    documentID: 'doc6',
    score: 0.65,
  },
];

describe.skipIf(!process.env.TEST_API)('rerankCohere integration', () => {
  it('should rerank results for a TypeScript query', async () => {
    const query = 'What is TypeScript?';
    const traceID = 'integration-test-trace-id';
    const userID = 'integration-test-user-id';
    const maxResults = 10;

    const results = await rerankCohere({
      keywordResults,
      maxResults,
      query,
      traceID,
      userID,
      vectorResults,
    });

    console.log(results);

    // Check that we got the expected number of results
    expect(results.length).toBeLessThanOrEqual(maxResults);

    // TypeScript related documents should be ranked higher
    const typeScriptResults = results.filter((result) => {
      return result.chunkContent.toLowerCase().includes('typescript');
    });

    // Verify we have TypeScript results and they're ranked properly
    expect(typeScriptResults.length).toBeGreaterThan(0);

    // The first result should be about TypeScript given our query
    expect(results[0].chunkContent.toLowerCase()).toContain('typescript');

    // All results should have a score
    for (const result of results) {
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
    }

    expect(analytics.capture).toHaveBeenCalledTimes(1);
  });
});

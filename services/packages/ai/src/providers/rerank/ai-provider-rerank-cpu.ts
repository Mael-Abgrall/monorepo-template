import { analytics } from 'service-utils/analytics';
import type { SearchResultChunks } from './chunk';

/**
 * Re-rank the results using RRF
 * @param root named parameters
 * @param root.keywordResults the results from the keyword search
 * @param root.maxResults the maximum number of results to return
 * @param root.traceID the trace ID
 * @param root.userID the ID of the user
 * @param root.vectorResults the results from the vector search
 * @returns a re-ranked list of results
 */
export async function rerankRRF({
  keywordResults,
  maxResults,
  traceID,
  userID,
  vectorResults,
}: {
  keywordResults: SearchResultChunks;
  maxResults: number;
  traceID: string;
  userID: string;
  vectorResults: SearchResultChunks;
}): Promise<SearchResultChunks> {
  if (keywordResults.length === 0 && vectorResults.length === 0)
    throw new Error('No results to rerank');
  if (vectorResults.length === 0) {
    return keywordResults;
  }
  if (keywordResults.length === 0) {
    return vectorResults;
  }

  const rerankStart = Date.now();

  //filtering low score value, 0.3 is suggested for vector search without HyDE logic
  const filteredVectorResults = vectorResults.filter((vectorResult) => {
    return vectorResult.score >= 0.1;
  });
  const vectorRRFPromise = filteredVectorResults.map(
    async (result, position) => {
      return {
        ...result,
        score: await calculateRRF({ searchRank: position, searchWeight: 0.6 }),
      };
    },
  );
  const keywordScores = keywordResults.map((keywordResult) => {
    return keywordResult.score;
  });

  //Normalizing the keywordScore and filtering scores below 0.3
  const keywordMinScore = Math.min(...keywordScores);
  const keywordMaxScore = Math.max(...keywordScores);
  const normalizedKeywordResults = keywordResults
    .filter((keywordResult) => {
      return keywordResult.score > 0;
    })
    .map((keywordResult) => {
      return {
        ...keywordResult,
        score:
          (keywordResult.score - keywordMinScore) /
          (keywordMaxScore - keywordMinScore),
      };
    })
    .filter((result) => {
      return result.score >= 0.3;
    });
  const keywordRRFPromise = normalizedKeywordResults.map(
    async (result, position) => {
      return {
        ...result,
        score: await calculateRRF({
          searchRank: position,
          searchWeight: 0.4,
        }),
      };
    },
  );
  const vectorRRF = await Promise.all(vectorRRFPromise);
  const keywordRRF = await Promise.all(keywordRRFPromise);

  const results = await Promise.all(
    vectorRRF.map(async (result) => {
      const keywordDocument = keywordRRF.find((document) => {
        return document.documentID === result.documentID;
      });
      return {
        ...result,
        score: keywordDocument?.score
          ? result.score + keywordDocument.score
          : result.score,
      };
    }),
  );

  // find any document from keyword search missing from the vector search
  const additionalKeywordResults = keywordRRF.filter((keywordDocument) => {
    return !results.some((result) => {
      return result.documentID === keywordDocument.documentID;
    });
  });
  if (additionalKeywordResults.length > 0) {
    results.push(...additionalKeywordResults);
  }

  results.sort((a, b) => {
    return b.score - a.score;
  });

  const rerankEnd = Date.now();
  analytics.capture({
    distinctId: userID,
    event: '$ai_span',
    properties: {
      $ai_latency: (rerankEnd - rerankStart) / 1000, // in seconds
      $ai_model: 'rrf',
      $ai_span_name: 'rerank',
      $ai_trace_id: traceID,
    },
  });
  return results.slice(0, maxResults);
}

/**
 * Calculate the RRF score
 * @param root named params
 * @param root.searchRank  number represents rank of the search result
 * @param root.searchWeight weight to search method reduce emphasis on the position.
 * @param root.smoothingConstant smoothing constant for re-ranking, usually 60
 * @returns a number representing rrf score
 */
async function calculateRRF({
  searchRank,
  searchWeight = 1,
  smoothingConstant = 60,
}: {
  searchRank: number;
  searchWeight?: number;
  smoothingConstant?: number;
}): Promise<number> {
  return searchWeight / (smoothingConstant + (searchRank + 1));
}

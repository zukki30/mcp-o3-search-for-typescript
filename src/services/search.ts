import type {
  SearchParams,
  SearchResult,
  ChatGPTSearchQuery,
  ChatGPTSearchResponse,
} from '../types/index.js';
import { createOpenAIClient } from '../utils/client.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('SearchService');

function buildSearchQuery(params: SearchParams): ChatGPTSearchQuery {
  return {
    query: params.query,
    filters: {
      language: params.language || 'auto',
      timeframe: params.timeframe,
    },
    maxResults: params.limit || 10,
  };
}

function transformResults(response: ChatGPTSearchResponse, limit?: number): SearchResult[] {
  if (!response.results || response.results.length === 0) {
    return [];
  }

  const results: SearchResult[] = response.results.map((item) => ({
    title: item.title || 'タイトルなし',
    url: item.url,
    snippet: item.description || '',
    publishedDate: item.date,
    relevanceScore: item.score,
  }));

  return limit ? results.slice(0, limit) : results;
}

export async function executeSearch(params: SearchParams): Promise<SearchResult[]> {
  logger.info('Executing search', {
    query: params.query,
    limit: params.limit,
    language: params.language,
    timeframe: params.timeframe,
  });

  try {
    // 検索クエリの構築
    const searchQuery = buildSearchQuery(params);
    logger.debug('Built search query', { searchQuery });

    // OpenAI クライアントを作成
    const client = createOpenAIClient();

    // ChatGPT o3 APIの呼び出し
    const response = await client.search(searchQuery);
    logger.debug('Received API response', { resultCount: response.results?.length || 0 });

    // 結果の変換
    const results = transformResults(response, params.limit);

    logger.info('Search completed successfully', {
      query: params.query,
      resultCount: results.length,
      totalCount: response.totalCount,
    });

    return results;
  } catch (error) {
    logger.error('Search execution failed', error);
    throw error;
  }
}

export async function searchWithRetry(
  params: SearchParams,
  maxRetries = 3,
): Promise<SearchResult[]> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Search attempt ${attempt}/${maxRetries}`, { query: params.query });
      return await executeSearch(params);
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Search attempt ${attempt} failed`, {
        error: lastError.message,
        attempt,
        maxRetries,
      });

      if (attempt < maxRetries) {
        // 指数バックオフ
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        logger.debug(`Retrying in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error('All search attempts failed', {
    maxRetries,
    finalError: lastError!.message,
  });
  throw lastError!;
}

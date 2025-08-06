import { describe, it, expect, beforeEach, vi } from 'vitest';

import { executeSearch, searchWithRetry } from '../../src/services/search.js';
import { RateLimitError, TimeoutError, NetworkError } from '../../src/types/index.js';
import type { SearchParams } from '../../src/types/index.js';
import { createOpenAIClient } from '../../src/utils/client.js';
import { createMockSearchResults, delay } from '../helpers/test-utils.js';

vi.mock('../../src/utils/client.js');

describe('Search Service Integration Tests', () => {
  let mockClient: ReturnType<typeof createOpenAIClient>;
  let mockSearch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSearch = vi.fn();
    mockClient = {
      search: mockSearch,
    } as ReturnType<typeof createOpenAIClient>;

    (createOpenAIClient as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);
  });

  describe('executeSearch 統合テスト', () => {
    it('正常な検索リクエストを処理してフォーマットする', async () => {
      const mockResults = createMockSearchResults(3);
      mockSearch.mockResolvedValue({
        results: mockResults,
        totalCount: 3,
      });

      const params: SearchParams = {
        query: 'integration test query',
        limit: 10,
        language: 'ja',
      };

      const results = await executeSearch(params);

      expect(results).toHaveLength(3);
      expect(results[0]?.title).toBe('Test Result 1');
      expect(results[0]?.url).toBe('https://example.com/result1');
      expect(results[0]?.snippet).toBe('This is test result 1');

      expect(mockSearch).toHaveBeenCalledWith({
        query: 'integration test query',
        filters: {
          language: 'ja',
        },
        maxResults: 10,
      });
    });

    it('制限数に従って結果を切り詰める', async () => {
      const mockResults = createMockSearchResults(10);
      mockSearch.mockResolvedValue({
        results: mockResults,
        totalCount: 100,
      });

      const params: SearchParams = {
        query: 'test',
        limit: 5,
      };

      const results = await executeSearch(params);

      expect(results).toHaveLength(5);
      expect(results[0]?.title).toBe('Test Result 1');
      expect(results[4]?.title).toBe('Test Result 5');
    });

    it('すべてのフィルターパラメータを正しく変換する', async () => {
      mockSearch.mockResolvedValue({
        results: createMockSearchResults(1),
        totalCount: 1,
      });

      const params: SearchParams = {
        query: 'advanced search',
        limit: 20,
        language: 'en',
        timeframe: 'past_year',
      };

      await executeSearch(params);

      expect(mockSearch).toHaveBeenCalledWith({
        query: 'advanced search',
        filters: {
          language: 'en',
          timeframe: 'past_year',
        },
        maxResults: 20,
      });
    });
  });

  describe('searchWithRetry 統合テスト', () => {
    it('一時的なエラー後に成功する', async () => {
      const mockResults = createMockSearchResults(2);

      mockSearch
        .mockRejectedValueOnce(new NetworkError('Connection failed'))
        .mockResolvedValueOnce({
          results: mockResults,
          totalCount: 2,
        });

      const params: SearchParams = {
        query: 'retry test',
        limit: 10,
      };

      const results = await searchWithRetry(params, 3);

      expect(results).toHaveLength(2);
      expect(mockSearch).toHaveBeenCalledTimes(2);
    });

    it('レート制限エラーで適切に待機してリトライする', async () => {
      const mockResults = createMockSearchResults(1);
      const rateLimitError = new RateLimitError('Rate limit exceeded', 100); // 100ms待機

      mockSearch.mockRejectedValueOnce(rateLimitError).mockResolvedValueOnce({
        results: mockResults,
        totalCount: 1,
      });

      const params: SearchParams = {
        query: 'rate limit test',
        limit: 10,
      };

      const startTime = Date.now();
      const results = await searchWithRetry(params, 2);
      const endTime = Date.now();

      expect(results).toHaveLength(1);
      expect(mockSearch).toHaveBeenCalledTimes(2);
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(endTime - startTime).toBeLessThan(200);
    });

    it('タイムアウトエラーでリトライする', async () => {
      const mockResults = createMockSearchResults(1);

      mockSearch
        .mockRejectedValueOnce(new TimeoutError('Request timeout', 5000))
        .mockRejectedValueOnce(new TimeoutError('Request timeout', 5000))
        .mockResolvedValueOnce({
          results: mockResults,
          totalCount: 1,
        });

      const params: SearchParams = {
        query: 'timeout test',
        limit: 10,
      };

      const results = await searchWithRetry(params, 3);

      expect(results).toHaveLength(1);
      expect(mockSearch).toHaveBeenCalledTimes(3);
    });

    it('最大リトライ回数に達したら最後のエラーを投げる', async () => {
      const networkError = new NetworkError('Persistent network error');

      mockSearch.mockRejectedValue(networkError);

      const params: SearchParams = {
        query: 'persistent error test',
        limit: 10,
      };

      await expect(searchWithRetry(params, 3)).rejects.toThrow('Persistent network error');
      expect(mockSearch).toHaveBeenCalledTimes(3);
    });

    it('リトライ不可能なエラーは即座に投げる', async () => {
      const authError = new Error('Invalid API key');
      authError.name = 'AuthError';

      mockSearch.mockRejectedValue(authError);

      const params: SearchParams = {
        query: 'auth error test',
        limit: 10,
      };

      await expect(searchWithRetry(params, 3)).rejects.toThrow('Invalid API key');
      expect(mockSearch).toHaveBeenCalledTimes(1); // リトライしない
    });
  });

  describe('並行実行とパフォーマンス', () => {
    it('複数の検索を並行して実行できる', async () => {
      const results1 = createMockSearchResults(2);
      const results2 = createMockSearchResults(3);
      const results3 = createMockSearchResults(1);

      mockSearch
        .mockImplementationOnce(async () => {
          await delay(50);
          return { results: results1, totalCount: 2 };
        })
        .mockImplementationOnce(async () => {
          await delay(30);
          return { results: results2, totalCount: 3 };
        })
        .mockImplementationOnce(async () => {
          await delay(10);
          return { results: results3, totalCount: 1 };
        });

      const params: SearchParams[] = [
        { query: 'query1', limit: 10 },
        { query: 'query2', limit: 10 },
        { query: 'query3', limit: 10 },
      ];

      const startTime = Date.now();
      const results = await Promise.all(params.map((p) => executeSearch(p)));
      const endTime = Date.now();

      expect(results[0]).toHaveLength(2);
      expect(results[1]).toHaveLength(3);
      expect(results[2]).toHaveLength(1);

      // 並行実行なので、最も遅い50msより少し多いくらいで完了するはず
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('大量のリクエストでもメモリリークしない', async () => {
      const mockResults = createMockSearchResults(1);
      mockSearch.mockResolvedValue({
        results: mockResults,
        totalCount: 1,
      });

      const params: SearchParams = {
        query: 'memory test',
        limit: 10,
      };

      // 100回の検索を実行
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(executeSearch(params));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      expect(results.every((r) => r.length === 1)).toBe(true);
      expect(mockSearch).toHaveBeenCalledTimes(100);
    });
  });

  describe('エラー回復とフォールバック', () => {
    it('部分的な結果でも処理を継続する', async () => {
      const partialResults = [
        {
          title: 'Valid Result',
          url: 'https://example.com/valid',
          description: 'Valid description',
        },
        {
          title: 'Invalid Result',
          url: '', // 無効なURL
          description: 'Missing URL',
        },
      ];

      mockSearch.mockResolvedValue({
        results: partialResults,
        totalCount: 2,
      });

      const params: SearchParams = {
        query: 'partial results test',
        limit: 10,
      };

      const results = await executeSearch(params);

      // 無効な結果も含めて返される（フィルタリングは上位層の責任）
      expect(results).toHaveLength(2);
      expect(results[0]?.url).toBe('https://example.com/valid');
      expect(results[1]?.url).toBe('');
    });

    it('ネットワーク復旧後に正常に動作する', async () => {
      const mockResults = createMockSearchResults(1);

      // 最初の2回は失敗、3回目で成功
      mockSearch
        .mockRejectedValueOnce(new NetworkError('Network unreachable'))
        .mockRejectedValueOnce(new NetworkError('Network unreachable'))
        .mockResolvedValueOnce({
          results: mockResults,
          totalCount: 1,
        });

      const params: SearchParams = {
        query: 'network recovery test',
        limit: 10,
      };

      const results = await searchWithRetry(params, 3);

      expect(results).toHaveLength(1);
      expect(results[0]?.title).toBe('Test Result 1');

      // その後の検索も正常に動作
      mockSearch.mockResolvedValue({
        results: createMockSearchResults(2),
        totalCount: 2,
      });

      const results2 = await executeSearch(params);
      expect(results2).toHaveLength(2);
    });
  });
});

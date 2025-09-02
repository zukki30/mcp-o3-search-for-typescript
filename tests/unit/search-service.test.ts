import { describe, it, expect, vi, beforeEach } from 'vitest';

// モジュールのモック
vi.mock('../../src/config.js', () => ({
  default: {
    openaiKey: 'test-key',
    model: 'gpt-4-o3',
    timeout: 30000,
    maxRetries: 3,
    logLevel: 'error',
  },
}));

vi.mock('../../src/utils/client.js', () => ({
  createOpenAIClient: vi.fn(),
}));

import { executeSearch, searchWithRetry } from '../../src/services/search.js';
import type {
  SearchParams,
  SearchResult,
  ChatGPTSearchResponse,
  CostInfo,
  UsageInfo,
} from '../../src/types/index.js';
import { createOpenAIClient } from '../../src/utils/client.js';

const mockClient = {
  search: vi.fn(),
};

describe('executeSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createOpenAIClient as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);
  });

  it('正常な検索を実行できる', async () => {
    const params: SearchParams = {
      query: 'TypeScript tutorial',
      limit: 5,
      language: 'ja',
    };

    const mockUsage: UsageInfo = {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    };

    const mockCostInfo: CostInfo = {
      model: 'gpt-4-o3',
      usage: mockUsage,
      cost: {
        inputCost: 0.0003,
        outputCost: 0.0006,
        totalCost: 0.0009,
      },
      currency: 'USD',
    };

    const mockResponse: ChatGPTSearchResponse = {
      results: [
        {
          title: 'TypeScript入門',
          url: 'https://example.com/typescript',
          description: 'TypeScriptの基本を学ぼう',
          date: '2024-01-01',
          score: 0.9,
        },
      ],
      totalCount: 1,
      cost: mockCostInfo,
    };

    mockClient.search.mockResolvedValue(mockResponse);

    const result = await executeSearch(params);

    expect(mockClient.search).toHaveBeenCalledWith({
      query: 'TypeScript tutorial',
      filters: {
        language: 'ja',
        timeframe: undefined,
      },
      maxResults: 5,
    });

    expect(result).toEqual({
      results: [
        {
          title: 'TypeScript入門',
          url: 'https://example.com/typescript',
          snippet: 'TypeScriptの基本を学ぼう',
          publishedDate: '2024-01-01',
          relevanceScore: 0.9,
        },
      ],
      costInfo: mockCostInfo,
    });
  });

  it('結果がlimitで制限される', async () => {
    const params: SearchParams = {
      query: 'test',
      limit: 2,
    };

    const mockResponse: ChatGPTSearchResponse = {
      results: [
        { title: 'Result 1', url: 'https://example.com/1', description: 'Desc 1' },
        { title: 'Result 2', url: 'https://example.com/2', description: 'Desc 2' },
        { title: 'Result 3', url: 'https://example.com/3', description: 'Desc 3' },
      ],
      totalCount: 3,
    };

    mockClient.search.mockResolvedValue(mockResponse);

    const result = await executeSearch(params);
    expect(result.results).toHaveLength(2);
  });

  it('APIエラーの場合は例外を投げる', async () => {
    const params: SearchParams = {
      query: 'test',
    };

    const error = new Error('API Error');
    mockClient.search.mockRejectedValue(error);

    await expect(executeSearch(params)).rejects.toThrow('API Error');
  });

  it('空の結果を正しく処理する', async () => {
    const params: SearchParams = {
      query: 'no results',
    };

    const mockResponse: ChatGPTSearchResponse = {
      results: [],
      totalCount: 0,
    };

    mockClient.search.mockResolvedValue(mockResponse);

    const result = await executeSearch(params);
    expect(result.results).toEqual([]);
  });

  it('必須フィールドが不足している結果を処理する', async () => {
    const params: SearchParams = {
      query: 'test',
    };

    const mockResponse: ChatGPTSearchResponse = {
      results: [
        {
          title: '',
          url: 'https://example.com/test',
          description: 'Valid description',
        },
      ],
      totalCount: 1,
    };

    mockClient.search.mockResolvedValue(mockResponse);

    const result = await executeSearch(params);
    expect(result.results).toEqual([
      {
        title: 'タイトルなし',
        url: 'https://example.com/test',
        snippet: 'Valid description',
        publishedDate: undefined,
        relevanceScore: undefined,
      },
    ]);
  });
});

describe('searchWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createOpenAIClient as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);
  });

  it('1回目で成功した場合はリトライしない', async () => {
    const params: SearchParams = { query: 'test' };
    const expectedResults: SearchResult[] = [
      { title: 'Test', url: 'https://example.com', snippet: 'Test snippet' },
    ];

    const mockResponse: ChatGPTSearchResponse = {
      results: [{ title: 'Test', url: 'https://example.com', description: 'Test snippet' }],
      totalCount: 1,
    };

    mockClient.search.mockResolvedValue(mockResponse);

    const result = await searchWithRetry(params, 3);

    expect(result.results).toEqual(expectedResults);
    expect(mockClient.search).toHaveBeenCalledTimes(1);
  });

  it('エラーが発生した場合はリトライする', async () => {
    const params: SearchParams = { query: 'test' };

    mockClient.search
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockRejectedValueOnce(new Error('Second attempt failed'))
      .mockResolvedValueOnce({
        results: [{ title: 'Success', url: 'https://example.com', description: 'Success' }],
        totalCount: 1,
      });

    const result = await searchWithRetry(params, 3);

    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.title).toBe('Success');
    expect(mockClient.search).toHaveBeenCalledTimes(3);
  });

  it('すべてのリトライが失敗した場合は最後のエラーを投げる', async () => {
    const params: SearchParams = { query: 'test' };
    const finalError = new Error('Final error');

    mockClient.search
      .mockRejectedValueOnce(new Error('First error'))
      .mockRejectedValueOnce(new Error('Second error'))
      .mockRejectedValueOnce(finalError);

    await expect(searchWithRetry(params, 3)).rejects.toThrow('Final error');
    expect(mockClient.search).toHaveBeenCalledTimes(3);
  });

  it('maxRetriesが1の場合は1回だけ試行する', async () => {
    const params: SearchParams = { query: 'test' };
    const error = new Error('Only attempt failed');

    mockClient.search.mockRejectedValue(error);

    await expect(searchWithRetry(params, 1)).rejects.toThrow('Only attempt failed');
    expect(mockClient.search).toHaveBeenCalledTimes(1);
  });
});

import OpenAI from 'openai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatGPTSearchQuery } from '../../src/types/index.js';
import { createOpenAIClient } from '../../src/utils/client.js';

// モジュールのモック
vi.mock('../../src/config.js', () => ({
  default: {
    openaiKey: 'test-api-key',
    model: 'gpt-4-o3',
    timeout: 30000,
    maxRetries: 3,
    logLevel: 'error',
  },
}));

vi.mock('openai', () => {
  // OpenAI APIError モッククラス
  class MockAPIError extends Error {
    status: number;
    type: string;
    headers?: Record<string, string>;

    constructor(
      message: string,
      status: number,
      type = 'api_error',
      headers?: Record<string, string>,
    ) {
      super(message);
      this.name = 'APIError';
      this.status = status;
      this.type = type;
      this.headers = headers;
    }
  }

  return {
    default: vi.fn(),
    APIError: MockAPIError,
  };
});

const MockedOpenAI = OpenAI as unknown as ReturnType<typeof vi.fn>;

describe('createOpenAIClient', () => {
  let mockChatCompletions: { create: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    mockChatCompletions = {
      create: vi.fn(),
    };

    MockedOpenAI.mockImplementation(() => ({
      chat: {
        completions: mockChatCompletions,
      },
    }));
  });

  describe('search', () => {
    it('正常な検索リクエストが成功する', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: `{
                "results": [
                  {
                    "title": "Test Article",
                    "url": "https://example.com/test",
                    "description": "Test description",
                    "date": "2024-01-01",
                    "score": 0.9
                  }
                ],
                "totalCount": 1
              }`,
            },
          },
        ],
        usage: { total_tokens: 100 },
        model: 'gpt-4-o3',
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const client = createOpenAIClient();
      const query: ChatGPTSearchQuery = {
        query: 'test query',
        filters: { language: 'ja' },
        maxResults: 10,
      };

      const result = await client.search(query);

      expect(result).toEqual({
        results: [
          {
            title: 'Test Article',
            url: 'https://example.com/test',
            description: 'Test description',
            date: '2024-01-01',
            score: 0.9,
          },
        ],
        totalCount: 1,
      });

      expect(mockChatCompletions.create).toHaveBeenCalledWith({
        model: 'gpt-4-o3',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('Web検索アシスタント') as string,
          },
          {
            role: 'user',
            content: expect.stringContaining('test query') as string,
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      });
    });

    it('JSON形式でないレスポンスの場合はエラーを投げる', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'This is not JSON format',
            },
          },
        ],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const client = createOpenAIClient();
      const query: ChatGPTSearchQuery = {
        query: 'test',
        filters: {},
        maxResults: 10,
      };

      await expect(client.search(query)).rejects.toThrow('検索レスポンスの解析エラー');
    });

    it('空のレスポンスの場合はエラーを投げる', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const client = createOpenAIClient();
      const query: ChatGPTSearchQuery = {
        query: 'test',
        filters: {},
        maxResults: 10,
      };

      await expect(client.search(query)).rejects.toThrow('検索レスポンスの解析エラー');
    });

    it('無効なJSON構造の場合はエラーを投げる', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"invalid": "structure"}',
            },
          },
        ],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const client = createOpenAIClient();
      const query: ChatGPTSearchQuery = {
        query: 'test',
        filters: {},
        maxResults: 10,
      };

      await expect(client.search(query)).rejects.toThrow('検索レスポンスの解析エラー');
    });
  });

  describe('エラーハンドリング', () => {
    it('401エラーの場合はAuthErrorを投げる', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const apiError = new (OpenAI as any).APIError('Unauthorized', 401);
      mockChatCompletions.create.mockRejectedValue(apiError);

      const client = createOpenAIClient();
      const query: ChatGPTSearchQuery = { query: 'test', filters: {}, maxResults: 10 };

      await expect(client.search(query)).rejects.toThrow('OpenAI APIキーが無効です');
    });

    it('429エラーの場合はRateLimitErrorを投げる', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const apiError = new (OpenAI as any).APIError(
        'Rate limit exceeded',
        429,
        'rate_limit_error',
        {
          'retry-after': '60',
        },
      );
      mockChatCompletions.create.mockRejectedValue(apiError);

      const client = createOpenAIClient();
      const query: ChatGPTSearchQuery = { query: 'test', filters: {}, maxResults: 10 };

      try {
        await client.search(query);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toHaveProperty('retryAfter', 60);
        expect((error as Error).message).toContain('レート制限');
      }
    });

    it('500エラーの場合はNetworkErrorを投げる', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const apiError = new (OpenAI as any).APIError('Internal Server Error', 500);
      mockChatCompletions.create.mockRejectedValue(apiError);

      const client = createOpenAIClient();
      const query: ChatGPTSearchQuery = { query: 'test', filters: {}, maxResults: 10 };

      await expect(client.search(query)).rejects.toThrow('OpenAI APIサーバーエラー');
    });

    it('タイムアウトエラーの場合はTimeoutErrorを投げる', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';
      mockChatCompletions.create.mockRejectedValue(timeoutError);

      const client = createOpenAIClient();
      const query: ChatGPTSearchQuery = { query: 'test', filters: {}, maxResults: 10 };

      await expect(client.search(query)).rejects.toThrow('タイムアウト');
    });

    it('ネットワークエラーの場合はNetworkErrorを投げる', async () => {
      const networkError = new Error('ECONNREFUSED');
      mockChatCompletions.create.mockRejectedValue(networkError);

      const client = createOpenAIClient();
      const query: ChatGPTSearchQuery = { query: 'test', filters: {}, maxResults: 10 };

      await expect(client.search(query)).rejects.toThrow('ネットワーク接続エラー');
    });

    it('予期しないエラーの場合はNetworkErrorを投げる', async () => {
      const unknownError = new Error('Unknown error');
      mockChatCompletions.create.mockRejectedValue(unknownError);

      const client = createOpenAIClient();
      const query: ChatGPTSearchQuery = { query: 'test', filters: {}, maxResults: 10 };

      await expect(client.search(query)).rejects.toThrow('予期しないエラー');
    });
  });
});

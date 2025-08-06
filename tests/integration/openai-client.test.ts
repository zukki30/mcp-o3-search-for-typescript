import OpenAI from 'openai';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { ChatGPTSearchQuery } from '../../src/types/index.js';
import { createOpenAIClient } from '../../src/utils/client.js';
import { createMockChatCompletion, createMockSearchResults } from '../helpers/test-utils.js';

vi.mock('openai');

interface MockOpenAI {
  chat: {
    completions: {
      create: ReturnType<typeof vi.fn>;
    };
  };
}

describe('OpenAI Client Integration Tests', () => {
  let mockOpenAI: MockOpenAI;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCreate = vi.fn();
    mockOpenAI = {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };

    (OpenAI as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOpenAI);
  });

  describe('正常系のシナリオ', () => {
    it('単一の検索結果を正しく処理する', async () => {
      const mockResults = createMockSearchResults(1);
      const mockResponse = createMockChatCompletion(mockResults);
      mockCreate.mockResolvedValue(mockResponse);

      const client = createOpenAIClient();
      const query: ChatGPTSearchQuery = {
        query: 'TypeScript best practices',
        filters: { language: 'ja' },
        maxResults: 10,
      };

      const result = await client.search(query);

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toMatchObject({
        title: 'Test Result 1',
        url: 'https://example.com/result1',
        description: 'This is test result 1',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4-o3',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('Web検索アシスタント') as string,
          },
          {
            role: 'user',
            content: expect.stringContaining('TypeScript best practices') as string,
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      });
    });

    it('複数の検索結果を正しく処理する', async () => {
      const mockResults = createMockSearchResults(5);
      const mockResponse = createMockChatCompletion(mockResults, 100);
      mockCreate.mockResolvedValue(mockResponse);

      const client = createOpenAIClient();
      const query: ChatGPTSearchQuery = {
        query: 'React hooks tutorials',
        filters: { timeframe: 'week' },
        maxResults: 5,
      };

      const result = await client.search(query);

      expect(result.results).toHaveLength(5);
      expect(result.totalCount).toBe(100);
      expect(result.results[0]?.score || 0).toBeGreaterThan(result.results[4]?.score || 0);
    });

    it('フィルター付きの検索クエリを正しく処理する', async () => {
      const mockResults = createMockSearchResults(3);
      const mockResponse = createMockChatCompletion(mockResults);
      mockCreate.mockResolvedValue(mockResponse);

      const client = createOpenAIClient();
      const query: ChatGPTSearchQuery = {
        query: 'Node.js performance optimization',
        filters: {
          language: 'ja',
          timeframe: 'month',
        },
        maxResults: 20,
      };

      const result = await client.search(query);

      expect(result.results).toHaveLength(3);

      const callArgs = mockCreate.mock.calls[0]?.[0] as
        | { messages: Array<{ content: string }> }
        | undefined;
      const userMessage = callArgs?.messages[1]?.content;
      expect(userMessage).toContain('Node.js performance optimization');
      expect(userMessage).toContain('language": "ja"');
      expect(userMessage).toContain('timeframe": "month"');
      expect(userMessage).toContain('max_results": 20');
    });
  });

  describe('エッジケースの処理', () => {
    it('空の検索結果を正しく処理する', async () => {
      const mockResponse = createMockChatCompletion([], 0);
      mockCreate.mockResolvedValue(mockResponse);

      const client = createOpenAIClient();
      const query: ChatGPTSearchQuery = {
        query: 'very specific query with no results',
        filters: {},
        maxResults: 10,
      };

      const result = await client.search(query);

      expect(result.results).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('JSONにコメントが含まれる場合も正しく解析する', async () => {
      const mockResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4-o3',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: `検索結果を以下に示します：
              
              \`\`\`json
              {
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
              }
              \`\`\`
              
              以上が検索結果です。`,
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const client = createOpenAIClient();
      const result = await client.search({ query: 'test', filters: {}, maxResults: 10 });

      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.title).toBe('Test Article');
    });

    it('部分的な結果データでも正しく処理する', async () => {
      const partialResults = [
        {
          title: 'Result with minimal data',
          url: 'https://example.com/minimal',
          // description, date, score は省略
        },
      ];

      const mockResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4-o3',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify({ results: partialResults, totalCount: 1 }),
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const client = createOpenAIClient();
      const result = await client.search({ query: 'test', filters: {}, maxResults: 10 });

      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.title).toBe('Result with minimal data');
      expect(result.results[0]?.url).toBe('https://example.com/minimal');
      expect(result.results[0]?.description).toBeUndefined();
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量の検索結果でも適切な時間内に処理できる', async () => {
      const largeResults = createMockSearchResults(50);
      const mockResponse = createMockChatCompletion(largeResults, 1000);
      mockCreate.mockResolvedValue(mockResponse);

      const client = createOpenAIClient();
      const startTime = Date.now();

      const result = await client.search({
        query: 'performance test',
        filters: {},
        maxResults: 50,
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result.results).toHaveLength(50);
      expect(processingTime).toBeLessThan(1000); // 1秒以内に処理
    });
  });

  describe('並行処理のテスト', () => {
    it('複数の同時リクエストを正しく処理する', async () => {
      const mockResults1 = createMockSearchResults(2);
      const mockResults2 = createMockSearchResults(3);
      const mockResults3 = createMockSearchResults(1);

      mockCreate
        .mockResolvedValueOnce(createMockChatCompletion(mockResults1))
        .mockResolvedValueOnce(createMockChatCompletion(mockResults2))
        .mockResolvedValueOnce(createMockChatCompletion(mockResults3));

      const client = createOpenAIClient();

      const queries: ChatGPTSearchQuery[] = [
        { query: 'query1', filters: {}, maxResults: 10 },
        { query: 'query2', filters: {}, maxResults: 10 },
        { query: 'query3', filters: {}, maxResults: 10 },
      ];

      const results = await Promise.all(queries.map((q) => client.search(q)));

      expect(results[0]?.results).toHaveLength(2);
      expect(results[1]?.results).toHaveLength(3);
      expect(results[2]?.results).toHaveLength(1);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });
  });
});

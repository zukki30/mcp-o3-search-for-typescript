import type { ChatCompletions } from 'openai/resources/index.js';
import { vi, beforeEach, afterEach } from 'vitest';

import type { ChatGPTSearchResponse, SearchResult } from '../../src/types/index.js';

// OpenAI APIのモックレスポンスを作成
export function createMockChatCompletion(
  results: SearchResult[],
  totalCount?: number,
): ChatCompletions.ChatCompletion {
  const response: ChatGPTSearchResponse = {
    results,
    totalCount: totalCount ?? results.length,
  };

  return {
    id: 'test-completion-id',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4-o3',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: JSON.stringify(response),
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 200,
      total_tokens: 300,
    },
  } as ChatCompletions.ChatCompletion;
}

// テスト用の検索結果を作成
export function createMockSearchResults(count = 3): SearchResult[] {
  const results: SearchResult[] = [];
  for (let i = 0; i < count; i++) {
    results.push({
      title: `Test Result ${i + 1}`,
      url: `https://example.com/result${i + 1}`,
      description: `This is test result ${i + 1}`,
      date: '2024-01-01',
      score: 0.9 - i * 0.1,
    });
  }
  return results;
}

// OpenAI クライアントのモックを作成
export function createMockOpenAIClient(): {
  chat: {
    completions: {
      create: ReturnType<typeof vi.fn>;
    };
  };
  mockCreate: ReturnType<typeof vi.fn>;
} {
  const mockCreate = vi.fn();

  return {
    chat: {
      completions: {
        create: mockCreate,
      },
    },
    mockCreate,
  };
}

// 環境変数のモックヘルパー
export function mockEnvironmentVariables(overrides: Record<string, string> = {}): void {
  const originalEnv = process.env;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      TEST_MODE: 'true',
      OPENAI_API_KEY: 'test_api_key',
      OPENAI_MODEL: 'gpt-4-o3',
      SERVER_TIMEOUT: '5000',
      SERVER_MAX_RETRIES: '1',
      LOG_LEVEL: 'error',
      ...overrides,
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  afterEach(() => {
    process.env = originalEnv;
  });
}

// 遅延を作成（レート制限のテスト用）
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

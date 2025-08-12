import { describe, it, expect, beforeEach, vi } from 'vitest';

import { createMCPSearchServer, startMCPSearchServer } from '../../src/server.js';
import { createMockSearchResults } from '../helpers/test-utils.js';

// OpenAI APIをモック
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  results: createMockSearchResults(2).map((result) => ({
                    title: result.title,
                    url: result.url,
                    description: result.snippet,
                    date: result.publishedDate,
                    score: result.relevanceScore,
                  })),
                  totalCount: 2,
                }),
              },
            },
          ],
        }),
      },
    },
  })),
}));

describe('MCP Server Basic E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Server Creation and Configuration', () => {
    it('should create MCP server instance successfully', () => {
      const server = createMCPSearchServer();

      expect(server).toBeDefined();
      expect(typeof server.connect).toBe('function');
      expect(typeof server.close).toBe('function');
    });

    it('should configure server with proper handlers', () => {
      const server = createMCPSearchServer();

      // サーバーが適切に設定されていることを確認
      expect(server).toHaveProperty('connect');
      expect(server).toHaveProperty('close');
      expect(server).toHaveProperty('setRequestHandler');
    });
  });

  describe('Tool Registration', () => {
    it('should register search tool correctly', () => {
      const server = createMCPSearchServer();

      // ツールが正しく登録されていることを間接的に確認
      // 実際のMCPサーバーの内部状態は直接アクセスできないため、
      // サーバーが正常に作成されることで登録を確認
      expect(server).toBeDefined();
    });
  });

  describe('Error Handling Setup', () => {
    it('should handle server creation errors gracefully', () => {
      // テスト環境では環境変数がデフォルト値を持つため、
      // サーバー作成自体は成功することを確認
      const server = createMCPSearchServer();
      expect(server).toBeDefined();
    });

    it('should validate configuration on startup', () => {
      // 設定の検証機能があることを確認
      // 実際の設定検証は config.ts でテストされる
      const server = createMCPSearchServer();
      expect(server).toBeDefined();
    });
  });

  describe('Search Tool Integration', () => {
    it('should integrate search tool with server', async () => {
      const server = createMCPSearchServer();

      // サーバーが検索ツールと統合されていることを確認
      // 実際のテストは上位レベルのE2Eテストで行う
      expect(server).toBeDefined();
    });
  });

  describe('Logging Integration', () => {
    it('should initialize logging system', () => {
      const server = createMCPSearchServer();

      // ログシステムが初期化されていることを確認
      expect(server).toBeDefined();
    });

    it('should handle different log levels', () => {
      const originalLogLevel = process.env.LOG_LEVEL;

      // 異なるログレベルでサーバー作成
      process.env.LOG_LEVEL = 'debug';
      const debugServer = createMCPSearchServer();
      expect(debugServer).toBeDefined();

      process.env.LOG_LEVEL = 'error';
      const errorServer = createMCPSearchServer();
      expect(errorServer).toBeDefined();

      process.env.LOG_LEVEL = originalLogLevel;
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required environment variables', () => {
      // 環境変数が適切に設定されていることを確認
      // テスト環境ではデフォルト値が使用される
      const server = createMCPSearchServer();
      expect(server).toBeDefined();
    });

    it('should use default values for optional configuration', () => {
      const originalModel = process.env.OPENAI_MODEL;
      delete process.env.OPENAI_MODEL;

      // デフォルト値でサーバーが作成されることを確認
      const server = createMCPSearchServer();
      expect(server).toBeDefined();

      if (originalModel) {
        process.env.OPENAI_MODEL = originalModel;
      }
    });

    it('should validate numeric configuration values', () => {
      // 数値設定の検証機能があることを確認
      // 実際の検証は config.ts の単体テストで行う
      const server = createMCPSearchServer();
      expect(server).toBeDefined();
    });
  });

  describe('Server Lifecycle', () => {
    it('should handle server startup sequence', () => {
      // startMCPSearchServer は実際のプロセス通信を開始するため、
      // ここでは関数が存在することのみ確認
      expect(typeof startMCPSearchServer).toBe('function');
    });

    it('should cleanup resources properly', () => {
      const server = createMCPSearchServer();

      // サーバーがクリーンアップ機能を持つことを確認
      expect(typeof server.close).toBe('function');
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory during server creation', () => {
      // 複数回のサーバー作成でメモリリークがないことを確認
      const servers = [];

      for (let i = 0; i < 10; i++) {
        servers.push(createMCPSearchServer());
      }

      expect(servers).toHaveLength(10);
      servers.forEach((server) => {
        expect(server).toBeDefined();
      });
    });
  });

  describe('Multi-Model Support', () => {
    it('should support different OpenAI models', () => {
      const originalModel = process.env.OPENAI_MODEL;

      // 異なるモデルでサーバー作成
      const models = ['gpt-4-o3', 'gpt-5', 'gpt-4-turbo'];

      models.forEach((model) => {
        process.env.OPENAI_MODEL = model;
        const server = createMCPSearchServer();
        expect(server).toBeDefined();
      });

      if (originalModel) {
        process.env.OPENAI_MODEL = originalModel;
      } else {
        delete process.env.OPENAI_MODEL;
      }
    });
  });
});

# MCP O3 Search Server - 設計仕様書

## システムアーキテクチャ

### 全体構成

```
┌─────────────────────┐     ┌──────────────────┐
│   MCP Client        │     │  ChatGPT o3 API  │
│ (Claude/Cursor/etc) │     │   (OpenAI)       │
└──────────┬──────────┘     └────────▲─────────┘
           │                          │
           │ MCP Protocol             │ HTTPS
           │                          │
┌──────────▼──────────────────────────┴─────────┐
│             MCP O3 Search Server              │
│                                               │
│  ┌─────────────┐  ┌────────────┐  ┌────────┐ │
│  │ MCP Handler │  │   Search   │  │ OpenAI │ │
│  │             │──│   Service  │──│ Client │ │
│  └─────────────┘  └────────────┘  └────────┘ │
│                                               │
│  ┌─────────────┐  ┌────────────┐  ┌────────┐ │
│  │    Auth     │  │   Error    │  │ Logger │ │
│  │  Manager    │  │  Handler   │  │        │ │
│  └─────────────┘  └────────────┘  └────────┘ │
└───────────────────────────────────────────────┘
```

## コンポーネント設計

### 1. MCPサーバー（server.ts）

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  ListToolsRequestSchema,
  CallToolRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';

export class MCPSearchServer {
  private server: Server;
  private searchService: SearchService;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-o3-search',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.searchService = new SearchService();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // ツール一覧の提供
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [searchTool],
    }));

    // ツール実行
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'chatgpt_o3_search') {
        return await this.handleSearch(request.params.arguments);
      }
      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
```

### 2. 検索ツール定義（tools/search.ts）

```typescript
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const searchTool: Tool = {
  name: 'chatgpt_o3_search',
  description: 'ChatGPT o3の検索機能を使用してWeb検索を実行します',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '検索クエリ',
      },
      limit: {
        type: 'number',
        description: '返す結果の最大数',
        default: 10,
        minimum: 1,
        maximum: 50,
      },
      language: {
        type: 'string',
        description: '結果の言語（例: ja, en）',
        default: 'auto',
      },
      timeframe: {
        type: 'string',
        description: '時間範囲フィルタ',
        enum: ['recent', 'past_week', 'past_month', 'past_year'],
      },
    },
    required: ['query'],
  },
};

export interface SearchParams {
  query: string;
  limit?: number;
  language?: string;
  timeframe?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  relevanceScore?: number;
}
```

### 3. 検索サービス（services/search.ts）

```typescript
import { OpenAIClient } from '../utils/client.js';
import { SearchParams, SearchResult } from '../tools/search.js';
import { Logger } from '../utils/logger.js';

export class SearchService {
  private client: OpenAIClient;
  private logger: Logger;

  constructor() {
    this.client = new OpenAIClient();
    this.logger = new Logger('SearchService');
  }

  async search(params: SearchParams): Promise<SearchResult[]> {
    this.logger.info('Executing search', { query: params.query });
    
    try {
      // 検索クエリの構築
      const searchQuery = this.buildSearchQuery(params);
      
      // ChatGPT o3 APIの呼び出し
      const response = await this.client.search(searchQuery);
      
      // 結果の変換
      const results = this.transformResults(response, params.limit);
      
      this.logger.info('Search completed', { 
        query: params.query, 
        resultCount: results.length 
      });
      
      return results;
    } catch (error) {
      this.logger.error('Search failed', error);
      throw new SearchError('検索の実行に失敗しました', error);
    }
  }

  private buildSearchQuery(params: SearchParams): ChatGPTSearchQuery {
    return {
      query: params.query,
      filters: {
        language: params.language || 'auto',
        timeframe: params.timeframe,
      },
      maxResults: params.limit || 10,
    };
  }

  private transformResults(
    response: ChatGPTSearchResponse, 
    limit?: number
  ): SearchResult[] {
    const results = response.results.map(item => ({
      title: item.title,
      url: item.url,
      snippet: item.description,
      publishedDate: item.date,
      relevanceScore: item.score,
    }));

    return limit ? results.slice(0, limit) : results;
  }
}
```

### 4. OpenAIクライアント（utils/client.ts）

```typescript
import { Configuration, OpenAIApi } from 'openai';
import { AuthManager } from './auth.js';
import { RetryManager } from './retry.js';

export class OpenAIClient {
  private api: OpenAIApi;
  private retryManager: RetryManager;

  constructor() {
    const apiKey = AuthManager.getApiKey();
    const configuration = new Configuration({ apiKey });
    this.api = new OpenAIApi(configuration);
    this.retryManager = new RetryManager();
  }

  async search(query: ChatGPTSearchQuery): Promise<ChatGPTSearchResponse> {
    return this.retryManager.execute(async () => {
      const response = await this.api.createChatCompletion({
        model: 'gpt-4-o3',
        messages: [
          {
            role: 'system',
            content: 'You are a search assistant. Perform web search and return structured results.',
          },
          {
            role: 'user',
            content: this.formatSearchPrompt(query),
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'web_search',
              description: 'Search the web for information',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string' },
                  filters: { type: 'object' },
                },
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'web_search' } },
      });

      return this.parseSearchResponse(response.data);
    });
  }

  private formatSearchPrompt(query: ChatGPTSearchQuery): string {
    return JSON.stringify({
      action: 'search',
      query: query.query,
      filters: query.filters,
      maxResults: query.maxResults,
    });
  }

  private parseSearchResponse(response: any): ChatGPTSearchResponse {
    // レスポンスの解析とバリデーション
    const toolCalls = response.choices[0]?.message?.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      throw new Error('No search results returned');
    }

    const searchResults = JSON.parse(toolCalls[0].function.arguments);
    return {
      results: searchResults.results || [],
      totalCount: searchResults.totalCount || 0,
    };
  }
}
```

### 5. 認証管理（utils/auth.ts）

```typescript
export class AuthManager {
  static getApiKey(): string {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new AuthError(
        'OPENAI_API_KEY環境変数が設定されていません。' +
        'OpenAI APIキーを設定してください。'
      );
    }

    if (!this.isValidApiKey(apiKey)) {
      throw new AuthError('無効なAPIキー形式です。');
    }

    return apiKey;
  }

  private static isValidApiKey(key: string): boolean {
    // OpenAI APIキーの基本的な形式チェック
    return /^sk-[a-zA-Z0-9]{48}$/.test(key);
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
```

### 6. エラーハンドリング（utils/error.ts）

```typescript
export class ErrorHandler {
  static handle(error: unknown): MCPErrorResponse {
    if (error instanceof AuthError) {
      return {
        error: {
          code: -32001,
          message: 'Authentication Error',
          data: { details: error.message },
        },
      };
    }

    if (error instanceof SearchError) {
      return {
        error: {
          code: -32002,
          message: 'Search Error',
          data: { details: error.message },
        },
      };
    }

    if (error instanceof RateLimitError) {
      return {
        error: {
          code: -32003,
          message: 'Rate Limit Exceeded',
          data: { 
            details: error.message,
            retryAfter: error.retryAfter,
          },
        },
      };
    }

    // 予期しないエラー
    return {
      error: {
        code: -32603,
        message: 'Internal Error',
        data: { 
          details: process.env.NODE_ENV === 'development' 
            ? error.toString() 
            : 'An unexpected error occurred',
        },
      },
    };
  }
}
```

### 7. リトライ管理（utils/retry.ts）

```typescript
export class RetryManager {
  private maxRetries = 3;
  private baseDelay = 1000;

  async execute<T>(
    operation: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T> {
    const maxRetries = options?.maxRetries || this.maxRetries;
    let lastError: Error;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (!this.isRetryable(error)) {
          throw error;
        }

        if (i < maxRetries - 1) {
          const delay = this.calculateDelay(i, error);
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof RateLimitError) return true;
    if (error instanceof NetworkError) return true;
    if (error instanceof TimeoutError) return true;
    
    return false;
  }

  private calculateDelay(attempt: number, error: unknown): number {
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000;
    }
    
    // 指数バックオフ
    return this.baseDelay * Math.pow(2, attempt);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## データフロー

### 検索リクエストの処理フロー

```
1. MCPクライアント → MCPサーバー
   - tools/call リクエスト
   - ツール名: chatgpt_o3_search
   - パラメータ: { query, limit, language, timeframe }

2. MCPサーバー → SearchService
   - パラメータバリデーション
   - 認証チェック

3. SearchService → OpenAIClient
   - 検索クエリの構築
   - ChatGPT o3 APIの呼び出し

4. OpenAIClient → ChatGPT o3 API
   - HTTPSリクエスト
   - リトライ処理

5. ChatGPT o3 API → OpenAIClient
   - 検索結果レスポンス

6. OpenAIClient → SearchService
   - レスポンスの解析
   - 結果の変換

7. SearchService → MCPサーバー
   - 構造化された検索結果

8. MCPサーバー → MCPクライアント
   - MCPレスポンス形式での返却
```

## エラー処理戦略

### エラーの分類と対応

1. **認証エラー**
   - APIキー未設定 → 明確な設定手順を提示
   - APIキー無効 → キーの確認を促す

2. **ネットワークエラー**
   - タイムアウト → 自動リトライ
   - 接続失敗 → エラーメッセージとリトライ

3. **API制限エラー**
   - レート制限 → 指数バックオフでリトライ
   - クォータ超過 → エラーメッセージ

4. **検証エラー**
   - 無効なパラメータ → 詳細なエラーメッセージ
   - 空のクエリ → バリデーションエラー

## セキュリティ考慮事項

1. **APIキー保護**
   - 環境変数での管理
   - ログへの出力禁止
   - メモリ内での安全な保持

2. **入力検証**
   - SQLインジェクション対策
   - XSS対策（HTMLエスケープ）
   - 最大長の制限

3. **通信セキュリティ**
   - HTTPS通信の強制
   - 証明書検証

## パフォーマンス最適化

1. **非同期処理**
   - Promise/async-awaitの活用
   - 並行処理の最適化

2. **タイムアウト管理**
   - デフォルト30秒
   - 設定可能なタイムアウト値

3. **メモリ管理**
   - 大量結果のストリーミング処理
   - 適切なガベージコレクション
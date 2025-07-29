import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';

import config from './config.js';
import { Logger } from './utils/logger.js';

export class MCPSearchServer {
  private server: Server;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('MCPSearchServer');
    
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

    this.setupHandlers();
    this.logger.info('MCP O3 Search Server initialized', {
      model: config.model,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
    });
  }

  private setupHandlers(): void {
    // ツール一覧の提供
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.debug('Received tools list request');
      
      return {
        tools: [
          {
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
          },
        ],
      };
    });

    // ツール実行
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      this.logger.info('Received tool call request', {
        toolName: request.params.name,
        arguments: request.params.arguments,
      });

      if (request.params.name === 'chatgpt_o3_search') {
        return await this.handleSearch(request.params.arguments);
      }

      const error = `Unknown tool: ${request.params.name}`;
      this.logger.error(error);
      throw new Error(error);
    });

    this.logger.debug('Request handlers configured');
  }

  private async handleSearch(args: unknown): Promise<{ content: Array<{ type: string; text: string }> }> {
    this.logger.info('Handling search request', { args });
    
    // 一時的な実装 - 後でSearchServiceに移譲
    return {
      content: [
        {
          type: 'text',
          text: 'Search functionality will be implemented in the next phase. This is a placeholder response.',
        },
      ],
    };
  }

  async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      this.logger.info('MCP O3 Search Server started successfully');
    } catch (error) {
      this.logger.error('Failed to start server', error);
      throw error;
    }
  }
}
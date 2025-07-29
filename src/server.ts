import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import config from './config.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('MCPSearchServer');

function createSearchTool(): object {
  return {
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
}

async function handleSearch(
  args: unknown,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Handling search request', { args });

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

function setupServerHandlers(server: Server): void {
  // ツール一覧の提供
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Received tools list request');

    return {
      tools: [createSearchTool()],
    };
  });

  // ツール実行
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    logger.info('Received tool call request', {
      toolName: request.params.name,
      arguments: request.params.arguments,
    });

    if (request.params.name === 'chatgpt_o3_search') {
      return await handleSearch(request.params.arguments);
    }

    const error = `Unknown tool: ${request.params.name}`;
    logger.error(error);
    throw new Error(error);
  });

  logger.debug('Request handlers configured');
}

export function createMCPSearchServer(): Server {
  logger.info('Creating MCP O3 Search Server', {
    model: config.model,
    timeout: config.timeout,
    maxRetries: config.maxRetries,
  });

  const server = new Server(
    {
      name: 'mcp-o3-search',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  setupServerHandlers(server);
  return server;
}

export async function startMCPSearchServer(): Promise<void> {
  try {
    const server = createMCPSearchServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('MCP O3 Search Server started successfully');
  } catch (error) {
    logger.error('Failed to start server', error);
    throw error;
  }
}

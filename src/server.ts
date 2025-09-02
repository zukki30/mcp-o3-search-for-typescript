import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import config from './config.js';
import { searchWithRetry } from './services/search.js';
import { searchTool, validateSearchParams, formatSearchResults } from './tools/search.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('MCPSearchServer');

async function handleSearch(
  args: unknown,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    logger.info('Handling search request', { args });

    // パラメータの検証
    const params = validateSearchParams(args);
    logger.debug('Validated search parameters', { params });

    // 検索の実行（リトライ付き）
    const { results, costInfo } = await searchWithRetry(params, config.maxRetries);
    logger.info('Search completed', {
      resultCount: results.length,
      cost: costInfo?.cost.totalCost,
    });

    // 結果のフォーマット（コスト情報含む）
    return formatSearchResults(results, costInfo);
  } catch (error) {
    logger.error('Search failed', error);

    const errorMessage =
      error instanceof Error ? error.message : '検索中に予期しないエラーが発生しました';
    return {
      content: [
        {
          type: 'text',
          text: `検索エラー: ${errorMessage}`,
        },
      ],
    };
  }
}

function setupServerHandlers(server: Server): void {
  // ツール一覧の提供
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Received tools list request');

    return {
      tools: [searchTool],
    };
  });

  // ツール実行
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    logger.info('Received tool call request', {
      toolName: request.params.name,
      arguments: request.params.arguments,
    });

    if (request.params.name === 'openai_search') {
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
      name: 'mcp-openai-search',
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

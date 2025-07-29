import { describe, it, expect, vi } from 'vitest';

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

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

import { createMCPSearchServer } from '../../src/server.js';

describe('createMCPSearchServer', () => {
  it('should create a server instance', () => {
    const server = createMCPSearchServer();
    expect(server).toBeDefined();
  });

  it('should setup request handlers', () => {
    const server = createMCPSearchServer();
    const mockServer = server as unknown as { setRequestHandler: ReturnType<typeof vi.fn> };
    expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);
  });
});

# MCP OpenAI Search Server

OpenAIの検索機能（GPT-o3, GPT-5等）をClaude CodeやCursorなどのAIエージェントで利用するためのMCP（Model Context Protocol）サーバー

## 概要

このプロジェクトは、OpenAIの複数のモデル（ChatGPT o3、ChatGPT 5など）のSearch機能をModel Context Protocol（MCP）として提供するTypeScriptサーバーです。Claude Code、Cursor、その他のMCP対応AIエージェントから、OpenAIの強力な検索能力を活用できるようになります。

## 主な機能

- **マルチモデル対応**: GPT-o3、GPT-5等の複数OpenAIモデルに対応
- **OpenAI Search統合**: OpenAI検索APIをMCPツールとして提供
- **リアルタイム検索**: Web検索、リアルタイム情報取得、専門的な検索クエリに対応
- **MCPプロトコル準拠**: 標準的なMCPインターフェースによる互換性確保
- **型安全**: TypeScriptによる堅牢な型定義とエラーハンドリング
- **認証機能**: OpenAI APIキーによる安全な認証

## 対応AIエージェント

- **Claude Code**: Anthropic公式CLI
- **Cursor**: AI統合開発環境
- **その他MCPクライアント**: MCPプロトコル準拠のあらゆるAIツール

## 技術スタック

- **言語**: TypeScript
- **ランタイム**: Node.js
- **プロトコル**: Model Context Protocol (MCP)
- **API**: OpenAI ChatGPT o3 Search API
- **開発環境**: ESLint, Prettier, Jest

## 使用例

```typescript
// MCPクライアント（Claude Code、Cursor等）から
await callTool("chatgpt_search", {
  query: "最新のTypeScript 5.5の新機能",
  limit: 10
});
```

## 開発状況

🚧 **開発中** - MCPサーバーの基本実装を進行中

## 参考資料

- [ChatGPT会議録](https://chatgpt.com/share/6886fdd0-4a80-8005-b98e-a753ef8c4ff5)
- [Model Context Protocol](https://modelcontextprotocol.io/)
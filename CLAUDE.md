# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

MCP O3 Search Serverは、ChatGPT o3の検索機能をModel Context Protocol（MCP）として提供するTypeScriptサーバーです。Claude Code、Cursor、その他のMCP対応AIエージェントから、ChatGPT o3の強力な検索能力を活用できるようにします。

## 技術スタック

- **言語**: TypeScript
- **ランタイム**: Node.js
- **プロトコル**: Model Context Protocol (MCP)
- **API**: OpenAI ChatGPT o3 Search API
- **開発環境**: ESLint, Prettier, Jest（予定）

## プロジェクト構造

現在は開発初期段階で、以下の構造を想定：

```
/
├── src/
│   ├── server.ts          # MCPサーバーのメインエントリーポイント
│   ├── tools/
│   │   └── search.ts      # ChatGPT o3検索ツールの実装
│   ├── types/
│   │   └── mcp.ts         # MCP関連の型定義
│   └── utils/
│       ├── auth.ts        # OpenAI API認証処理
│       └── client.ts      # ChatGPT o3 APIクライアント
├── docs/specs/            # 仕様書ディレクトリ
└── tests/                 # テストファイル
```

## 開発ワークフロー

### Spec-driven Development

このプロジェクトは spec-driven development を採用しています：

1. **事前準備フェーズ**: `./docs/specs/{feature-name}` ディレクトリ作成
2. **要件フェーズ**: `requirements.md` 作成・レビュー
3. **設計フェーズ**: `design.md` 作成・レビュー  
4. **実装計画フェーズ**: `implementation-plan.md` 作成・レビュー
5. **実装フェーズ**: 仕様書に基づく実装

### MCPツール実装パターン

MCPツールを実装する際は以下のパターンに従う：

```typescript
// tools/example.ts
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const exampleTool: Tool = {
  name: "tool_name",
  description: "ツールの概要説明",
  inputSchema: {
    type: "object",
    properties: {
      param: {
        type: "string",
        description: "パラメータの説明"
      }
    },
    required: ["param"]
  }
};

export async function handleExampleTool(args: any) {
  // ツールの実装
  return {
    content: [
      {
        type: "text",
        text: "結果"
      }
    ]
  };
}
```

## 重要な実装考慮事項

### 認証とセキュリティ

- OpenAI APIキーは環境変数で管理（`OPENAI_API_KEY`）
- APIキーの検証とエラーハンドリングを適切に実装
- 機密情報をログに出力しない

### エラーハンドリング

- MCP準拠のエラーレスポンス形式を使用
- ChatGPT o3 API のレート制限に対する適切な対応
- ネットワークエラーの再試行ロジック

### TypeScript型安全性

- MCP SDK の型定義を活用
- ChatGPT o3 API レスポンスの型定義を作成
- strict モードでの型チェック

## MCPサーバー固有の考慮事項

### ツール登録

サーバー起動時に利用可能なツールをMCPクライアントに公開：

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    searchTool,
    // その他のツール
  ]
}));
```

### リソース管理

必要に応じてMCPリソース（設定、状態等）を適切に管理：

```typescript
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    // リソース定義
  ]
}));
```

## 開発状況

🚧 **開発中** - MCPサーバーの基本実装を進行中

現在、基本的なプロジェクト構造と仕様書が作成済み。実装フェーズに向けてTypeScriptプロジェクトの初期化とMCP SDKの統合が必要。
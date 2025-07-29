# MCP O3 Search Server - 使用ガイド

## CursorやClaude Codeでの使用方法

### 1. Claude Codeでの使用

#### 設定方法（claude_desktop_config.json）
```json
{
  "mcpServers": {
    "mcp-o3-search": {
      "command": "node",
      "args": ["/path/to/mcp-o3-search-server/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-your-api-key-here"
      }
    }
  }
}
```

#### 実際の使用例
```
Claude: ChatGPT o3の検索機能が利用可能になりました。

User: TypeScript 5.5の新機能について検索して

Claude: ChatGPT o3で検索します...

[検索ツールを実行: chatgpt_o3_search]
Query: "TypeScript 5.5 new features"
Language: "ja"

検索結果：
1. TypeScript 5.5の主な新機能
   - 正規表現の型推論改善
   - デコレーターのメタデータAPI
   - ...
```

### 2. Cursorでの使用

#### 設定方法（.cursorrules または設定）
```json
{
  "features": {
    "mcp": {
      "servers": {
        "o3-search": {
          "command": "npx",
          "args": ["@your-org/mcp-o3-search"],
          "env": {
            "OPENAI_API_KEY": "${env:OPENAI_API_KEY}"
          }
        }
      }
    }
  }
}
```

#### 実際の使用例
```
// Cursorのチャット内で
User: @mcp 最新のReact 19の変更点を調べて

Cursor: MCP O3 Search を使用して検索します...

結果:
- React 19では新しいuseフックが追加
- Server Componentsの改善
- パフォーマンスの最適化
```

### 3. 具体的な使用シナリオ

#### シナリオ1: 技術調査
```typescript
// ユーザーがClaude Codeに質問
User: "Next.js 14のApp Routerのベストプラクティスを調べて"

// Claude CodeがMCPツールを自動的に使用
await callTool("chatgpt_o3_search", {
  query: "Next.js 14 App Router best practices",
  limit: 10,
  language: "ja",
  timeframe: "recent"
});

// 結果をもとに回答を生成
Claude: Next.js 14のApp Routerのベストプラクティスをまとめます：
1. ファイルベースルーティングの活用...
2. Server Componentsの適切な使用...
```

#### シナリオ2: エラー解決
```typescript
User: "TypeError: Cannot read property 'map' of undefined エラーの解決方法"

// MCPツールで関連情報を検索
await callTool("chatgpt_o3_search", {
  query: "TypeError Cannot read property map undefined React",
  limit: 5
});

Claude: このエラーの一般的な原因と解決方法：
1. 配列が初期化されていない場合...
2. APIレスポンスの遅延...
```

#### シナリオ3: 最新情報の取得
```typescript
User: "2024年のJavaScriptフレームワークのトレンド"

await callTool("chatgpt_o3_search", {
  query: "JavaScript framework trends 2024",
  timeframe: "recent",
  limit: 15
});

Claude: 2024年のJavaScriptフレームワークの最新トレンド：
- Viteの採用率が急増...
- Remixの人気上昇...
```

### 4. インストールと初期設定

#### グローバルインストール（推奨）
```bash
# npmでインストール
npm install -g @your-org/mcp-o3-search

# 環境変数設定
export OPENAI_API_KEY="sk-your-api-key"

# 動作確認
mcp-o3-search --version
```

#### プロジェクトローカルインストール
```bash
# プロジェクトディレクトリで
npm install @your-org/mcp-o3-search

# package.jsonにスクリプト追加
"scripts": {
  "mcp-server": "mcp-o3-search"
}
```

### 5. 高度な使用例

#### カスタム設定での起動
```bash
# 環境変数で詳細設定
OPENAI_API_KEY=sk-xxx \
OPENAI_MODEL=gpt-4-turbo \
TIMEOUT=60000 \
MAX_RETRIES=5 \
LOG_LEVEL=debug \
mcp-o3-search
```

#### プログラマティックな使用
```typescript
// 他のMCPサーバーと組み合わせて使用
import { MCPSearchServer } from '@your-org/mcp-o3-search';

const server = new MCPSearchServer({
  openaiKey: process.env.OPENAI_API_KEY,
  customConfig: {
    timeout: 60000,
    maxResults: 20
  }
});

await server.start();
```

### 6. トラブルシューティング

#### よくある問題と解決方法

1. **接続エラー**
```
Error: Failed to connect to MCP server
解決: パスと権限を確認
```

2. **認証エラー**
```
Error: Invalid API key
解決: OPENAI_API_KEYが正しく設定されているか確認
```

3. **タイムアウト**
```
Error: Search timeout
解決: TIMEOUT環境変数を増やす（例: 60000）
```

### 7. パラメータ詳細

#### chatgpt_o3_searchツールのパラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|------------|------|
| query | string | ✓ | - | 検索クエリ文字列 |
| limit | number | - | 10 | 返す結果の最大数（1-50） |
| language | string | - | "auto" | 結果の言語（ja, en等） |
| timeframe | string | - | - | 時間範囲フィルタ（recent, past_week, past_month, past_year） |

#### 環境変数

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|------------|------|
| OPENAI_API_KEY | ✓ | - | OpenAI APIキー |
| OPENAI_MODEL | - | "gpt-4-o3" | 使用するモデル |
| TIMEOUT | - | 30000 | タイムアウト時間（ミリ秒） |
| MAX_RETRIES | - | 3 | 最大リトライ回数 |
| LOG_LEVEL | - | "info" | ログレベル（debug, info, warn, error） |

### 8. ベストプラクティス

1. **APIキーの管理**
   - 環境変数で管理し、コードにハードコーディングしない
   - .envファイルを使用する場合は.gitignoreに追加

2. **エラーハンドリング**
   - タイムアウトは検索内容に応じて調整
   - ネットワークエラー時は自動リトライを活用

3. **パフォーマンス最適化**
   - 必要最小限の結果数を指定（limitパラメータ）
   - 時間範囲フィルタで検索範囲を絞る

4. **言語設定**
   - 日本語の結果が必要な場合は`language: "ja"`を明示的に指定
   - 多言語対応が必要な場合は"auto"を使用

このように、MCPサーバーは一度設定すれば、Claude CodeやCursorから自然な会話形式で高度な検索機能を利用できるようになります。
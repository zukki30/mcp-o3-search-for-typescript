# プロジェクト名変更計画

## 変更内容
`mcp-o3-search` → `mcp-openai-search`

## 変更理由
- ChatGPT 5など、o3以外のモデルもサポート
- より汎用的なOpenAI検索MCPとしての位置づけ
- 将来的なモデル追加に対応した命名

## 変更箇所チェックリスト

### 1. パッケージ設定
- [ ] `package.json` の name フィールド
- [ ] `package-lock.json` の再生成
- [ ] npmパッケージ名（公開時）

### 2. ドキュメント
- [ ] `README.md` のプロジェクト名
- [ ] `CLAUDE.md` の説明文
- [ ] `/docs/specs/` 内のフォルダ名とファイル内容
- [ ] 使用例のコマンド

### 3. コード内の参照
- [ ] ツール名 `chatgpt_o3_search` → `openai_search`
- [ ] ログメッセージ
- [ ] エラーメッセージ
- [ ] コメント

### 4. 設定ファイル
- [ ] `.gitignore`（必要に応じて）
- [ ] ESLint/Prettier設定（変更不要）
- [ ] TypeScript設定（変更不要）

### 5. テスト
- [ ] テストファイル内の名称
- [ ] テストの説明文

### 6. Git/GitHub
- [ ] リポジトリ名（オプション）
- [ ] GitHub Actionsの設定（将来的に）

## 実装手順

### Phase 1: パッケージ名変更
```bash
# package.json の編集
npm install # package-lock.json の再生成
```

### Phase 2: コード内の参照更新
```bash
# 一括置換（慎重に実行）
find . -type f -name "*.ts" -o -name "*.md" | xargs sed -i '' 's/mcp-o3-search/mcp-openai-search/g'
find . -type f -name "*.ts" -o -name "*.md" | xargs sed -i '' 's/chatgpt_o3_search/openai_search/g'
```

### Phase 3: ドキュメント更新
- README.mdの使用例を更新
- CLAUDE.mdのプロジェクト説明を更新

### Phase 4: テスト実行
```bash
npm test
npm run build
```

## 後方互換性の考慮

### 移行期間の対応
1. 旧名称でのインストールに対する警告メッセージ
2. ドキュメントでの移行ガイド提供
3. エイリアスパッケージの一時的な提供（オプション）

### ツール名のエイリアス
```typescript
// 旧名称もサポート（非推奨）
export const searchTool: Tool = {
  name: 'openai_search', // 新名称
  // aliases: ['chatgpt_o3_search'], // 将来的に削除
};
```

## 影響範囲

### 低影響
- 内部実装への影響は最小限
- 機能に変更なし

### 中影響
- ドキュメントの全面更新が必要
- ユーザーへの周知が必要

### 考慮事項
- npmパッケージとして公開済みの場合は慎重な移行計画が必要
- 既存ユーザーへの影響を最小限に
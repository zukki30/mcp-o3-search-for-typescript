import type { Tool } from '@modelcontextprotocol/sdk/types.js';

import type { SearchParams, SearchResult } from '../types/index.js';

export const searchTool: Tool = {
  name: 'chatgpt_o3_search',
  description: 'ChatGPT o3の検索機能を使用してWeb検索を実行します',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '検索クエリ文字列',
        minLength: 1,
        maxLength: 500,
      },
      limit: {
        type: 'number',
        description: '返す結果の最大数（1-50）',
        default: 10,
        minimum: 1,
        maximum: 50,
      },
      language: {
        type: 'string',
        description: '結果の言語コード（ja, en, auto等）',
        default: 'auto',
        pattern: '^(auto|ja|en|zh|ko|fr|de|es|it|pt|ru)$',
      },
      timeframe: {
        type: 'string',
        description: '検索結果の時間範囲フィルタ',
        enum: ['recent', 'past_week', 'past_month', 'past_year'],
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
};

export function validateSearchParams(args: unknown): SearchParams {
  if (!args || typeof args !== 'object') {
    throw new Error('検索パラメータは必須です');
  }

  const params = args as Record<string, unknown>;

  // クエリの検証
  if (!params.query || typeof params.query !== 'string') {
    throw new Error('検索クエリは必須の文字列です');
  }

  if (params.query.trim().length === 0) {
    throw new Error('検索クエリが空です');
  }

  if (params.query.length > 500) {
    throw new Error('検索クエリは500文字以内で入力してください');
  }

  // limitの検証
  let limit = 10;
  if (params.limit !== undefined) {
    if (typeof params.limit !== 'number') {
      throw new Error('limitは数値である必要があります');
    }
    if (params.limit < 1 || params.limit > 50) {
      throw new Error('limitは1から50の範囲で指定してください');
    }
    limit = Math.floor(params.limit);
  }

  // languageの検証
  let language = 'auto';
  if (params.language !== undefined) {
    if (typeof params.language !== 'string') {
      throw new Error('languageは文字列である必要があります');
    }
    const validLanguages = ['auto', 'ja', 'en', 'zh', 'ko', 'fr', 'de', 'es', 'it', 'pt', 'ru'];
    if (!validLanguages.includes(params.language)) {
      throw new Error(`languageは次のいずれかである必要があります: ${validLanguages.join(', ')}`);
    }
    language = params.language;
  }

  // timeframeの検証
  let timeframe: SearchParams['timeframe'];
  if (params.timeframe !== undefined) {
    if (typeof params.timeframe !== 'string') {
      throw new Error('timeframeは文字列である必要があります');
    }
    const validTimeframes = ['recent', 'past_week', 'past_month', 'past_year'];
    if (!validTimeframes.includes(params.timeframe)) {
      throw new Error(`timeframeは次のいずれかである必要があります: ${validTimeframes.join(', ')}`);
    }
    timeframe = params.timeframe as SearchParams['timeframe'];
  }

  return {
    query: params.query.trim(),
    limit,
    language,
    timeframe,
  };
}

export function formatSearchResults(results: SearchResult[]): {
  content: Array<{ type: string; text: string }>;
} {
  if (!results || results.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: '検索結果が見つかりませんでした。',
        },
      ],
    };
  }

  const formattedResults = results
    .map((result, index) => {
      const parts = [
        `${index + 1}. **${result.title}**`,
        `   URL: ${result.url}`,
        `   概要: ${result.snippet}`,
      ];

      if (result.publishedDate) {
        parts.push(`   公開日: ${result.publishedDate}`);
      }

      if (result.relevanceScore !== undefined) {
        parts.push(`   関連度: ${(result.relevanceScore * 100).toFixed(1)}%`);
      }

      return parts.join('\n');
    })
    .join('\n\n');

  const summary = `検索結果: ${results.length}件\n\n${formattedResults}`;

  return {
    content: [
      {
        type: 'text',
        text: summary,
      },
    ],
  };
}

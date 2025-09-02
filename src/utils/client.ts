import OpenAI from 'openai';

import config from '../config.js';
import type {
  ChatGPTSearchQuery,
  ChatGPTSearchResponse,
  UsageInfo,
  CostInfo,
} from '../types/index.js';
import { AuthError, NetworkError, RateLimitError, TimeoutError } from '../types/index.js';

import { calculateCost } from './cost-calculator.js';
import { createLogger } from './logger.js';

const logger = createLogger('OpenAIClient');

export interface OpenAIClient {
  search: (query: ChatGPTSearchQuery) => Promise<ChatGPTSearchResponse>;
}

function createSearchPrompt(query: ChatGPTSearchQuery): string {
  const searchRequest = {
    action: 'web_search',
    query: query.query,
    max_results: query.maxResults,
    filters: query.filters,
  };

  return `以下の検索リクエストを実行し、結果を構造化されたJSON形式で返してください：

${JSON.stringify(searchRequest, null, 2)}

期待する応答形式：
{
  "results": [
    {
      "title": "記事のタイトル",
      "url": "https://example.com/article",
      "description": "記事の概要・説明",
      "date": "2024-01-01",
      "score": 0.95
    }
  ],
  "totalCount": 10
}`;
}

function parseSearchResponse(
  response: OpenAI.Chat.Completions.ChatCompletion,
): ChatGPTSearchResponse {
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('検索レスポンスが空です');
  }

  // JSON部分を抽出
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('有効なJSON形式の応答が見つかりません');
  }

  const parsedResponse = JSON.parse(jsonMatch[0]) as ChatGPTSearchResponse;

  // 基本的な構造検証
  if (!parsedResponse.results || !Array.isArray(parsedResponse.results)) {
    throw new Error('無効な検索結果形式です');
  }

  // 各結果の必須フィールドを検証
  parsedResponse.results.forEach((result, index) => {
    if (!result.title || !result.url) {
      logger.warn(`検索結果 ${index} に必須フィールドが不足しています`, { result });
    }
  });

  // コスト情報を計算（usage情報がある場合）
  let costInfo: CostInfo | undefined;
  if (response.usage) {
    const usage: UsageInfo = {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    };
    const calculatedCost = calculateCost(response.model, usage);
    costInfo = calculatedCost;

    logger.debug('コスト情報を計算しました', {
      model: response.model,
      usage,
      cost: calculatedCost.cost,
    });
  }

  return {
    results: parsedResponse.results,
    totalCount: parsedResponse.totalCount || parsedResponse.results.length,
    cost: costInfo,
  };
}

function handleOpenAIError(error: unknown): never {
  // OpenAI.APIErrorまたはAPIErrorの特徴を持つエラーオブジェクトをチェック
  const isAPIError =
    error instanceof OpenAI.APIError ||
    (error instanceof Error &&
      'status' in error &&
      typeof (error as Record<string, unknown>).status === 'number' &&
      (error.name === 'APIError' ||
        error.constructor.name === 'APIError' ||
        error.constructor.name === 'MockAPIError'));

  if (isAPIError) {
    const apiError = error as {
      status: number;
      message: string;
      type?: string;
      headers?: Record<string, string>;
    };

    logger.error('OpenAI API エラー', {
      status: Number(apiError.status),
      message: String(apiError.message),
      type: String(apiError.type || 'unknown'),
    });

    if (apiError.status === 401) {
      throw new AuthError('OpenAI APIキーが無効です。OPENAI_API_KEYを確認してください。');
    }

    if (apiError.status === 429) {
      const headers = apiError.headers;
      const retryAfterHeader = headers?.['retry-after'];
      const retrySeconds =
        typeof retryAfterHeader === 'string' ? parseInt(retryAfterHeader, 10) : 60;
      throw new RateLimitError('OpenAI APIのレート制限に達しました。', retrySeconds);
    }

    if (apiError.status >= 500) {
      throw new NetworkError('OpenAI APIサーバーエラーが発生しました。', error);
    }

    throw new NetworkError(`OpenAI API エラー: ${apiError.message}`, error);
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      throw new TimeoutError(
        `リクエストがタイムアウトしました (${config.timeout}ms)`,
        config.timeout,
      );
    }

    if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
      throw new NetworkError('ネットワーク接続エラーが発生しました。', error);
    }
  }

  throw new NetworkError('予期しないエラーが発生しました。', error);
}

export function createOpenAIClient(): OpenAIClient {
  logger.debug('Creating OpenAI client', {
    model: config.model,
    timeout: config.timeout,
  });

  const openai = new OpenAI({
    apiKey: config.openaiKey,
    timeout: config.timeout,
  });

  return {
    async search(query: ChatGPTSearchQuery): Promise<ChatGPTSearchResponse> {
      logger.info('Executing OpenAI search request', {
        query: query.query,
        maxResults: query.maxResults,
        filters: query.filters,
      });

      try {
        const prompt = createSearchPrompt(query);
        logger.debug('Generated search prompt', { promptLength: prompt.length });

        const response = await openai.chat.completions.create({
          model: config.model,
          messages: [
            {
              role: 'system',
              content:
                'あなたは高精度なWeb検索アシスタントです。ユーザーのクエリに基づいて最新かつ関連性の高い情報を検索し、構造化されたJSON形式で結果を返してください。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 4000,
        });

        logger.debug('Received OpenAI response', {
          usage: response.usage,
          model: response.model,
        });

        try {
          return parseSearchResponse(response);
        } catch (parseError) {
          logger.error('検索レスポンスの解析に失敗しました', parseError);
          throw new Error(
            `検索レスポンスの解析エラー: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          );
        }
      } catch (error) {
        // parseSearchResponseのエラーは既に上でキャッチしているため、ここではOpenAI APIのエラーのみ処理
        if (error instanceof Error && error.message.includes('検索レスポンスの解析エラー')) {
          throw error; // 解析エラーはそのまま再スロー
        }
        handleOpenAIError(error);
      }
    },
  };
}

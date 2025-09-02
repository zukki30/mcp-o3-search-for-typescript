import type { UsageInfo, CostInfo } from '../types/index.js';

/**
 * OpenAIモデルの料金体系（USD per 1M tokens）
 * 2024年12月時点の料金体系
 */
export const MODEL_PRICING = {
  'gpt-4o': {
    input: 2.5, // $2.5 per 1M input tokens
    output: 10.0, // $10 per 1M output tokens
  },
  'gpt-4o-mini': {
    input: 0.15, // $0.15 per 1M input tokens
    output: 0.6, // $0.6 per 1M output tokens
  },
  'gpt-4-turbo': {
    input: 10.0, // $10 per 1M input tokens
    output: 30.0, // $30 per 1M output tokens
  },
  'gpt-4': {
    input: 30.0, // $30 per 1M input tokens
    output: 60.0, // $60 per 1M output tokens
  },
  'gpt-3.5-turbo': {
    input: 0.5, // $0.5 per 1M input tokens
    output: 1.5, // $1.5 per 1M output tokens
  },
  // 新モデル対応（推定価格）
  'gpt-4-o3': {
    input: 3.0, // 推定価格
    output: 12.0, // 推定価格
  },
  'gpt-5': {
    input: 5.0, // 推定価格
    output: 15.0, // 推定価格
  },
} as const;

export type SupportedModel = keyof typeof MODEL_PRICING;

/**
 * 使用モデルがサポート対象かチェック
 */
export function isSupportedModel(model: string): model is SupportedModel {
  return model in MODEL_PRICING;
}

/**
 * 最も近いモデル名を推測（マッピング）
 */
export function guessModelFromName(model: string): SupportedModel {
  const lowerModel = model.toLowerCase();

  if (lowerModel.includes('gpt-4o-mini')) return 'gpt-4o-mini';
  if (lowerModel.includes('gpt-4o')) return 'gpt-4o';
  if (lowerModel.includes('gpt-4-turbo')) return 'gpt-4-turbo';
  if (lowerModel.includes('gpt-4-o3') || lowerModel.includes('o3')) return 'gpt-4-o3';
  if (lowerModel.includes('gpt-5')) return 'gpt-5';
  if (lowerModel.includes('gpt-4')) return 'gpt-4';
  if (lowerModel.includes('gpt-3.5') || lowerModel.includes('turbo')) return 'gpt-3.5-turbo';

  // デフォルトは gpt-4o
  return 'gpt-4o';
}

/**
 * コスト情報を計算
 */
export function calculateCost(model: string, usage: UsageInfo): CostInfo {
  const supportedModel = isSupportedModel(model) ? model : guessModelFromName(model);
  const pricing = MODEL_PRICING[supportedModel];

  // 1Mトークンあたりの料金から実際のトークン数での料金を計算
  const inputCost = (usage.promptTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.completionTokens / 1_000_000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    model: supportedModel,
    usage,
    cost: {
      inputCost: Number(inputCost.toFixed(6)),
      outputCost: Number(outputCost.toFixed(6)),
      totalCost: Number(totalCost.toFixed(6)),
    },
    currency: 'USD',
  };
}

/**
 * コスト情報を人間が読みやすい形式でフォーマット
 */
export function formatCostInfo(costInfo: CostInfo): string {
  const { model, usage, cost } = costInfo;

  return [
    `Model: ${model}`,
    `Tokens: ${usage.promptTokens} input + ${usage.completionTokens} output = ${usage.totalTokens} total`,
    `Cost: $${cost.inputCost.toFixed(6)} (input) + $${cost.outputCost.toFixed(6)} (output) = $${cost.totalCost.toFixed(6)} total`,
  ].join(' | ');
}

/**
 * 複数のコスト情報を集計
 */
export function aggregateCosts(costs: CostInfo[]): CostInfo | null {
  if (costs.length === 0) return null;

  const firstCost = costs[0]!;
  if (costs.length === 1) return firstCost;

  // 全て同じモデルの場合のみ集計
  const sameModel = costs.every((c) => c.model === firstCost.model);
  if (!sameModel) {
    // 異なるモデルの場合は最後のものを返す
    return costs[costs.length - 1]!;
  }

  const totalUsage = costs.reduce(
    (acc, cost) => ({
      promptTokens: acc.promptTokens + cost.usage.promptTokens,
      completionTokens: acc.completionTokens + cost.usage.completionTokens,
      totalTokens: acc.totalTokens + cost.usage.totalTokens,
    }),
    { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  );

  const totalCost = costs.reduce(
    (acc, cost) => ({
      inputCost: acc.inputCost + cost.cost.inputCost,
      outputCost: acc.outputCost + cost.cost.outputCost,
      totalCost: acc.totalCost + cost.cost.totalCost,
    }),
    { inputCost: 0, outputCost: 0, totalCost: 0 },
  );

  return {
    model: firstCost.model,
    usage: totalUsage,
    cost: {
      inputCost: Number(totalCost.inputCost.toFixed(6)),
      outputCost: Number(totalCost.outputCost.toFixed(6)),
      totalCost: Number(totalCost.totalCost.toFixed(6)),
    },
    currency: firstCost.currency,
  };
}

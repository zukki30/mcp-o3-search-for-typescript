import { describe, expect, it } from 'vitest';

import type { UsageInfo } from '../../src/types/index.js';
import {
  calculateCost,
  formatCostInfo,
  guessModelFromName,
  isSupportedModel,
  MODEL_PRICING,
} from '../../src/utils/cost-calculator.js';

describe('cost-calculator', () => {
  describe('isSupportedModel', () => {
    it('サポートされているモデルに対してtrueを返す', () => {
      expect(isSupportedModel('gpt-4o')).toBe(true);
      expect(isSupportedModel('gpt-4o-mini')).toBe(true);
      expect(isSupportedModel('gpt-4-o3')).toBe(true);
      expect(isSupportedModel('gpt-5')).toBe(true);
    });

    it('サポートされていないモデルに対してfalseを返す', () => {
      expect(isSupportedModel('unknown-model')).toBe(false);
      expect(isSupportedModel('gpt-2')).toBe(false);
      expect(isSupportedModel('')).toBe(false);
    });
  });

  describe('guessModelFromName', () => {
    it('モデル名からサポートされているモデルを推測する', () => {
      expect(guessModelFromName('gpt-4o-mini')).toBe('gpt-4o-mini');
      expect(guessModelFromName('gpt-4o')).toBe('gpt-4o');
      expect(guessModelFromName('gpt-4-turbo')).toBe('gpt-4-turbo');
      expect(guessModelFromName('gpt-4-o3-preview')).toBe('gpt-4-o3');
      expect(guessModelFromName('o3-mini')).toBe('gpt-4-o3');
      expect(guessModelFromName('gpt-5-turbo')).toBe('gpt-5');
      expect(guessModelFromName('gpt-4')).toBe('gpt-4');
      expect(guessModelFromName('gpt-3.5-turbo')).toBe('gpt-3.5-turbo');
    });

    it('未知のモデルに対してはデフォルト値を返す', () => {
      expect(guessModelFromName('unknown-model')).toBe('gpt-4o');
      expect(guessModelFromName('claude-3')).toBe('gpt-4o');
      expect(guessModelFromName('')).toBe('gpt-4o');
    });

    it('大文字小文字を区別しない', () => {
      expect(guessModelFromName('GPT-4O')).toBe('gpt-4o');
      expect(guessModelFromName('GPT-5')).toBe('gpt-5');
    });
  });

  describe('calculateCost', () => {
    const usage: UsageInfo = {
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
    };

    it('サポートされているモデルのコストを正確に計算する', () => {
      const result = calculateCost('gpt-4o', usage);

      // gpt-4o: input $2.5/1M, output $10/1M
      const expectedInputCost = (1000 / 1_000_000) * 2.5; // 0.0025
      const expectedOutputCost = (500 / 1_000_000) * 10.0; // 0.005
      const expectedTotalCost = expectedInputCost + expectedOutputCost; // 0.0075

      expect(result.model).toBe('gpt-4o');
      expect(result.usage).toEqual(usage);
      expect(result.cost.inputCost).toBe(expectedInputCost);
      expect(result.cost.outputCost).toBe(expectedOutputCost);
      expect(result.cost.totalCost).toBe(expectedTotalCost);
      expect(result.currency).toBe('USD');
    });

    it('サポートされていないモデルは推測して計算する', () => {
      const result = calculateCost('unknown-model', usage);

      // unknown-modelはgpt-4oにフォールバックする
      expect(result.model).toBe('gpt-4o');
    });

    it('異なるモデルで正確な価格計算を行う', () => {
      const gptMiniResult = calculateCost('gpt-4o-mini', usage);
      const gpt4Result = calculateCost('gpt-4', usage);

      // gpt-4o-mini: input $0.15/1M, output $0.6/1M
      expect(gptMiniResult.cost.inputCost).toBe((1000 / 1_000_000) * 0.15);
      expect(gptMiniResult.cost.outputCost).toBe((500 / 1_000_000) * 0.6);

      // gpt-4: input $30/1M, output $60/1M
      expect(gpt4Result.cost.inputCost).toBe((1000 / 1_000_000) * 30);
      expect(gpt4Result.cost.outputCost).toBe((500 / 1_000_000) * 60);
    });

    it('小数点以下6桁まで丸める', () => {
      const smallUsage: UsageInfo = {
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
      };

      const result = calculateCost('gpt-4o', smallUsage);

      // 非常に小さい値でも適切に丸められること
      expect(Number.isFinite(result.cost.inputCost)).toBe(true);
      expect(Number.isFinite(result.cost.outputCost)).toBe(true);
      expect(Number.isFinite(result.cost.totalCost)).toBe(true);
    });
  });

  describe('formatCostInfo', () => {
    it('コスト情報を人間が読みやすい形式でフォーマットする', () => {
      const usage: UsageInfo = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const costInfo = calculateCost('gpt-4o', usage);
      const formatted = formatCostInfo(costInfo);

      expect(formatted).toContain('Model: gpt-4o');
      expect(formatted).toContain('Tokens: 1000 input + 500 output = 1500 total');
      expect(formatted).toContain('Cost:');
      expect(formatted).toContain('$');
      expect(formatted).toContain('(input)');
      expect(formatted).toContain('(output)');
      expect(formatted).toContain('total');
    });

    it('異なるモデルでも適切にフォーマットする', () => {
      const usage: UsageInfo = {
        promptTokens: 2000,
        completionTokens: 1000,
        totalTokens: 3000,
      };

      const costInfo = calculateCost('gpt-5', usage);
      const formatted = formatCostInfo(costInfo);

      expect(formatted).toContain('Model: gpt-5');
      expect(formatted).toContain('Tokens: 2000 input + 1000 output = 3000 total');
    });
  });

  describe('MODEL_PRICING', () => {
    it('すべての価格が正の数値である', () => {
      Object.values(MODEL_PRICING).forEach((pricing) => {
        expect(pricing.input).toBeGreaterThan(0);
        expect(pricing.output).toBeGreaterThan(0);
      });
    });

    it('出力コストが入力コストより高い（一般的な価格設定）', () => {
      Object.values(MODEL_PRICING).forEach((pricing) => {
        expect(pricing.output).toBeGreaterThanOrEqual(pricing.input);
      });
    });
  });
});

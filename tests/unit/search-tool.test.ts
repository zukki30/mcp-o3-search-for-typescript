import { describe, it, expect } from 'vitest';

import { validateSearchParams, formatSearchResults } from '../../src/tools/search.js';
import type { SearchResult } from '../../src/types/index.js';

describe('validateSearchParams', () => {
  describe('正常ケース', () => {
    it('最小限のパラメータで検証が成功する', () => {
      const args = { query: 'test query' };
      const result = validateSearchParams(args);

      expect(result).toEqual({
        query: 'test query',
        limit: 10,
        language: 'auto',
        timeframe: undefined,
      });
    });

    it('すべてのパラメータが設定されている場合', () => {
      const args = {
        query: '  検索クエリ  ',
        limit: 20,
        language: 'ja',
        timeframe: 'past_week',
      };
      const result = validateSearchParams(args);

      expect(result).toEqual({
        query: '検索クエリ',
        limit: 20,
        language: 'ja',
        timeframe: 'past_week',
      });
    });

    it('limitが小数点の場合は整数に丸められる', () => {
      const args = { query: 'test', limit: 15.7 };
      const result = validateSearchParams(args);

      expect(result.limit).toBe(15);
    });
  });

  describe('エラーケース', () => {
    it('引数がundefinedの場合はエラー', () => {
      expect(() => validateSearchParams(undefined)).toThrow('検索パラメータは必須です');
    });

    it('引数がnullの場合はエラー', () => {
      expect(() => validateSearchParams(null)).toThrow('検索パラメータは必須です');
    });

    it('引数がオブジェクトでない場合はエラー', () => {
      expect(() => validateSearchParams('string')).toThrow('検索パラメータは必須です');
    });

    it('queryが存在しない場合はエラー', () => {
      expect(() => validateSearchParams({})).toThrow('検索クエリは必須の文字列です');
    });

    it('queryが文字列でない場合はエラー', () => {
      expect(() => validateSearchParams({ query: 123 })).toThrow('検索クエリは必須の文字列です');
    });

    it('queryが空文字の場合はエラー', () => {
      expect(() => validateSearchParams({ query: '' })).toThrow('検索クエリは必須の文字列です');
    });

    it('queryが空白のみの場合はエラー', () => {
      expect(() => validateSearchParams({ query: '   ' })).toThrow('検索クエリが空です');
    });

    it('queryが500文字を超える場合はエラー', () => {
      const longQuery = 'a'.repeat(501);
      expect(() => validateSearchParams({ query: longQuery })).toThrow(
        '検索クエリは500文字以内で入力してください',
      );
    });

    it('limitが数値でない場合はエラー', () => {
      expect(() => validateSearchParams({ query: 'test', limit: 'ten' })).toThrow(
        'limitは数値である必要があります',
      );
    });

    it('limitが1未満の場合はエラー', () => {
      expect(() => validateSearchParams({ query: 'test', limit: 0 })).toThrow(
        'limitは1から50の範囲で指定してください',
      );
    });

    it('limitが50を超える場合はエラー', () => {
      expect(() => validateSearchParams({ query: 'test', limit: 51 })).toThrow(
        'limitは1から50の範囲で指定してください',
      );
    });

    it('languageが文字列でない場合はエラー', () => {
      expect(() => validateSearchParams({ query: 'test', language: 123 })).toThrow(
        'languageは文字列である必要があります',
      );
    });

    it('languageが無効な値の場合はエラー', () => {
      expect(() => validateSearchParams({ query: 'test', language: 'invalid' })).toThrow(
        'languageは次のいずれかである必要があります',
      );
    });

    it('timeframeが文字列でない場合はエラー', () => {
      expect(() => validateSearchParams({ query: 'test', timeframe: 123 })).toThrow(
        'timeframeは文字列である必要があります',
      );
    });

    it('timeframeが無効な値の場合はエラー', () => {
      expect(() => validateSearchParams({ query: 'test', timeframe: 'invalid' })).toThrow(
        'timeframeは次のいずれかである必要があります',
      );
    });
  });
});

describe('formatSearchResults', () => {
  it('結果が空の場合は適切なメッセージを返す', () => {
    const result = formatSearchResults([]);
    expect(result.content[0]?.text).toBe('検索結果が見つかりませんでした。');
  });

  it('nullが渡された場合は適切なメッセージを返す', () => {
    const result = formatSearchResults(null as unknown as SearchResult[]);
    expect(result.content[0]?.text).toBe('検索結果が見つかりませんでした。');
  });

  it('単一の検索結果を正しくフォーマットする', () => {
    const results: SearchResult[] = [
      {
        title: 'テスト記事',
        url: 'https://example.com/test',
        snippet: 'これはテスト記事の概要です。',
        publishedDate: '2024-01-01',
        relevanceScore: 0.95,
      },
    ];

    const formatted = formatSearchResults(results);
    const text = formatted.content[0]?.text || '';

    expect(text).toContain('検索結果: 1件');
    expect(text).toContain('1. **テスト記事**');
    expect(text).toContain('URL: https://example.com/test');
    expect(text).toContain('概要: これはテスト記事の概要です。');
    expect(text).toContain('公開日: 2024-01-01');
    expect(text).toContain('関連度: 95.0%');
  });

  it('複数の検索結果を正しくフォーマットする', () => {
    const results: SearchResult[] = [
      {
        title: '記事1',
        url: 'https://example.com/1',
        snippet: '概要1',
      },
      {
        title: '記事2',
        url: 'https://example.com/2',
        snippet: '概要2',
        publishedDate: '2024-01-02',
      },
    ];

    const formatted = formatSearchResults(results);
    const text = formatted.content[0]?.text || '';

    expect(text).toContain('検索結果: 2件');
    expect(text).toContain('1. **記事1**');
    expect(text).toContain('2. **記事2**');
    expect(text).toContain('URL: https://example.com/1');
    expect(text).toContain('URL: https://example.com/2');
  });

  it('オプションフィールドが存在しない場合は表示されない', () => {
    const results: SearchResult[] = [
      {
        title: 'シンプル記事',
        url: 'https://example.com/simple',
        snippet: 'シンプルな概要',
      },
    ];

    const formatted = formatSearchResults(results);
    const text = formatted.content[0]?.text || '';

    expect(text).not.toContain('公開日:');
    expect(text).not.toContain('関連度:');
    expect(text).toContain('概要: シンプルな概要');
  });
});

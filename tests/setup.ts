import { beforeAll, afterAll, beforeEach, vi } from 'vitest';

// テスト環境の設定
process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

// グローバルなタイムアウト設定
beforeAll(() => {
  // 必要に応じてグローバルなセットアップを行う
  console.log('Starting test suite...');
});

afterAll(() => {
  // 必要に応じてクリーンアップを行う
  console.log('Test suite completed.');
});

beforeEach(() => {
  // 各テストの前にモックをリセット
  vi.clearAllMocks();
});

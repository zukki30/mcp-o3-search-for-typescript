// テスト用の環境変数設定
process.env.OPENAI_API_KEY = 'sk-test-key-for-testing';
process.env.OPENAI_MODEL = 'gpt-4-o3';
process.env.TIMEOUT = '30000';
process.env.MAX_RETRIES = '3';
process.env.LOG_LEVEL = 'error'; // テスト時はログを抑制

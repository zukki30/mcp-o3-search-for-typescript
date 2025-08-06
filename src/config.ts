import path from 'path';

import dotenv from 'dotenv';

import type { ServerConfig } from './types/index.js';

// 環境に応じて設定ファイルを読み込む
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// デフォルトの.envも読み込む（存在する場合）
dotenv.config();

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value || defaultValue!;
}

function getEnvNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return parsed;
}

export const config: ServerConfig & { nodeEnv: string; testMode: boolean } = {
  openaiKey: getEnvVar('OPENAI_API_KEY', process.env.NODE_ENV === 'test' ? 'test_api_key' : ''),
  model: getEnvVar('OPENAI_MODEL', 'gpt-4-o3'),
  timeout: getEnvNumber('SERVER_TIMEOUT', 30000),
  maxRetries: getEnvNumber('SERVER_MAX_RETRIES', 3),
  logLevel: getEnvVar('LOG_LEVEL', 'info'),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  testMode: process.env.TEST_MODE === 'true',
};

export default config;

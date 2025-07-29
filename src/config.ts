import dotenv from 'dotenv';

import type { ServerConfig } from './types/index.js';

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

export const config: ServerConfig = {
  openaiKey: getEnvVar('OPENAI_API_KEY'),
  model: getEnvVar('OPENAI_MODEL', 'gpt-4-o3'),
  timeout: getEnvNumber('TIMEOUT', 30000),
  maxRetries: getEnvNumber('MAX_RETRIES', 3),
  logLevel: getEnvVar('LOG_LEVEL', 'info'),
};

export default config;

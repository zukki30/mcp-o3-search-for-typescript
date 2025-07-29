import config from '../config.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const logLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function shouldLog(level: LogLevel, currentLevel: LogLevel): boolean {
  const currentLevelIndex = logLevels.indexOf(currentLevel);
  const messageLevelIndex = logLevels.indexOf(level);
  return messageLevelIndex >= currentLevelIndex;
}

function formatMessage(context: string, level: LogLevel, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;

  if (data) {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    return `${prefix} ${message}\n${dataStr}`;
  }

  return `${prefix} ${message}`;
}

export interface Logger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, error?: unknown) => void;
}

export function createLogger(context: string): Logger {
  const logLevel = config.logLevel as LogLevel;

  return {
    debug: (message: string, data?: unknown): void => {
      if (shouldLog('debug', logLevel)) {
        console.log(formatMessage(context, 'debug', message, data));
      }
    },

    info: (message: string, data?: unknown): void => {
      if (shouldLog('info', logLevel)) {
        console.log(formatMessage(context, 'info', message, data));
      }
    },

    warn: (message: string, data?: unknown): void => {
      if (shouldLog('warn', logLevel)) {
        console.warn(formatMessage(context, 'warn', message, data));
      }
    },

    error: (message: string, error?: unknown): void => {
      if (shouldLog('error', logLevel)) {
        const errorData =
          error instanceof Error
            ? { message: error.message, stack: error.stack, name: error.name }
            : error;
        console.error(formatMessage(context, 'error', message, errorData));
      }
    },
  };
}

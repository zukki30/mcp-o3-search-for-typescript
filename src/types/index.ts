export interface SearchParams {
  query: string;
  limit?: number;
  language?: string;
  timeframe?: 'recent' | 'past_week' | 'past_month' | 'past_year';
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  relevanceScore?: number;
}

export interface ChatGPTSearchQuery {
  query: string;
  filters: {
    language?: string;
    timeframe?: string;
  };
  maxResults: number;
}

export interface ChatGPTSearchResponse {
  results: Array<{
    title: string;
    url: string;
    description: string;
    date?: string;
    score?: number;
  }>;
  totalCount: number;
}

export interface MCPErrorResponse {
  error: {
    code: number;
    message: string;
    data?: {
      details: string;
      retryAfter?: number;
    };
  };
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
}

export interface ServerConfig {
  openaiKey: string;
  model: string;
  timeout: number;
  maxRetries: number;
  logLevel: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class SearchError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SearchError';
    this.cause = cause;
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeoutMs: number,
  ) {
    super(message);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

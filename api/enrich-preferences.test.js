/* eslint-disable no-undef */
import { jest } from '@jest/globals';
import { fetchWithRetry } from './enrich-preferences.js';

global.fetch = jest.fn();

global.AbortController = class {
  constructor() {
    this.signal = {};
    this.abort = jest.fn();
  }
};

process.env.OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

describe('AI Robustness: fetchWithRetry', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should return response immediately on success', async () => {
    fetch.mockResolvedValueOnce({ status: 200, ok: true });

    const promise = fetchWithRetry(process.env.OPENAI_API_URL, {});
    jest.runAllTimers();
    const result = await promise;

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(200);
  });

  it('should retry on 502/503 and eventually succeed', async () => {
    fetch
      .mockResolvedValueOnce({ status: 502, ok: false })
      .mockResolvedValueOnce({ status: 503, ok: false })
      .mockResolvedValueOnce({ status: 200, ok: true });

    const promise = fetchWithRetry(process.env.OPENAI_API_URL, {}, 3, 10);
    jest.runAllTimers();
    const result = await promise;

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(result.status).toBe(200);
  });

  it('should throw after exhausting retries on 502', async () => {
    fetch.mockResolvedValue({ status: 502, ok: false });

    const promise = fetchWithRetry(process.env.OPENAI_API_URL, {}, 2, 10);
    jest.runAllTimers();

    await expect(promise).rejects.toThrow(
      'AI Enrichment fetch failed with status 502'
    );
  });

  it('should retry on network failure and eventually succeed', async () => {
    const networkError = new Error('Network failure');
    networkError.name = 'FetchError'; 

    fetch
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({ status: 200, ok: true });

    const promise = fetchWithRetry(process.env.OPENAI_API_URL, {}, 3, 10);
    jest.runAllTimers();
    const result = await promise;

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(200);
  });

  it('should throw after exhausting retries on network failure', async () => {
    const networkError = new Error('Network failure');
    networkError.name = 'FetchError'; 

    fetch.mockRejectedValue(networkError);

    const promise = fetchWithRetry(process.env.OPENAI_API_URL, {}, 2, 10);
    jest.runAllTimers();

    await expect(promise).rejects.toThrow(
      'AI Enrichment fetch failed after maximum retries'
    );
  });

  it('should not retry on non-retryable status codes', async () => {
    fetch.mockResolvedValueOnce({ status: 400, ok: false });

    const promise = fetchWithRetry(process.env.OPENAI_API_URL, {}, 3, 10);
    jest.runAllTimers();
    const result = await promise;

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(400);
  });
});
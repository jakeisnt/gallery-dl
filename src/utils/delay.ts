/**
 * Delay and rate limiting utilities
 */

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random delay between min and max milliseconds
 */
export function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep for a random duration between min and max milliseconds
 */
export function randomSleep(min: number, max: number): Promise<void> {
  return sleep(randomDelay(min, max));
}

/**
 * Create a rate limiter that ensures minimum delay between calls
 */
export function createRateLimiter(minDelayMs: number) {
  let lastCall = 0;

  return async function rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastCall;

    if (elapsed < minDelayMs) {
      await sleep(minDelayMs - elapsed);
    }

    lastCall = Date.now();
  };
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        await sleep(delay);
        delay = Math.min(delay * backoffMultiplier, maxDelayMs);
      }
    }
  }

  throw lastError;
}

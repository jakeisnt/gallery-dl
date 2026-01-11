/**
 * Custom error classes for Instagram API
 */

export class InstagramApiError extends Error {
  constructor(
    public statusCode: number,
    public responseText: string,
    message?: string
  ) {
    super(message || `Instagram API error: ${statusCode}`);
    this.name = 'InstagramApiError';
  }
}

export class RateLimitError extends InstagramApiError {
  constructor(responseText: string) {
    super(429, responseText, 'Rate limit exceeded. Please wait before trying again.');
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends InstagramApiError {
  constructor(statusCode: number, responseText: string) {
    super(statusCode, responseText, 'Authentication failed. Please log in to Instagram.');
    this.name = 'AuthenticationError';
  }
}

export class PrivateAccountError extends InstagramApiError {
  constructor() {
    super(403, '', 'This account is private. You must follow them to view their content.');
    this.name = 'PrivateAccountError';
  }
}

export class NotFoundError extends InstagramApiError {
  constructor(responseText: string) {
    super(404, responseText, 'Content not found. It may have been deleted.');
    this.name = 'NotFoundError';
  }
}

export class ChallengeRequiredError extends InstagramApiError {
  constructor() {
    super(403, '', 'Instagram requires verification. Please complete the challenge in your browser.');
    this.name = 'ChallengeRequiredError';
  }
}

/**
 * Parse an API error response and return the appropriate error type
 */
export function parseApiError(status: number, responseText: string): InstagramApiError {
  // Check for rate limiting
  if (status === 429) {
    return new RateLimitError(responseText);
  }

  // Check for authentication issues
  if (status === 401 || status === 403) {
    // Check for challenge redirect
    if (responseText.includes('challenge') || responseText.includes('checkpoint')) {
      return new ChallengeRequiredError();
    }
    return new AuthenticationError(status, responseText);
  }

  // Check for not found
  if (status === 404) {
    return new NotFoundError(responseText);
  }

  // Generic error
  return new InstagramApiError(status, responseText);
}

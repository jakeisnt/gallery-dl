/**
 * Performance benchmarks for Are.na client
 */

import { describe, bench } from 'vitest';

// Simulate URL validation (same logic as arena-client.ts)
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Simulate slug validation
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/i.test(slug) && slug.length > 0 && slug.length <= 255;
}

describe('URL Validation Benchmarks', () => {
  const validUrls = [
    'https://example.com/image.jpg',
    'https://www.instagram.com/p/test-post/',
    'https://scontent.cdninstagram.com/v/t51.2885-15/image.jpg',
    'http://localhost:3000/test.png',
    'https://cdn.example.com/path/to/deep/nested/image.webp',
  ];

  const invalidUrls = [
    'not-a-url',
    'ftp://example.com/file',
    'javascript:alert(1)',
    'data:image/png;base64,abc',
    '',
  ];

  bench('validate valid URLs', () => {
    for (const url of validUrls) {
      isValidUrl(url);
    }
  });

  bench('validate invalid URLs', () => {
    for (const url of invalidUrls) {
      isValidUrl(url);
    }
  });

  bench('single URL validation', () => {
    isValidUrl('https://example.com/image.jpg');
  });
});

describe('Slug Validation Benchmarks', () => {
  const validSlugs = [
    'my-channel',
    'art-gallery',
    'design-2024',
    'a',
    'a-very-long-slug-name-that-is-still-valid',
  ];

  const invalidSlugs = [
    'has spaces',
    'has_underscores',
    'has.dots',
    '',
    'a'.repeat(300),
  ];

  bench('validate valid slugs', () => {
    for (const slug of validSlugs) {
      isValidSlug(slug);
    }
  });

  bench('validate invalid slugs', () => {
    for (const slug of invalidSlugs) {
      isValidSlug(slug);
    }
  });

  bench('single slug validation', () => {
    isValidSlug('my-channel');
  });
});

describe('Error Parsing Benchmarks', () => {
  const errorMessages = [
    '401 Unauthorized',
    '403 Forbidden',
    '404 Not Found',
    '429 Too Many Requests',
    '500 Internal Server Error',
    'Network error: Failed to fetch',
  ];

  function parseErrorMessage(message: string): { code?: number; retryable: boolean } {
    const msg = message.toLowerCase();

    if (msg.includes('401') || msg.includes('unauthorized')) {
      return { code: 401, retryable: false };
    }
    if (msg.includes('403') || msg.includes('forbidden')) {
      return { code: 403, retryable: false };
    }
    if (msg.includes('404') || msg.includes('not found')) {
      return { code: 404, retryable: false };
    }
    if (msg.includes('429') || msg.includes('rate limit')) {
      return { code: 429, retryable: true };
    }
    if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
      return { code: 503, retryable: true };
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return { retryable: true };
    }

    return { retryable: false };
  }

  bench('parse error messages', () => {
    for (const msg of errorMessages) {
      parseErrorMessage(msg);
    }
  });

  bench('parse single error', () => {
    parseErrorMessage('401 Unauthorized');
  });
});

describe('Channel Mapping Benchmarks', () => {
  interface RawChannel {
    id: number;
    slug: string;
    title: string;
    status: string;
  }

  interface MappedChannel {
    id: number;
    slug: string;
    title: string;
    status: 'public' | 'closed' | 'private';
  }

  const rawChannels: RawChannel[] = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    slug: `channel-${i + 1}`,
    title: `Channel ${i + 1}`,
    status: ['public', 'closed', 'private'][i % 3],
  }));

  bench('map 100 channels', () => {
    rawChannels.map((ch): MappedChannel => ({
      id: ch.id,
      slug: ch.slug,
      title: ch.title,
      status: ch.status as 'public' | 'closed' | 'private',
    }));
  });

  bench('map 20 channels (search result)', () => {
    rawChannels.slice(0, 20).map((ch): MappedChannel => ({
      id: ch.id,
      slug: ch.slug,
      title: ch.title,
      status: ch.status as 'public' | 'closed' | 'private',
    }));
  });
});

describe('Debounce Performance', () => {
  function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }

  bench('create debounced function', () => {
    debounce(() => {}, 300);
  });

  bench('call debounced function 10 times', () => {
    const fn = debounce(() => {}, 300);
    for (let i = 0; i < 10; i++) {
      fn();
    }
  });
});

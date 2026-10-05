import { describe, expect, it, vi } from 'vitest';
import { env } from '@/lib/env';
import { shareUrl } from '@/lib/share-url';

vi.mock('@/lib/env', () => ({ env: { BETTER_AUTH_URL: undefined as string | undefined } }));

const TOKEN = 'a'.repeat(32);

describe('shareUrl', () => {
  it('builds an absolute URL from the configured origin', () => {
    env.BETTER_AUTH_URL = 'https://notes.example.com';
    expect(shareUrl(TOKEN)).toBe(`https://notes.example.com/s/${TOKEN}`);
  });

  it('ignores any path on the configured URL', () => {
    env.BETTER_AUTH_URL = 'https://notes.example.com/app/';
    expect(shareUrl(TOKEN)).toBe(`https://notes.example.com/s/${TOKEN}`);
  });

  it('falls back to a root-relative path without a configured URL', () => {
    env.BETTER_AUTH_URL = undefined;
    expect(shareUrl(TOKEN)).toBe(`/s/${TOKEN}`);
  });
});

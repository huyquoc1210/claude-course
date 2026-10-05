import { beforeEach, describe, expect, it, vi } from 'vitest';

// env.ts validates process.env once, at import time, so each test re-imports it.
async function loadEnv(vars: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(vars)) vi.stubEnv(name, value);
  vi.resetModules();
  return (await import('@/lib/env')).env;
}

const SECRET = 'x'.repeat(32);

beforeEach(() => {
  vi.stubEnv('NEXT_PHASE', undefined);
});

describe('env in production', () => {
  const production = { NODE_ENV: 'production' };

  it('accepts a complete configuration', async () => {
    const env = await loadEnv({
      ...production,
      BETTER_AUTH_SECRET: SECRET,
      BETTER_AUTH_URL: 'https://notes.example.com',
      DB_PATH: '/data/app.db',
    });

    expect(env).toEqual({
      BETTER_AUTH_SECRET: SECRET,
      BETTER_AUTH_URL: 'https://notes.example.com',
      DB_PATH: '/data/app.db',
    });
  });

  it('refuses to start when variables are missing', async () => {
    const load = loadEnv({
      ...production,
      BETTER_AUTH_SECRET: '',
      BETTER_AUTH_URL: '',
      DB_PATH: '',
    });

    await expect(load).rejects.toThrow(/BETTER_AUTH_SECRET is not set/);
    await expect(load).rejects.toThrow(/BETTER_AUTH_URL is not set/);
    await expect(load).rejects.toThrow(/DB_PATH is not set/);
  });

  it('rejects a short secret without printing its value', async () => {
    const load = loadEnv({
      ...production,
      BETTER_AUTH_SECRET: 'short-secret-value',
      BETTER_AUTH_URL: 'https://notes.example.com',
      DB_PATH: '/data/app.db',
    });

    await expect(load).rejects.toThrow(/at least 32 characters/);
    await expect(load).rejects.not.toThrow(/short-secret-value/);
  });

  it('is not enforced during `next build`', async () => {
    const env = await loadEnv({
      ...production,
      NEXT_PHASE: 'phase-production-build',
      BETTER_AUTH_SECRET: '',
      BETTER_AUTH_URL: '',
      DB_PATH: '',
    });

    expect(env.DB_PATH).toBe('./data/app.db');
  });
});

describe('env in development', () => {
  it('falls back to local defaults', async () => {
    const env = await loadEnv({
      NODE_ENV: 'development',
      BETTER_AUTH_SECRET: '',
      BETTER_AUTH_URL: '',
      DB_PATH: '',
    });

    expect(env).toEqual({
      BETTER_AUTH_SECRET: undefined,
      BETTER_AUTH_URL: undefined,
      DB_PATH: './data/app.db',
    });
  });

  it('still rejects a malformed BETTER_AUTH_URL', async () => {
    await expect(
      loadEnv({ NODE_ENV: 'development', BETTER_AUTH_URL: 'not a url' }),
    ).rejects.toThrow(/BETTER_AUTH_URL must be an absolute URL/);
  });
});

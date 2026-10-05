import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import { PASSWORD_MAX_LENGTH } from '@/lib/auth-limits';
import { db } from '@/lib/db';
import { resetDb } from '@/test/test-db';

// The real better-auth configuration, backed by an in-memory database.
vi.mock('@/lib/db', async () => {
  const { createTestDb } = await import('@/test/test-db');
  return { db: createTestDb() };
});
vi.mock('@/lib/env', () => ({
  env: {
    BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-characters',
    BETTER_AUTH_URL: 'http://localhost:3000',
    DB_PATH: ':memory:',
  },
}));

const PASSWORD = 'correct horse battery';

const signUp = (body: Partial<{ name: string; email: string; password: string }> = {}) =>
  auth.api.signUpEmail({
    body: { name: 'Ada', email: 'ada@example.com', password: PASSWORD, ...body },
  });

const signIn = (email: string, password: string) =>
  auth.api.signInEmail({ body: { email, password } });

/** Rejection of a better-auth API call, as { status, code }. */
async function failure(call: Promise<unknown>) {
  const error = await call.then(
    () => {
      throw new Error('expected the call to fail');
    },
    (e: { status: string; body?: { code?: string } }) => e,
  );
  return { status: error.status, code: error.body?.code };
}

const users = () => db.prepare('SELECT name, email FROM "user"').all();

beforeEach(() => {
  resetDb(db);
});

describe('sign-up', () => {
  it('creates the user with a hashed password', async () => {
    await signUp();

    expect(users()).toEqual([{ name: 'Ada', email: 'ada@example.com' }]);
    const { password } = db.prepare('SELECT password FROM account').get() as { password: string };
    expect(password).not.toContain(PASSWORD);
  });

  it('stores the sanitized name', async () => {
    await signUp({ name: '  Ada \n Lovelace  ' });

    expect(users()).toEqual([{ name: 'Ada Lovelace', email: 'ada@example.com' }]);
  });

  it('rejects names with bidi overrides', async () => {
    expect(await failure(signUp({ name: 'evil‮txt' }))).toEqual({
      status: 'BAD_REQUEST',
      code: 'INVALID_NAME',
    });
    expect(users()).toEqual([]);
  });

  it.each([
    ['too short', 'short'],
    ['too long', 'x'.repeat(PASSWORD_MAX_LENGTH + 1)],
  ])('rejects passwords that are %s', async (_label, password) => {
    expect((await failure(signUp({ password }))).status).toBe('BAD_REQUEST');
    expect(users()).toEqual([]);
  });

  it("doesn't reveal that an email is already registered", async () => {
    await signUp();

    await expect(signUp({ name: 'Someone else' })).resolves.toBeDefined();
    expect(users()).toEqual([{ name: 'Ada', email: 'ada@example.com' }]);
  });

  it("doesn't sign the user in automatically", async () => {
    const result = await signUp();

    expect(result.token).toBeNull();
    expect(db.prepare('SELECT count(*) AS n FROM session').get()).toEqual({ n: 0 });
  });
});

describe('sign-in', () => {
  beforeEach(async () => {
    await signUp();
  });

  it('creates a session with the right password', async () => {
    const result = await signIn('ada@example.com', PASSWORD);

    expect(result.user.email).toBe('ada@example.com');
    expect(db.prepare('SELECT count(*) AS n FROM session').get()).toEqual({ n: 1 });
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    const wrongPassword = await failure(signIn('ada@example.com', 'wrong password!'));
    const unknownEmail = await failure(signIn('nobody@example.com', PASSWORD));

    expect(wrongPassword).toEqual({ status: 'UNAUTHORIZED', code: 'INVALID_EMAIL_OR_PASSWORD' });
    expect(unknownEmail).toEqual(wrongPassword);
  });
});

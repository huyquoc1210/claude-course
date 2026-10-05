import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getCurrentUser, requireSession } from '@/lib/session';

vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ cookie: 'session=abc' })),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

const SESSION = {
  session: { id: 's1', token: 'secret-token', userId: 'u1' },
  user: { id: 'u1', name: 'Ada', email: 'ada@example.com' },
};

const getSession = vi.mocked(auth.api.getSession) as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  getSession.mockResolvedValue(null);
});

describe('requireSession', () => {
  it('returns the session for a signed-in user', async () => {
    getSession.mockResolvedValue(SESSION);

    await expect(requireSession()).resolves.toBe(SESSION);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects to the sign-in page without a session', async () => {
    await expect(requireSession()).rejects.toThrow('REDIRECT:/auth');
  });

  it('passes the request headers (cookies) to better-auth', async () => {
    await requireSession().catch(() => {});

    const { headers } = getSession.mock.calls[0][0] as { headers: Headers };
    expect(headers.get('cookie')).toBe('session=abc');
  });
});

describe('getCurrentUser', () => {
  it('exposes only the name and email', async () => {
    getSession.mockResolvedValue(SESSION);

    await expect(getCurrentUser()).resolves.toEqual({ name: 'Ada', email: 'ada@example.com' });
  });

  it('returns null when signed out', async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
  });
});

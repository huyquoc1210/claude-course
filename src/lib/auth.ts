import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/lib/auth-limits';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { parseProfileInput } from '@/lib/user-input';

// SPEC §1 / §11.1: email+password only, cookie sessions, server-side checks via auth.api.getSession().

const isProduction = process.env.NODE_ENV === 'production';

// Endpoints whose body carries user-controlled profile fields (name, email, image).
const PROFILE_PATHS = new Set(['/sign-up/email', '/update-user']);

const ERROR_MESSAGES = {
  INVALID_NAME: 'Please enter a valid name.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_IMAGE: 'Please provide a valid https image URL.',
} as const;

export const auth = betterAuth({
  database: db,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  // Only our own origin may call auth endpoints.
  trustedOrigins: env.BETTER_AUTH_URL ? [new URL(env.BETTER_AUTH_URL).origin] : [],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    // With autoSignIn off, signing up with an already-registered email returns the same
    // generic success response as a new sign-up (no USER_ALREADY_EXISTS), so the API doesn't
    // reveal which emails have accounts. The auth form signs in right after sign-up instead.
    autoSignIn: false,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // sliding refresh once a day
  },

  advanced: {
    useSecureCookies: isProduction,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
    },
  },

  // In-memory store is fine for a single instance (SPEC §11.7).
  rateLimit: {
    enabled: true,
    storage: 'memory',
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 5 },
    },
  },

  hooks: {
    // Validate and sanitize profile fields before better-auth stores them (SPEC §11.4).
    before: createAuthMiddleware(async (ctx) => {
      if (!PROFILE_PATHS.has(ctx.path)) return;

      const result = parseProfileInput(ctx.body, { requireName: ctx.path === '/sign-up/email' });
      if (!result.ok) {
        throw new APIError('BAD_REQUEST', {
          code: result.code,
          message: ERROR_MESSAGES[result.code],
        });
      }
      return { context: { ...ctx, body: { ...ctx.body, ...result.data } } };
    }),
  },

  // Must stay last: lets server actions set auth cookies via next/headers.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;

// Validated server environment. See .env.example for documentation of each variable.
//
// Production: every variable is required, and the server refuses to start without it
// (instrumentation.ts loads this module before the first request).
// Development: documented local defaults apply, so `pnpm dev` works without extra setup.
// `next build` runs with NODE_ENV=production but has no runtime secrets, so it is exempt.

const isProduction = process.env.NODE_ENV === 'production';
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
const enforce = isProduction && !isBuild;

const MIN_SECRET_LENGTH = 32;

const problems: string[] = [];

function read(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value && enforce) problems.push(`${name} is not set.`);
  return value || undefined;
}

const BETTER_AUTH_SECRET = read('BETTER_AUTH_SECRET');
if (enforce && BETTER_AUTH_SECRET && BETTER_AUTH_SECRET.length < MIN_SECRET_LENGTH) {
  problems.push(
    `BETTER_AUTH_SECRET must be at least ${MIN_SECRET_LENGTH} characters (generate one with: openssl rand -base64 32).`,
  );
}

const BETTER_AUTH_URL = read('BETTER_AUTH_URL');
if (BETTER_AUTH_URL && !URL.canParse(BETTER_AUTH_URL)) {
  problems.push(`BETTER_AUTH_URL must be an absolute URL such as https://notes.example.com.`);
}

const DB_PATH = read('DB_PATH');

if (problems.length > 0) {
  // Names only, never values: this message ends up in server logs.
  throw new Error(
    `Invalid environment configuration:\n- ${problems.join('\n- ')}\n` +
      'Set these variables in the server environment (see .env.example).',
  );
}

export const env = {
  /** Undefined only in development, where better-auth falls back to its dev secret. */
  BETTER_AUTH_SECRET,
  /** Undefined only in development, where better-auth infers the URL from the request. */
  BETTER_AUTH_URL,
  DB_PATH: DB_PATH ?? './data/app.db',
};

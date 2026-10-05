export type AuthMode = 'sign-in' | 'sign-up';

// Anything other than an explicit "sign-up" (missing, repeated, unknown) falls back to sign-in.
export function parseAuthMode(value: string | string[] | undefined): AuthMode {
  return value === 'sign-up' ? 'sign-up' : 'sign-in';
}

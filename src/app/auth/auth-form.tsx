'use client';

import { useActionState, useId, type ComponentProps } from 'react';
import { useRouter } from 'next/navigation';
import { alertClass, inputClass, primaryButtonClass } from '@/components/styles';
import { authClient } from '@/lib/auth-client';
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PROFILE_ERROR_CODES,
} from '@/lib/auth-limits';
import type { AuthMode } from './mode';

type FormState = {
  error: string | null;
  // Echoed back so the fields keep their values after React resets the form on error.
  name: string;
  email: string;
};

type AuthError = { status: number; code?: string };

const initialState: FormState = { error: null, name: '', email: '' };

const SUBMIT_LABEL: Record<AuthMode, { idle: string; pending: string }> = {
  'sign-in': { idle: 'Sign in', pending: 'Signing in…' },
  'sign-up': { idle: 'Create account', pending: 'Creating account…' },
};

// Deliberately doesn't say whether the email is already registered.
const SIGN_UP_FAILED =
  "We couldn't create an account with these details. If you already have an account, sign in instead.";

// Maps known error codes to friendly copy. Server-provided messages are never shown, so nothing
// internal can leak into the UI; anything unexpected gets a generic message.
const MESSAGES_BY_CODE: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Invalid email or password.',
  [PROFILE_ERROR_CODES.invalidEmail]: 'Please enter a valid email address.',
  [PROFILE_ERROR_CODES.invalidName]: `Please enter your name (up to ${NAME_MAX_LENGTH} characters).`,
  PASSWORD_TOO_SHORT: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  PASSWORD_TOO_LONG: `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
};

function getErrorMessage(error: AuthError): string {
  if (error.status === 429) return 'Too many attempts. Please wait a minute and try again.';
  return (error.code && MESSAGES_BY_CODE[error.code]) || 'Something went wrong. Please try again.';
}

// Submits through the better-auth client (POST /api/auth/*) rather than a server action:
// server-side auth.api calls bypass better-auth's rate limiter and origin check (SPEC §11.7).
export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(submit, initialState);
  const errorId = useId();

  async function submit(_previous: FormState, formData: FormData): Promise<FormState> {
    const name = String(formData.get('name') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const fail = (error: string): FormState => ({ error, name, email });

    if (mode === 'sign-up') {
      // Succeeds generically even for an existing email (autoSignIn is off server-side).
      const { error } = await authClient.signUp.email({ name, email, password });
      if (error) return fail(getErrorMessage(error));
    }

    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      const signUpRejected = mode === 'sign-up' && error.code === 'INVALID_EMAIL_OR_PASSWORD';
      return fail(signUpRejected ? SIGN_UP_FAILED : getErrorMessage(error));
    }

    // Fixed destination (never taken from the URL) to rule out open redirects.
    router.replace('/dashboard');
    router.refresh();
    return { ...initialState, name, email };
  }

  const label = SUBMIT_LABEL[mode];

  return (
    <form
      action={formAction}
      aria-describedby={state.error ? errorId : undefined}
      className='flex flex-col gap-4'
    >
      {mode === 'sign-up' && (
        <Field
          label='Name'
          name='name'
          autoComplete='name'
          required
          maxLength={NAME_MAX_LENGTH}
          defaultValue={state.name}
        />
      )}
      <Field
        label='Email'
        name='email'
        type='email'
        autoComplete='email'
        required
        maxLength={EMAIL_MAX_LENGTH}
        defaultValue={state.email}
      />
      <Field
        label='Password'
        name='password'
        type='password'
        autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
        required
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
        hint={mode === 'sign-up' ? `At least ${PASSWORD_MIN_LENGTH} characters.` : undefined}
      />

      {state.error && (
        <p id={errorId} role='alert' className={alertClass}>
          {state.error}
        </p>
      )}

      <button type='submit' disabled={isPending} className={`mt-2 ${primaryButtonClass}`}>
        {isPending ? label.pending : label.idle}
      </button>
    </form>
  );
}

type FieldProps = ComponentProps<'input'> & {
  label: string;
  name: string;
  hint?: string;
};

function Field({ label, hint, ...inputProps }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className='flex flex-col gap-1.5'>
      <label htmlFor={id} className='text-sm font-medium'>
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint ? hintId : undefined}
        className={inputClass}
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className='text-sm text-muted'>
          {hint}
        </p>
      )}
    </div>
  );
}

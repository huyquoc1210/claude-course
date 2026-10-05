import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { AuthForm } from './auth-form';
import { parseAuthMode, type AuthMode } from './mode';

export const runtime = 'nodejs';

const COPY: Record<
  AuthMode,
  { title: string; intro: string; switchPrompt: string; switchLabel: string; switchTo: AuthMode }
> = {
  'sign-in': {
    title: 'Sign in',
    intro: 'Welcome back. Sign in to see your notes.',
    switchPrompt: "Don't have an account?",
    switchLabel: 'Create one',
    switchTo: 'sign-up',
  },
  'sign-up': {
    title: 'Create an account',
    intro: 'Sign up with your email and a password.',
    switchPrompt: 'Already have an account?',
    switchLabel: 'Sign in',
    switchTo: 'sign-in',
  },
};

export async function generateMetadata({ searchParams }: PageProps<'/auth'>): Promise<Metadata> {
  const mode = parseAuthMode((await searchParams).mode);
  return { title: COPY[mode].title };
}

export default async function AuthPage({ searchParams }: PageProps<'/auth'>) {
  if (await getSession()) redirect('/dashboard');

  const mode = parseAuthMode((await searchParams).mode);
  const copy = COPY[mode];

  return (
    <main className='flex flex-1 items-center justify-center px-4 py-12'>
      <section
        aria-labelledby='auth-heading'
        className='w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8'
      >
        <h1 id='auth-heading' className='text-2xl font-semibold'>
          {copy.title}
        </h1>
        <p className='mt-1 mb-6 text-sm text-muted'>{copy.intro}</p>

        {/* key resets form state (errors, echoed values) when switching modes */}
        <AuthForm key={mode} mode={mode} />

        <p className='mt-6 text-center text-sm text-muted'>
          {copy.switchPrompt}{' '}
          <Link
            href={`/auth?mode=${copy.switchTo}`}
            replace
            className='rounded-sm font-medium text-foreground underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
          >
            {copy.switchLabel}
          </Link>
        </p>
      </section>
    </main>
  );
}

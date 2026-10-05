'use client';

import Link from 'next/link';
import { ghostButtonClass, primaryButtonClass } from '@/components/styles';

// Shown for unexpected errors below the root layout. Never renders error.message: in production
// Next.js already replaces server error messages, and in development they could include internals.
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  function handleRetry() {
    retry();
  }

  return (
    <main className='mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center'>
      <h1 className='text-2xl font-semibold'>Something went wrong</h1>
      <p className='text-muted'>
        We couldn&apos;t load this page. Please try again; if the problem persists, come back in a
        few minutes.
      </p>
      {error.digest && <p className='text-sm text-muted'>Reference: {error.digest}</p>}
      <div className='flex gap-3'>
        <button type='button' onClick={handleRetry} className={primaryButtonClass}>
          Try again
        </button>
        <Link href='/dashboard' className={ghostButtonClass}>
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}

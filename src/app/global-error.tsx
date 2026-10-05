'use client';

import './globals.css';
import { primaryButtonClass } from '@/components/styles';

// Replaces the root layout when it fails (e.g. the database is unreachable while loading the
// session for the header). Must render its own <html>/<body>; never shows error.message.
export default function GlobalError({
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
    <html lang='en'>
      <body className='flex min-h-screen flex-col'>
        <title>Something went wrong · NextNotes</title>
        <main className='mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center'>
          <h1 className='text-2xl font-semibold'>Something went wrong</h1>
          <p className='text-muted'>
            NextNotes is having trouble right now. Please try again in a few minutes.
          </p>
          {error.digest && <p className='text-sm text-muted'>Reference: {error.digest}</p>}
          <button type='button' onClick={handleRetry} className={primaryButtonClass}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

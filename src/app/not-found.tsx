import type { Metadata } from 'next';
import Link from 'next/link';
import { primaryButtonClass } from '@/components/styles';

export const metadata: Metadata = { title: 'Not found' };

// Deliberately generic: a missing note and someone else's note must look the same.
export default function NotFound() {
  return (
    <main className='mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center'>
      <h1 className='text-2xl font-semibold'>Page not found</h1>
      <p className='text-muted'>
        This page doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link href='/dashboard' className={primaryButtonClass}>
        Go to dashboard
      </Link>
    </main>
  );
}

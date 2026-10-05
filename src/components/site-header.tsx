import Link from 'next/link';
import { signOutAction } from '@/app/auth/actions';
import type { CurrentUser } from '@/lib/session';
import { ghostButtonClass } from './styles';

export function SiteHeader({ user }: { user: CurrentUser | null }) {
  return (
    <header className='border-b border-border bg-surface'>
      <div className='mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-4 px-4'>
        <Link
          href='/dashboard'
          className='flex items-center gap-2 rounded-md text-lg font-semibold tracking-tight text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring'
        >
          <NoteIcon />
          NextNotes
        </Link>
        {user && <UserMenu user={user} />}
      </div>
    </header>
  );
}

function UserMenu({ user }: { user: CurrentUser }) {
  return (
    <div className='flex min-w-0 items-center gap-2'>
      <p className='hidden truncate text-sm text-muted sm:block'>
        <span className='sr-only'>Signed in as </span>
        {user.name}
      </p>
      <form action={signOutAction}>
        <button type='submit' className={ghostButtonClass}>
          Log out
        </button>
      </form>
    </div>
  );
}

function NoteIcon() {
  return (
    <svg
      aria-hidden='true'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      className='size-6'
    >
      <path d='M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z' />
      <path d='M14 3v6h6M8 13h8M8 17h5' />
    </svg>
  );
}

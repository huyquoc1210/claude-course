import type { Metadata } from 'next';
import Link from 'next/link';
import { LocalDateTime } from '@/components/local-date-time';
import { primaryButtonClass } from '@/components/styles';
import { listNotes, type NoteSummary } from '@/lib/notes-repo';
import { requireSession } from '@/lib/session';

export const runtime = 'nodejs';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const { user } = await requireSession();
  const notes = listNotes(user.id);

  return (
    <main className='mx-auto w-full max-w-3xl flex-1 px-4 py-10'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <h1 className='text-2xl font-semibold'>Welcome, {user.name}</h1>
        <Link href='/notes/new' className={primaryButtonClass}>
          New Note
        </Link>
      </div>

      <section aria-labelledby='notes-heading' className='mt-10'>
        <h2 id='notes-heading' className='text-lg font-semibold'>
          Your notes <span className='font-normal text-muted'>({notes.length})</span>
        </h2>
        {notes.length === 0 ? <EmptyState /> : <NoteList notes={notes} />}
      </section>
    </main>
  );
}

function NoteList({ notes }: { notes: NoteSummary[] }) {
  return (
    <ul className='mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface'>
      {notes.map((note) => (
        <li key={note.id}>
          <Link
            href={`/notes/${note.id}`}
            className='flex flex-col gap-1 px-4 py-3 hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:flex-row sm:items-center sm:justify-between sm:gap-4'
          >
            <span className='min-w-0 truncate font-medium'>{note.title || 'Untitled'}</span>
            <span className='flex shrink-0 items-center gap-2 text-sm text-muted'>
              {note.isShared && (
                <span className='rounded-full border border-border px-2 py-0.5 text-xs'>
                  Shared
                </span>
              )}
              <span>
                Updated <LocalDateTime value={note.updatedAt} />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className='mt-4 rounded-lg border border-dashed border-border px-6 py-10 text-center'>
      <p className='font-medium'>No notes yet</p>
      <p className='mt-1 text-sm text-muted'>Create your first note to see it here.</p>
      <Link href='/notes/new' className={`mt-4 inline-block ${primaryButtonClass}`}>
        New Note
      </Link>
    </div>
  );
}

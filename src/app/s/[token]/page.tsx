import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { LocalDateTime } from '@/components/local-date-time';
import { NoteRenderer } from '@/components/note-renderer';
import { getSharedNote } from '@/lib/notes-repo';

// Public, read-only view of a shared note (SPEC §2 / §11.3). No session required. Response
// headers (no-referrer, noindex, no-store) are set for /s/* in next.config.ts.
export const runtime = 'nodejs';

// Shared by generateMetadata and the page: one DB lookup per request.
const loadSharedNote = cache(async (token: string) => getSharedNote(token));

export async function generateMetadata({ params }: PageProps<'/s/[token]'>): Promise<Metadata> {
  const note = await loadSharedNote((await params).token);
  return {
    title: note ? note.title || 'Untitled' : 'Note not found',
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

export default async function SharedNotePage({ params }: PageProps<'/s/[token]'>) {
  const note = await loadSharedNote((await params).token);
  // Malformed, unknown and revoked tokens all look the same.
  if (!note) notFound();

  return (
    <main className='mx-auto w-full max-w-3xl flex-1 px-4 py-10'>
      <article aria-labelledby='note-title'>
        <header className='border-b border-border pb-4'>
          <p className='text-sm font-medium text-muted'>Shared note · read-only</p>
          <h1 id='note-title' className='mt-1 text-3xl font-semibold break-words'>
            {note.title || 'Untitled'}
          </h1>
          <p className='mt-2 text-sm text-muted'>
            Last updated <LocalDateTime value={note.updatedAt} />
          </p>
        </header>

        <div className='mt-6'>
          {note.content ? (
            <NoteRenderer doc={note.content} />
          ) : (
            <p
              role='status'
              className='rounded-md border border-border bg-surface-muted px-4 py-3 text-sm text-muted'
            >
              This note&apos;s content can&apos;t be displayed.
            </p>
          )}
        </div>
      </article>
    </main>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CopyLinkField } from '@/components/copy-link-field';
import { LocalDateTime } from '@/components/local-date-time';
import { NoteRenderer } from '@/components/note-renderer';
import { secondaryButtonClass } from '@/components/styles';
import { shareUrl } from '@/lib/share-url';
import { deleteNoteAction } from '../actions';
import { DeleteNoteButton } from './delete-note-button';
import { loadNote } from './load-note';

export const runtime = 'nodejs';

export async function generateMetadata({ params }: PageProps<'/notes/[id]'>): Promise<Metadata> {
  const note = await loadNote((await params).id);
  return { title: note ? note.title || 'Untitled' : 'Note not found' };
}

export default async function NotePage({ params }: PageProps<'/notes/[id]'>) {
  const note = await loadNote((await params).id);
  // Missing and not-owned notes look identical (SPEC §11.2). Only the owner gets past this,
  // so the Edit/Delete controls below are only ever shown to the note's creator.
  if (!note) notFound();

  const title = note.title || 'Untitled';

  return (
    <main className='mx-auto w-full max-w-3xl flex-1 px-4 py-10'>
      <Link
        href='/dashboard'
        className='rounded-sm text-sm text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
      >
        <span aria-hidden='true'>← </span>All notes
      </Link>

      <article aria-labelledby='note-title' className='mt-4'>
        <header className='flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0'>
            <h1 id='note-title' className='text-3xl font-semibold break-words'>
              {title}
            </h1>
            <p className='mt-2 text-sm text-muted'>
              Last updated <LocalDateTime value={note.updatedAt} />
            </p>
          </div>
          <div className='flex shrink-0 gap-2'>
            <Link href={`/notes/${note.id}/edit`} className={secondaryButtonClass}>
              Edit
            </Link>
            <DeleteNoteButton action={deleteNoteAction.bind(null, note.id)} noteTitle={title} />
          </div>
        </header>

        {note.shareToken && (
          <section
            aria-label='Public sharing'
            className='mt-6 rounded-md border border-border bg-surface p-4'
          >
            <CopyLinkField
              label='Public link: anyone with this link can read this note'
              url={shareUrl(note.shareToken)}
            />
            <p className='text-sm text-muted'>
              To stop sharing,{' '}
              <Link
                href={`/notes/${note.id}/edit`}
                className='underline underline-offset-4 hover:text-foreground'
              >
                edit the note
              </Link>{' '}
              and turn off &ldquo;Share publicly&rdquo;.
            </p>
          </section>
        )}

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

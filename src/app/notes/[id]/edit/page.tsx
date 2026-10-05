import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { updateNoteAction } from '../../actions';
import { NoteForm } from '../../note-form';
import { loadNote } from '../load-note';

export const runtime = 'nodejs';

export async function generateMetadata({
  params,
}: PageProps<'/notes/[id]/edit'>): Promise<Metadata> {
  const note = await loadNote((await params).id);
  return { title: note ? `Edit: ${note.title || 'Untitled'}` : 'Note not found' };
}

export default async function EditNotePage({ params }: PageProps<'/notes/[id]/edit'>) {
  const note = await loadNote((await params).id);
  if (!note) notFound();

  return (
    <main className='mx-auto w-full max-w-3xl flex-1 px-4 py-10'>
      <h1 className='mb-6 text-2xl font-semibold'>Edit note</h1>
      {note.content ? (
        <NoteForm
          // The note id is bound on the server; the action re-checks ownership on every save.
          action={updateNoteAction.bind(null, note.id)}
          initialTitle={note.title}
          initialContent={note.content}
          initialShared={note.shareToken !== null}
          submitLabel={{ idle: 'Save changes', pending: 'Saving…' }}
          cancelHref={`/notes/${note.id}`}
        />
      ) : (
        // Never load unvalidated JSON into the editor; saving would also overwrite the original.
        <div
          role='status'
          className='rounded-md border border-border bg-surface-muted px-4 py-3 text-sm text-muted'
        >
          This note&apos;s content can&apos;t be edited.{' '}
          <Link href={`/notes/${note.id}`} className='underline underline-offset-4'>
            Back to the note
          </Link>
        </div>
      )}
    </main>
  );
}

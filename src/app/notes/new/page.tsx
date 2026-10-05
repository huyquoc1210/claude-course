import type { Metadata } from 'next';
import { requireSession } from '@/lib/session';
import { createNoteAction } from '../actions';
import { NoteForm } from '../note-form';

export const runtime = 'nodejs';

export const metadata: Metadata = { title: 'New Note' };

export default async function NewNotePage() {
  await requireSession();

  return (
    <main className='mx-auto w-full max-w-3xl flex-1 px-4 py-10'>
      <h1 className='mb-6 text-2xl font-semibold'>New Note</h1>
      <NoteForm
        action={createNoteAction}
        submitLabel={{ idle: 'Create note', pending: 'Creating…' }}
        cancelHref='/dashboard'
      />
    </main>
  );
}

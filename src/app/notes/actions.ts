'use server';

import { redirect } from 'next/navigation';
import { MAX_NOTES_PER_USER } from '@/lib/note-limits';
import { createNote, deleteNote, updateNote } from '@/lib/notes-repo';
import { requireSession } from '@/lib/session';
import { parseNoteForm, SAVE_FAILED, type NoteFormState } from './note-form-input';

// Server actions are public endpoints: every action authenticates itself and passes the
// session's user id to the repository, which scopes every query to that user.

export type { NoteFormState } from './note-form-input';

export type DeleteNoteState = { error?: string };

export async function createNoteAction(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const { user } = await requireSession();

  const input = parseNoteForm(formData);
  if (!input.ok) return input.state;

  const { title, content, shared } = input;

  let result: ReturnType<typeof createNote>;
  try {
    result = createNote(user.id, { title, content, shared });
  } catch (error) {
    // Details stay in server logs (never title/content, SPEC §11.10); the client gets a generic message.
    console.error('createNote failed', { userId: user.id, error });
    return { title, shared, errors: { form: SAVE_FAILED } };
  }

  if (!result.ok) {
    return {
      title,
      shared,
      errors: {
        form: `You've reached the limit of ${MAX_NOTES_PER_USER.toLocaleString('en-US')} notes.`,
      },
    };
  }

  redirect(`/notes/${result.id}`);
}

/** Bound to the note id by the edit page: `updateNoteAction.bind(null, id)`. */
export async function updateNoteAction(
  id: string,
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const { user } = await requireSession();

  const input = parseNoteForm(formData);
  if (!input.ok) return input.state;

  const { title, content, shared } = input;

  let updated: boolean;
  try {
    updated = updateNote(user.id, id, { title, content, shared });
  } catch (error) {
    console.error('updateNote failed', { userId: user.id, noteId: id, error });
    return { title, shared, errors: { form: SAVE_FAILED } };
  }

  // Deleted meanwhile, or not ours: same message either way.
  if (!updated) return { title, shared, errors: { form: 'This note no longer exists.' } };

  redirect(`/notes/${id}`);
}

/**
 * Bound to the note id by the delete dialog: `deleteNoteAction.bind(null, id)`. Used with
 * useActionState, which also passes the previous state and form data; neither is needed.
 */
export async function deleteNoteAction(id: string): Promise<DeleteNoteState> {
  const { user } = await requireSession();

  try {
    // Already gone (or not ours) ends up in the same place: the note isn't there any more.
    deleteNote(user.id, id);
  } catch (error) {
    console.error('deleteNote failed', { userId: user.id, noteId: id, error });
    return { error: "We couldn't delete this note. Please try again in a moment." };
  }

  redirect('/dashboard');
}

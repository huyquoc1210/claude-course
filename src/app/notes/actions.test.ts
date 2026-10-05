import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redirect } from 'next/navigation';
import { createNote, deleteNote, updateNote } from '@/lib/notes-repo';
import { requireSession } from '@/lib/session';
import { docWithText } from '@/test/test-db';
import { createNoteAction, deleteNoteAction, updateNoteAction } from './actions';

vi.mock('@/lib/session', () => ({ requireSession: vi.fn() }));
vi.mock('@/lib/notes-repo', () => ({
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}));
// Like the real redirect(), stop execution by throwing.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

const USER_ID = 'user-1';
const NOTE_ID = 'n'.repeat(21);
const CONTENT = docWithText('body');

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

const validForm = (extra: Record<string, string> = {}) =>
  form({ title: 'Hello', content: JSON.stringify(CONTENT), ...extra });

beforeEach(() => {
  vi.mocked(requireSession).mockResolvedValue({ user: { id: USER_ID } } as Awaited<
    ReturnType<typeof requireSession>
  >);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('createNoteAction', () => {
  it("creates the note for the session's user and redirects to it", async () => {
    vi.mocked(createNote).mockReturnValue({ ok: true, id: NOTE_ID });

    await expect(createNoteAction({}, validForm({ shared: 'on' }))).rejects.toThrow(
      `REDIRECT:/notes/${NOTE_ID}`,
    );
    expect(createNote).toHaveBeenCalledWith(USER_ID, {
      title: 'Hello',
      content: CONTENT,
      shared: true,
    });
  });

  it('ignores a user id smuggled into the form', async () => {
    vi.mocked(createNote).mockReturnValue({ ok: true, id: NOTE_ID });

    await expect(createNoteAction({}, validForm({ userId: 'someone-else' }))).rejects.toThrow(
      'REDIRECT',
    );
    expect(createNote).toHaveBeenCalledWith(USER_ID, expect.anything());
  });

  it('does nothing without a session', async () => {
    vi.mocked(requireSession).mockRejectedValue(new Error('REDIRECT:/auth'));

    await expect(createNoteAction({}, validForm())).rejects.toThrow('REDIRECT:/auth');
    expect(createNote).not.toHaveBeenCalled();
  });

  it('returns validation errors without saving', async () => {
    const state = await createNoteAction({}, validForm({ title: ' ' }));

    expect(state.errors?.title).toBe('Please enter a title.');
    expect(createNote).not.toHaveBeenCalled();
  });

  it('reports the note limit', async () => {
    vi.mocked(createNote).mockReturnValue({ ok: false, reason: 'limit-reached' });

    const state = await createNoteAction({}, validForm());

    expect(state).toEqual({
      title: 'Hello',
      shared: false,
      errors: { form: "You've reached the limit of 1,000 notes." },
    });
  });

  it('returns a generic error when saving fails', async () => {
    vi.mocked(createNote).mockImplementation(() => {
      throw new Error('SQLITE_BUSY');
    });

    const state = await createNoteAction({}, validForm());

    expect(state.errors?.form).toBe("We couldn't save your note. Please try again in a moment.");
    expect(redirect).not.toHaveBeenCalled();
  });

  it('never logs the note title or content', async () => {
    vi.mocked(createNote).mockImplementation(() => {
      throw new Error('boom');
    });

    await createNoteAction({}, validForm({ title: 'Secret title' }));

    const logged = JSON.stringify(vi.mocked(console.error).mock.calls, (_key, value) =>
      value instanceof Error ? value.message : value,
    );
    expect(logged).not.toContain('Secret title');
    expect(logged).not.toContain('body');
  });
});

describe('updateNoteAction', () => {
  it('updates the note and redirects back to it', async () => {
    vi.mocked(updateNote).mockReturnValue(true);

    await expect(updateNoteAction(NOTE_ID, {}, validForm())).rejects.toThrow(
      `REDIRECT:/notes/${NOTE_ID}`,
    );
    expect(updateNote).toHaveBeenCalledWith(USER_ID, NOTE_ID, {
      title: 'Hello',
      content: CONTENT,
      shared: false,
    });
  });

  it('reports a missing or foreign note the same way', async () => {
    vi.mocked(updateNote).mockReturnValue(false);

    const state = await updateNoteAction(NOTE_ID, {}, validForm());

    expect(state.errors?.form).toBe('This note no longer exists.');
  });

  it('returns validation errors without saving', async () => {
    const state = await updateNoteAction(NOTE_ID, {}, validForm({ content: '{}' }));

    expect(state.errors?.content).toBe('The note content is invalid or too large.');
    expect(updateNote).not.toHaveBeenCalled();
  });

  it('returns a generic error when saving fails', async () => {
    vi.mocked(updateNote).mockImplementation(() => {
      throw new Error('disk full');
    });

    const state = await updateNoteAction(NOTE_ID, {}, validForm());

    expect(state.errors?.form).toBe("We couldn't save your note. Please try again in a moment.");
  });
});

describe('deleteNoteAction', () => {
  it("deletes the session user's note and goes to the dashboard", async () => {
    vi.mocked(deleteNote).mockReturnValue(true);

    await expect(deleteNoteAction(NOTE_ID)).rejects.toThrow('REDIRECT:/dashboard');
    expect(deleteNote).toHaveBeenCalledWith(USER_ID, NOTE_ID);
  });

  it('also goes to the dashboard when the note is already gone', async () => {
    vi.mocked(deleteNote).mockReturnValue(false);

    await expect(deleteNoteAction(NOTE_ID)).rejects.toThrow('REDIRECT:/dashboard');
  });

  it('returns an error when deleting fails', async () => {
    vi.mocked(deleteNote).mockImplementation(() => {
      throw new Error('locked');
    });

    await expect(deleteNoteAction(NOTE_ID)).resolves.toEqual({
      error: "We couldn't delete this note. Please try again in a moment.",
    });
  });

  it('does nothing without a session', async () => {
    vi.mocked(requireSession).mockRejectedValue(new Error('REDIRECT:/auth'));

    await expect(deleteNoteAction(NOTE_ID)).rejects.toThrow('REDIRECT:/auth');
    expect(deleteNote).not.toHaveBeenCalled();
  });
});

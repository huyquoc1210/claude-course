import { z } from 'zod';
import { parseNoteContent, type NoteDoc } from '@/lib/note-content';
import { MAX_TITLE_LENGTH } from '@/lib/note-limits';

// Validation of the create/edit note form, shared by the note server actions.

export type NoteFormState = {
  /** Echoed back so the fields survive React's form reset after a failed submit. */
  title?: string;
  shared?: boolean;
  errors?: { title?: string; content?: string; form?: string };
};

// Titles are single-line plain text: no control characters (incl. newlines) or bidi overrides.
const UNSAFE_TITLE_CHARACTERS = /[\p{Cc}‪-‮⁦-⁩]/u;

const NoteFormSchema = z.strictObject({
  title: z
    .string()
    .transform((value) => value.normalize('NFC').trim())
    .pipe(
      z
        .string()
        .min(1, 'Please enter a title.')
        .max(MAX_TITLE_LENGTH, `Title must be at most ${MAX_TITLE_LENGTH} characters.`)
        .refine(
          (value) => !UNSAFE_TITLE_CHARACTERS.test(value),
          "Title contains characters that aren't allowed.",
        ),
    ),
  content: z.string(),
  // Checkbox: absent when unchecked, "on" when checked; anything else is rejected.
  shared: z
    .literal('on')
    .nullable()
    .transform((value) => value === 'on'),
});

const INVALID_CONTENT = 'The note content is invalid or too large.';
export const SAVE_FAILED = "We couldn't save your note. Please try again in a moment.";

export type ParsedNoteForm =
  | { ok: true; title: string; content: NoteDoc; shared: boolean }
  | { ok: false; state: NoteFormState };

export function parseNoteForm(formData: FormData): ParsedNoteForm {
  const rawTitle = formData.get('title');
  const title = typeof rawTitle === 'string' ? rawTitle : '';
  const rawShared = formData.get('shared');
  const shared = rawShared === 'on';

  const parsed = NoteFormSchema.safeParse({
    title: rawTitle,
    content: formData.get('content'),
    shared: rawShared,
  });
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      ok: false,
      state: {
        title,
        shared,
        errors: {
          title: fieldErrors.title?.[0],
          content: fieldErrors.content && INVALID_CONTENT,
          form: fieldErrors.shared && SAVE_FAILED,
        },
      },
    };
  }

  const content = parseNoteContent(parsed.data.content);
  if (!content)
    return { ok: false, state: { title, shared, errors: { content: INVALID_CONTENT } } };

  return { ok: true, title: parsed.data.title, content, shared: parsed.data.shared };
}

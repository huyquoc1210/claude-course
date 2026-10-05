import { describe, expect, it } from 'vitest';
import { MAX_TITLE_LENGTH } from '@/lib/note-limits';
import { docWithText } from '@/test/test-db';
import { parseNoteForm, SAVE_FAILED } from './note-form-input';

const CONTENT = JSON.stringify(docWithText('body'));

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

describe('parseNoteForm', () => {
  it('parses a valid unshared note', () => {
    expect(parseNoteForm(form({ title: 'Hello', content: CONTENT }))).toEqual({
      ok: true,
      title: 'Hello',
      content: docWithText('body'),
      shared: false,
    });
  });

  it('treats a checked "shared" checkbox as shared', () => {
    expect(parseNoteForm(form({ title: 'Hello', content: CONTENT, shared: 'on' }))).toMatchObject({
      ok: true,
      shared: true,
    });
  });

  it('trims and NFC-normalizes the title', () => {
    const result = parseNoteForm(form({ title: '  Café  ', content: CONTENT }));
    expect(result).toMatchObject({ ok: true, title: 'Café' });
  });

  it.each([
    ['empty', '', 'Please enter a title.'],
    ['whitespace only', '   ', 'Please enter a title.'],
    [
      'too long',
      'a'.repeat(MAX_TITLE_LENGTH + 1),
      `Title must be at most ${MAX_TITLE_LENGTH} characters.`,
    ],
    ['multi-line', 'line one\nline two', "Title contains characters that aren't allowed."],
    ['containing a bidi override', 'abc‮def', "Title contains characters that aren't allowed."],
  ])('rejects a title that is %s', (_label, title, message) => {
    expect(parseNoteForm(form({ title, content: CONTENT }))).toEqual({
      ok: false,
      state: { title, shared: false, errors: { title: message } },
    });
  });

  it('accepts a title of exactly the maximum length', () => {
    expect(parseNoteForm(form({ title: 'a'.repeat(MAX_TITLE_LENGTH), content: CONTENT })).ok).toBe(
      true,
    );
  });

  it('echoes the submitted values back on error so the form keeps them', () => {
    const result = parseNoteForm(form({ title: '', content: CONTENT, shared: 'on' }));
    expect(result).toMatchObject({ ok: false, state: { title: '', shared: true } });
  });

  it.each([
    ['missing', {}],
    ['not JSON', { content: 'nope' }],
    [
      'a disallowed node',
      { content: JSON.stringify({ type: 'doc', content: [{ type: 'blockquote' }] }) },
    ],
  ])('rejects content that is %s', (_label, fields) => {
    expect(parseNoteForm(form({ title: 'Hello', ...fields }))).toMatchObject({
      ok: false,
      state: { errors: { content: 'The note content is invalid or too large.' } },
    });
  });

  it('rejects unexpected checkbox values with a generic error', () => {
    expect(parseNoteForm(form({ title: 'Hello', content: CONTENT, shared: 'yes' }))).toMatchObject({
      ok: false,
      state: { errors: { form: SAVE_FAILED } },
    });
  });

  it('rejects a file uploaded in place of the title', () => {
    const data = form({ content: CONTENT });
    data.append('title', new Blob(['x']));
    expect(parseNoteForm(data)).toMatchObject({ ok: false, state: { title: '' } });
  });
});

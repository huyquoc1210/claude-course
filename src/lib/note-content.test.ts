import { describe, expect, it } from 'vitest';
import { parseNoteContent } from '@/lib/note-content';
import { MAX_CONTENT_BYTES } from '@/lib/note-limits';

const parse = (value: unknown) => parseNoteContent(JSON.stringify(value));

const doc = (...content: unknown[]) => ({ type: 'doc', content });
const paragraph = (text: string, marks?: { type: string }[]) => ({
  type: 'paragraph',
  content: [{ type: 'text', text, ...(marks && { marks }) }],
});

describe('parseNoteContent', () => {
  it('accepts every allowed node and mark type', () => {
    const value = doc(
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'H1' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H2' }] },
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'H3' }] },
      paragraph('styled', [{ type: 'bold' }, { type: 'italic' }]),
      paragraph('inline()', [{ type: 'code' }]),
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [paragraph('one')] },
          {
            type: 'listItem',
            content: [
              paragraph('two'),
              {
                type: 'bulletList',
                content: [{ type: 'listItem', content: [paragraph('nested')] }],
              },
            ],
          },
        ],
      },
      { type: 'codeBlock', attrs: { language: null }, content: [{ type: 'text', text: 'x = 1' }] },
      { type: 'horizontalRule' },
      { type: 'paragraph' },
    );

    expect(parse(value)).toEqual(value);
  });

  it('accepts the empty document the editor starts with', () => {
    expect(parse(doc({ type: 'paragraph' }))).not.toBeNull();
  });

  it.each([
    ['malformed JSON', '{"type":"doc"'],
    ['a JSON primitive', '"hello"'],
    ['null', 'null'],
  ])('rejects %s', (_label, raw) => {
    expect(parseNoteContent(raw)).toBeNull();
  });

  it.each([
    ['a non-doc root', paragraph('x')],
    ['a doc without blocks', doc()],
    ['a blockquote', doc({ type: 'blockquote', content: [paragraph('x')] })],
    [
      'an ordered list',
      doc({ type: 'orderedList', content: [{ type: 'listItem', content: [paragraph('x')] }] }),
    ],
    ['an image', doc({ type: 'image', attrs: { src: 'https://example.com/x.png' } })],
    ['a link mark', doc(paragraph('x', [{ type: 'link' }]))],
    ['a strike mark', doc(paragraph('x', [{ type: 'strike' }]))],
    [
      'heading level 4',
      doc({ type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'x' }] }),
    ],
    ['unknown keys on a node', doc({ type: 'paragraph', attrs: { style: 'color:red' } })],
    [
      'unknown keys on a mark',
      doc(paragraph('x', [{ type: 'bold', attrs: { href: 'javascript:alert(1)' } } as never])),
    ],
    ['empty text nodes', doc({ type: 'paragraph', content: [{ type: 'text', text: '' }] })],
    ['control characters in text', doc(paragraph('bad\u0000text'))],
    [
      'marks inside a code block',
      doc({ type: 'codeBlock', content: [{ type: 'text', text: 'x', marks: [{ type: 'bold' }] }] }),
    ],
    ['an invalid code block language', doc({ type: 'codeBlock', attrs: { language: '<script>' } })],
    ['an empty bullet list', doc({ type: 'bulletList', content: [] })],
  ])('rejects %s', (_label, value) => {
    expect(parse(value)).toBeNull();
  });

  it('rejects structure the editor schema forbids (list item starting with a list)', () => {
    const nestedFirst = doc({
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph('x')] }] },
          ],
        },
      ],
    });
    expect(parse(nestedFirst)).toBeNull();
  });

  it('rejects content larger than the byte limit', () => {
    const big = doc(paragraph('a'.repeat(MAX_CONTENT_BYTES)));
    expect(parse(big)).toBeNull();
  });

  it('rejects deeply nested content without throwing', () => {
    // Built as a string: JSON.stringify itself would overflow the stack at this depth.
    const depth = 7_000;
    const open = '{"type":"bulletList","content":[{"type":"listItem","content":[';
    const raw = `{"type":"doc","content":[${open.repeat(depth)}{"type":"paragraph"}${']}]}'.repeat(depth)}]}`;

    expect(raw.length).toBeLessThan(MAX_CONTENT_BYTES);
    expect(parseNoteContent(raw)).toBeNull();
  });
});

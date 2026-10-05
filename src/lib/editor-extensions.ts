import type { JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

// SPEC §10: only paragraph, heading 1–3, bold, italic, code, codeBlock, bulletList/listItem,
// horizontalRule. Must stay in sync with the server-side allowlist in note-content.ts.
export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    blockquote: false,
    hardBreak: false,
    link: false,
    orderedList: false,
    strike: false,
    underline: false,
  }),
];

import { getSchema } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import { z } from 'zod';
import { editorExtensions } from '@/lib/editor-extensions';
import { MAX_CONTENT_BYTES } from '@/lib/note-limits';

// Server-side validation of TipTap JSON (SPEC §11.4). Never trust the client editor.
// Two layers:
// 1. zod allowlist: only the SPEC §10 node/mark types and attributes, no unknown keys,
//    no control characters in text.
// 2. The editor's own ProseMirror schema: structural rules zod doesn't express, e.g. a list
//    item must start with a paragraph and a document needs at least one block. Content that
//    passes both is guaranteed to load in the editor and render on the public page.

// C0 controls (except tab/newline/carriage return) and DEL.
const SAFE_TEXT = /^[^\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]*$/;

const mark = z.strictObject({ type: z.enum(['bold', 'italic', 'code']) });

const text = z.strictObject({
  type: z.literal('text'),
  text: z.string().min(1).regex(SAFE_TEXT),
  marks: z.array(mark).optional(),
});

const plainText = z.strictObject({
  type: z.literal('text'),
  text: z.string().min(1).regex(SAFE_TEXT),
});

const paragraph = z.strictObject({
  type: z.literal('paragraph'),
  content: z.array(text).optional(),
});

const heading = z.strictObject({
  type: z.literal('heading'),
  attrs: z.strictObject({ level: z.union([z.literal(1), z.literal(2), z.literal(3)]) }),
  content: z.array(text).optional(),
});

const codeBlock = z.strictObject({
  type: z.literal('codeBlock'),
  attrs: z
    .strictObject({
      language: z
        .string()
        .regex(/^[\w+#-]{1,32}$/)
        .nullable(),
    })
    .optional(),
  content: z.array(plainText).optional(),
});

const horizontalRule = z.strictObject({ type: z.literal('horizontalRule') });

// listItem ⇄ bulletList are mutually recursive (nested lists); zod v4 resolves this via getters.
const listItem = z.strictObject({
  type: z.literal('listItem'),
  get content() {
    return z.array(block).min(1);
  },
});

const bulletList = z.strictObject({
  type: z.literal('bulletList'),
  content: z.array(listItem).min(1),
});

const block = z.discriminatedUnion('type', [
  paragraph,
  heading,
  codeBlock,
  horizontalRule,
  bulletList,
]);

const doc = z.strictObject({
  type: z.literal('doc'),
  content: z.array(block).min(1),
});

export type NoteDoc = z.infer<typeof doc>;
export type NoteBlock = z.infer<typeof block>;
export type NoteText = z.infer<typeof text>;
export type NoteMark = z.infer<typeof mark>['type'];

const editorSchema = getSchema(editorExtensions);

/** Parses and validates serialized TipTap JSON. Returns null for anything not allowed. */
export function parseNoteContent(raw: string): NoteDoc | null {
  if (new TextEncoder().encode(raw).byteLength > MAX_CONTENT_BYTES) return null;

  try {
    const result = doc.safeParse(JSON.parse(raw));
    if (!result.success) return null;

    // Throws if the structure violates the editor schema (content expressions, allowed marks).
    Node.fromJSON(editorSchema, result.data).check();
    return result.data;
  } catch {
    // Malformed JSON, schema violation, or nesting deep enough to exhaust the stack.
    return null;
  }
}

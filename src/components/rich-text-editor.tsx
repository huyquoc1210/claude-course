'use client';

import { useId, useRef } from 'react';
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react';
import { EMPTY_DOC, editorExtensions } from '@/lib/editor-extensions';
import { EditorToolbar } from './editor-toolbar';
import { noteContentClass } from './note-content-class';

type RichTextEditorProps = {
  /** Initial document (uncontrolled, like an input's defaultValue). Empty when omitted. */
  defaultValue?: JSONContent;
  /** Form field name; the TipTap JSON is submitted as a string under this name. */
  name: string;
  /** Id of the visible label element (a contenteditable can't be targeted by <label>). */
  labelId: string;
  /** Id of an error element; only announced while that element exists. */
  describedById?: string;
};

export function RichTextEditor({
  defaultValue = EMPTY_DOC,
  name,
  labelId,
  describedById,
}: RichTextEditorProps) {
  // The serialized document is only needed when the form submits, never for rendering, so it
  // lives in the hidden input itself (via a ref) instead of state: no re-render per keystroke.
  // React must not manage that input's value (no value/defaultValue prop): it would re-apply the
  // initial document whenever the form re-renders, e.g. after a failed submit, losing edits.
  const valueRef = useRef<HTMLInputElement | null>(null);
  const id = useId();

  function attachValueInput(input: HTMLInputElement | null) {
    valueRef.current = input;
    // Seed once; afterwards only onUpdate writes. Native form resets keep a hidden input's value.
    if (input && input.value === '') input.value = JSON.stringify(defaultValue);
  }
  const editorId = `${id}-editor`;
  const hintId = `${id}-hint`;

  const editor = useEditor({
    extensions: editorExtensions,
    content: defaultValue,
    // Required for SSR: render the editor only after hydration.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id: editorId,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': labelId,
        'aria-describedby': [describedById, hintId].filter(Boolean).join(' '),
        class: `min-h-60 px-3 py-2 focus:outline-none ${noteContentClass}`,
      },
    },
    onUpdate: ({ editor }) => {
      if (valueRef.current) valueRef.current.value = JSON.stringify(editor.getJSON());
    },
  });

  return (
    <div className='flex flex-col gap-1.5'>
      {/* No overflow-hidden here: it would break the toolbar's sticky positioning. */}
      <div className='rounded-md border border-input bg-surface focus-within:border-ring focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-ring'>
        <EditorToolbar editor={editor} controls={editorId} />
        <EditorContent editor={editor} className='min-h-60' />
      </div>
      <p id={hintId} className='text-sm text-muted'>
        Markdown shortcuts work too: <Kbd># </Kbd> heading, <Kbd>- </Kbd> list, <Kbd>```</Kbd> code
        block, <Kbd>---</Kbd> divider, <Kbd>**bold**</Kbd>, <Kbd>*italic*</Kbd>, <Kbd>`code`</Kbd>.
      </p>
      <input ref={attachValueInput} type='hidden' name={name} />
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className='rounded bg-surface-muted px-1 font-mono text-xs text-foreground'>
      {children}
    </kbd>
  );
}

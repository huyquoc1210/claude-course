import type { ReactNode } from 'react';
import type { NoteBlock, NoteDoc, NoteMark, NoteText } from '@/lib/note-content';

// Renders validated TipTap JSON as plain JSX (Server Component, no TipTap runtime, no HTML
// strings). Only the node types that the server-side allowlist permits can reach this code.
//
// Headings are shifted down one level (H1 → <h2>) because the note title is the page's <h1>;
// their look is kept by styling on the original level.

const HEADING_TAGS = { 1: 'h2', 2: 'h3', 3: 'h4' } as const;

const HEADING_CLASSES = {
  1: 'mt-6 mb-2 text-2xl font-semibold',
  2: 'mt-5 mb-2 text-xl font-semibold',
  3: 'mt-4 mb-2 text-lg font-semibold',
} as const;

export function NoteRenderer({ doc }: { doc: NoteDoc }) {
  return (
    <div className='text-base leading-relaxed text-foreground'>
      <Blocks nodes={doc.content} />
    </div>
  );
}

function Blocks({ nodes }: { nodes: NoteBlock[] }) {
  // Static, never-reordered content: the index is a stable key.
  return nodes.map((node, index) => <Block key={index} node={node} />);
}

function Block({ node }: { node: NoteBlock }) {
  switch (node.type) {
    case 'paragraph':
      // An empty paragraph is a deliberate blank line in the editor; keep its height.
      return <p className='my-2'>{node.content ? <Inlines nodes={node.content} /> : <br />}</p>;

    case 'heading': {
      const Tag = HEADING_TAGS[node.attrs.level];
      return (
        <Tag className={HEADING_CLASSES[node.attrs.level]}>
          {node.content && <Inlines nodes={node.content} />}
        </Tag>
      );
    }

    case 'codeBlock':
      return (
        <pre className='my-3 overflow-x-auto rounded-md border border-border bg-codeblock p-3 text-codeblock-foreground'>
          <code className='font-mono text-sm'>
            {node.content?.map((text) => text.text).join('')}
          </code>
        </pre>
      );

    case 'horizontalRule':
      return <hr className='my-6 border-border' />;

    case 'bulletList':
      return (
        <ul className='my-2 list-disc pl-6'>
          {node.content.map((item, index) => (
            <li key={index}>
              <Blocks nodes={item.content} />
            </li>
          ))}
        </ul>
      );

    default: {
      // Compile-time guarantee that every allowed block type is handled.
      const unhandled: never = node;
      return unhandled;
    }
  }
}

function Inlines({ nodes }: { nodes: NoteText[] }) {
  return nodes.map((node, index) => <Text key={index} node={node} />);
}

const MARK_RENDERERS: Record<NoteMark, (children: ReactNode) => ReactNode> = {
  bold: (children) => <strong className='font-semibold'>{children}</strong>,
  italic: (children) => <em>{children}</em>,
  code: (children) => (
    <code className='rounded bg-surface-muted px-1 py-0.5 font-mono text-sm'>{children}</code>
  ),
};

function Text({ node }: { node: NoteText }) {
  // React escapes the text; marks only ever wrap it in fixed elements.
  // Wrap innermost-first so the first mark in the list ends up outermost, as in TipTap.
  return (node.marks ?? []).reduceRight<ReactNode>(
    (children, mark) => MARK_RENDERERS[mark.type](children),
    node.text,
  );
}

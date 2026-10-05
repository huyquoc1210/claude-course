'use client';

import {
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { useEditorState, type Editor } from '@tiptap/react';

// Exposes exactly the SPEC §10 tools (plus undo/redo), mirroring editorExtensions.

/** TipTap key notation, e.g. ["Mod", "Alt", "1"]. "Mod" is ⌘ on Apple devices, Ctrl elsewhere. */
type Shortcut = readonly string[];

type Tool = {
  label: string;
  icon: ReactNode;
  shortcut?: Shortcut;
  isActive?: (editor: Editor) => boolean;
  canRun: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
};

type ToolGroup = { label: string; tools: Tool[] };

const TOOL_GROUPS: ToolGroup[] = [
  {
    label: 'History',
    tools: [
      {
        label: 'Undo',
        icon: <Icon paths={['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11']} />,
        shortcut: ['Mod', 'Z'],
        canRun: (editor) => editor.can().undo(),
        run: (editor) => editor.chain().focus().undo().run(),
      },
      {
        label: 'Redo',
        icon: <Icon paths={['m15 14 5-5-5-5', 'M20 9H9.5a5.5 5.5 0 0 0 0 11H13']} />,
        shortcut: ['Mod', 'Shift', 'Z'],
        canRun: (editor) => editor.can().redo(),
        run: (editor) => editor.chain().focus().redo().run(),
      },
    ],
  },
  {
    label: 'Text style',
    tools: [
      {
        label: 'Normal text',
        icon: <TextIcon>Text</TextIcon>,
        shortcut: ['Mod', 'Alt', '0'],
        isActive: (editor) => editor.isActive('paragraph'),
        canRun: (editor) => editor.can().setParagraph(),
        run: (editor) => editor.chain().focus().setParagraph().run(),
      },
      ...([1, 2, 3] as const).map((level): Tool => ({
        label: `Heading ${level}`,
        icon: <TextIcon>{`H${level}`}</TextIcon>,
        shortcut: ['Mod', 'Alt', String(level)],
        isActive: (editor) => editor.isActive('heading', { level }),
        canRun: (editor) => editor.can().toggleHeading({ level }),
        run: (editor) => editor.chain().focus().toggleHeading({ level }).run(),
      })),
    ],
  },
  {
    label: 'Formatting',
    tools: [
      {
        label: 'Bold',
        icon: <Icon paths={['M6 12h9a4 4 0 0 1 0 8H6V4h8a4 4 0 0 1 0 8']} />,
        shortcut: ['Mod', 'B'],
        isActive: (editor) => editor.isActive('bold'),
        canRun: (editor) => editor.can().toggleBold(),
        run: (editor) => editor.chain().focus().toggleBold().run(),
      },
      {
        label: 'Italic',
        icon: <Icon paths={['M19 4h-9', 'M14 20H5', 'M15 4 9 20']} />,
        shortcut: ['Mod', 'I'],
        isActive: (editor) => editor.isActive('italic'),
        canRun: (editor) => editor.can().toggleItalic(),
        run: (editor) => editor.chain().focus().toggleItalic().run(),
      },
      {
        label: 'Inline code',
        icon: <Icon paths={['m16 18 6-6-6-6', 'm8 6-6 6 6 6']} />,
        shortcut: ['Mod', 'E'],
        isActive: (editor) => editor.isActive('code'),
        canRun: (editor) => editor.can().toggleCode(),
        run: (editor) => editor.chain().focus().toggleCode().run(),
      },
    ],
  },
  {
    label: 'Blocks',
    tools: [
      {
        label: 'Bullet list',
        icon: (
          <Icon paths={['M9 6h12', 'M9 12h12', 'M9 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01']} />
        ),
        shortcut: ['Mod', 'Shift', '8'],
        isActive: (editor) => editor.isActive('bulletList'),
        canRun: (editor) => editor.can().toggleBulletList(),
        run: (editor) => editor.chain().focus().toggleBulletList().run(),
      },
      {
        label: 'Code block',
        icon: (
          <Icon
            paths={[
              'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2',
              'm10 9-3 3 3 3',
              'm14 15 3-3-3-3',
            ]}
          />
        ),
        shortcut: ['Mod', 'Alt', 'C'],
        isActive: (editor) => editor.isActive('codeBlock'),
        canRun: (editor) => editor.can().toggleCodeBlock(),
        run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
      },
      {
        label: 'Divider',
        icon: <Icon paths={['M4 12h16']} />,
        canRun: (editor) => editor.can().setHorizontalRule(),
        run: (editor) => editor.chain().focus().setHorizontalRule().run(),
      },
    ],
  },
];

const TOOLS = TOOL_GROUPS.flatMap((group) => group.tools);

// Each tool's position in TOOLS, for roving focus across groups.
let toolOffset = 0;
const INDEXED_GROUPS = TOOL_GROUPS.map((group) => ({
  label: group.label,
  tools: group.tools.map((tool) => ({ tool, index: toolOffset++ })),
}));

type ToolState = { active: boolean; enabled: boolean };

const INITIAL_TOOL_STATES: ToolState[] = TOOLS.map(() => ({ active: false, enabled: false }));

type EditorToolbarProps = {
  editor: Editor | null;
  /** Id of the editable element the toolbar acts on. */
  controls: string;
};

/**
 * WAI-ARIA toolbar: a single Tab stop, arrow keys / Home / End move between buttons.
 * Disabled tools stay focusable (aria-disabled) so keyboard users can still discover them.
 */
export function EditorToolbar({ editor, controls }: EditorToolbarProps) {
  const isMac = useIsMac();
  const [focusIndex, setFocusIndex] = useState(0);

  // Recomputed per transaction, but only re-renders when a button's state actually changes.
  const toolStates =
    useEditorState({
      editor,
      selector: ({ editor }) =>
        editor
          ? TOOLS.map((tool) => {
              const active = tool.isActive?.(editor) ?? false;
              // An active tool is always usable (clicking it toggles it off), even when TipTap
              // reports the command as a no-op, e.g. "Normal text" inside a paragraph.
              return { active, enabled: active || tool.canRun(editor) };
            })
          : INITIAL_TOOL_STATES,
    }) ?? INITIAL_TOOL_STATES;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = getNextIndex(event.key, focusIndex, TOOLS.length);
    if (next === null) return;

    event.preventDefault();
    setFocusIndex(next);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-tool]')[next]?.focus();
  }

  return (
    <div
      role='toolbar'
      aria-label='Formatting'
      aria-controls={controls}
      onKeyDown={handleKeyDown}
      className='sticky top-0 z-10 flex flex-wrap items-center gap-y-1 rounded-t-md border-b border-border bg-surface-muted p-1'
    >
      {INDEXED_GROUPS.map((group) => (
        <div
          key={group.label}
          role='group'
          aria-label={group.label}
          className='flex items-center gap-0.5 px-1 not-first:border-l not-first:border-border'
        >
          {group.tools.map(({ tool, index }) => (
            <ToolbarButton
              key={tool.label}
              tool={tool}
              editor={editor}
              state={toolStates[index]}
              isMac={isMac}
              tabbable={index === focusIndex}
              index={index}
              onFocusIndex={setFocusIndex}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

type ToolbarButtonProps = {
  tool: Tool;
  editor: Editor | null;
  state: ToolState;
  isMac: boolean;
  tabbable: boolean;
  index: number;
  onFocusIndex: (index: number) => void;
};

function ToolbarButton({
  tool,
  editor,
  state,
  isMac,
  tabbable,
  index,
  onFocusIndex,
}: ToolbarButtonProps) {
  // Keep focus (and the text selection) in the editor when clicking with a mouse/touch.
  function handleMouseDown(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  function handleClick() {
    onFocusIndex(index);
    if (editor && state.enabled) tool.run(editor);
  }

  function handleFocus() {
    onFocusIndex(index);
  }

  return (
    <button
      type='button'
      data-tool
      tabIndex={tabbable ? 0 : -1}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onFocus={handleFocus}
      aria-label={tool.label}
      aria-pressed={tool.isActive ? state.active : undefined}
      aria-disabled={state.enabled ? undefined : true}
      aria-keyshortcuts={tool.shortcut && toAriaKeyShortcut(tool.shortcut, isMac)}
      className='group relative inline-flex h-8 min-w-8 items-center justify-center rounded px-1.5 text-foreground hover:bg-border focus-visible:outline-2 focus-visible:outline-ring aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-disabled:cursor-not-allowed aria-disabled:hover:bg-transparent'
    >
      {/* Dim only the icon when disabled, so the tooltip stays fully legible. */}
      <span className='contents group-aria-disabled:*:opacity-40'>{tool.icon}</span>
      {/* Visual tooltip only; the name and shortcut are exposed via aria-label / aria-keyshortcuts.
          `hidden` (not opacity) so off-screen tooltips never cause horizontal scrolling. */}
      <span
        aria-hidden='true'
        className='pointer-events-none absolute top-full left-1/2 z-20 mt-1.5 hidden -translate-x-1/2 rounded bg-primary px-2 py-1 text-xs whitespace-nowrap text-primary-foreground shadow group-hover:block group-focus-visible:block'
      >
        {tool.label}
        {tool.shortcut && (
          <kbd className='ml-1.5 font-sans opacity-75'>{formatShortcut(tool.shortcut, isMac)}</kbd>
        )}
      </span>
    </button>
  );
}

function getNextIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % count;
    case 'ArrowLeft':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

const MAC_KEY_SYMBOLS: Record<string, string> = { Mod: '⌘', Alt: '⌥', Shift: '⇧' };

function formatShortcut(keys: Shortcut, isMac: boolean): string {
  return isMac
    ? keys.map((key) => MAC_KEY_SYMBOLS[key] ?? key).join('')
    : keys.map((key) => (key === 'Mod' ? 'Ctrl' : key)).join('+');
}

function toAriaKeyShortcut(keys: Shortcut, isMac: boolean): string {
  return keys.map((key) => (key === 'Mod' ? (isMac ? 'Meta' : 'Control') : key)).join('+');
}

function subscribeToNothing() {
  return () => {};
}

// Server render (and hydration) assume non-Mac; the client value applies right after,
// without a hydration mismatch or an effect.
function useIsMac(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => /Mac|iPhone|iPad/.test(navigator.userAgent),
    () => false,
  );
}

// Icon paths adapted from Lucide (ISC license).
function Icon({ paths }: { paths: string[] }) {
  return (
    <svg
      aria-hidden='true'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      className='size-4'
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

function TextIcon({ children }: { children: string }) {
  return (
    <span aria-hidden='true' className='text-sm font-semibold'>
      {children}
    </span>
  );
}

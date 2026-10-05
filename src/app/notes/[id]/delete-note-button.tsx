'use client';

import { useActionState, useId, useRef } from 'react';
import {
  alertClass,
  dangerButtonClass,
  dangerOutlineButtonClass,
  ghostButtonClass,
} from '@/components/styles';
import type { DeleteNoteState } from '../actions';

type DeleteNoteButtonProps = {
  /** deleteNoteAction.bind(null, noteId); redirects to /dashboard on success. */
  action: (state: DeleteNoteState) => Promise<DeleteNoteState>;
  noteTitle: string;
};

/**
 * "Delete" opens a native modal <dialog> (focus trap, Escape to close, inert background for
 * free). Cancel is the first focusable element, so it receives initial focus: the safe default.
 */
export function DeleteNoteButton({ action, noteTitle }: DeleteNoteButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, isPending] = useActionState(action, {});
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  function handleOpen() {
    dialogRef.current?.showModal();
  }

  function handleCancel() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type='button'
        aria-haspopup='dialog'
        onClick={handleOpen}
        className={dangerOutlineButtonClass}
      >
        Delete
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className='m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-surface p-6 text-foreground shadow-xl backdrop:bg-black/50'
      >
        <h2 id={titleId} className='text-lg font-semibold'>
          Delete this note?
        </h2>
        <p id={descriptionId} className='mt-2 text-sm break-words text-muted'>
          &ldquo;{noteTitle}&rdquo; will be permanently deleted. This can&apos;t be undone.
        </p>

        {state.error && (
          <p role='alert' className={`mt-4 ${alertClass}`}>
            {state.error}
          </p>
        )}

        <form action={formAction} className='mt-6 flex justify-end gap-3'>
          <button type='button' onClick={handleCancel} className={ghostButtonClass}>
            Cancel
          </button>
          <button type='submit' disabled={isPending} className={dangerButtonClass}>
            {isPending ? 'Deleting…' : 'Delete note'}
          </button>
        </form>
      </dialog>
    </>
  );
}

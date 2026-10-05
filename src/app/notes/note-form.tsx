'use client';

import Link from 'next/link';
import { useActionState, useId } from 'react';
import { RichTextEditor } from '@/components/rich-text-editor';
import { alertClass, ghostButtonClass, inputClass, primaryButtonClass } from '@/components/styles';
import type { NoteDoc } from '@/lib/note-content';
import { MAX_TITLE_LENGTH } from '@/lib/note-limits';
import type { NoteFormState } from './actions';

type NoteFormProps = {
  /** A server action, e.g. createNoteAction or updateNoteAction.bind(null, id). */
  action: (state: NoteFormState, formData: FormData) => Promise<NoteFormState>;
  initialTitle?: string;
  initialContent?: NoteDoc;
  initialShared?: boolean;
  submitLabel: { idle: string; pending: string };
  cancelHref: string;
};

/** Shared by the create and edit pages. */
export function NoteForm({
  action,
  initialTitle,
  initialContent,
  initialShared = false,
  submitLabel,
  cancelHref,
}: NoteFormProps) {
  const [state, formAction, isPending] = useActionState(action, {
    title: initialTitle,
    shared: initialShared,
  });
  const id = useId();
  const ids = {
    title: `${id}-title`,
    titleError: `${id}-title-error`,
    contentLabel: `${id}-content-label`,
    contentError: `${id}-content-error`,
    shared: `${id}-shared`,
    sharedHint: `${id}-shared-hint`,
  };
  const { errors } = state;

  return (
    <form action={formAction} className='flex flex-col gap-6'>
      <div className='flex flex-col gap-1.5'>
        <label htmlFor={ids.title} className='text-sm font-medium'>
          Title
        </label>
        <input
          id={ids.title}
          name='title'
          required
          maxLength={MAX_TITLE_LENGTH}
          defaultValue={state.title}
          aria-invalid={errors?.title ? true : undefined}
          aria-describedby={errors?.title ? ids.titleError : undefined}
          className={inputClass}
        />
        {errors?.title && <FieldError id={ids.titleError}>{errors.title}</FieldError>}
      </div>

      <div className='flex flex-col gap-1.5'>
        <span id={ids.contentLabel} className='text-sm font-medium'>
          Content
        </span>
        <RichTextEditor
          name='content'
          labelId={ids.contentLabel}
          describedById={ids.contentError}
          defaultValue={initialContent}
        />
        {errors?.content && <FieldError id={ids.contentError}>{errors.content}</FieldError>}
      </div>

      <div className='flex items-start gap-3 rounded-md border border-border bg-surface p-4'>
        <input
          id={ids.shared}
          name='shared'
          type='checkbox'
          defaultChecked={state.shared}
          aria-describedby={ids.sharedHint}
          className='mt-0.5 size-4 shrink-0 accent-primary'
        />
        <div>
          <label htmlFor={ids.shared} className='font-medium'>
            Share publicly
          </label>
          <p id={ids.sharedHint} className='mt-0.5 text-sm text-muted'>
            Anyone with the link can read this note without signing in. They can&apos;t edit or
            delete it. Turning this off disables the link immediately; turning it on again creates a
            new link.
          </p>
        </div>
      </div>

      {errors?.form && (
        <p role='alert' className={alertClass}>
          {errors.form}
        </p>
      )}

      <div className='flex items-center justify-end gap-3'>
        <Link href={cancelHref} className={ghostButtonClass}>
          Cancel
        </Link>
        <button type='submit' disabled={isPending} className={primaryButtonClass}>
          {isPending ? submitLabel.pending : submitLabel.idle}
        </button>
      </div>
    </form>
  );
}

function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} role='alert' className='text-sm text-danger'>
      {children}
    </p>
  );
}

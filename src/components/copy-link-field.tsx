'use client';

import { useId, useRef, useState, type FocusEvent } from 'react';
import { inputClass, secondaryButtonClass } from './styles';

type CopyStatus = 'idle' | 'copied' | 'failed';

const STATUS_TEXT: Record<CopyStatus, string> = {
  idle: '',
  copied: 'Link copied to clipboard.',
  failed: "Couldn't copy automatically. Select the link and copy it manually.",
};

/** Read-only link with a Copy button; the result is announced to screen readers. */
export function CopyLinkField({ label, url }: { label: string; url: string }) {
  // Real UI state: the button label and the announcement depend on it.
  const [status, setStatus] = useState<CopyStatus>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const id = useId();

  async function handleCopy() {
    clearTimeout(resetTimer.current);
    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
    resetTimer.current = setTimeout(() => setStatus('idle'), 3000);
  }

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    event.currentTarget.select();
  }

  return (
    <div className='flex flex-col gap-1.5'>
      <label htmlFor={id} className='text-sm font-medium'>
        {label}
      </label>
      <div className='flex gap-2'>
        <input
          id={id}
          type='url'
          readOnly
          value={url}
          onFocus={handleFocus}
          className={`min-w-0 flex-1 ${inputClass}`}
        />
        <button type='button' onClick={handleCopy} className={`shrink-0 ${secondaryButtonClass}`}>
          {status === 'copied' ? 'Copied' : 'Copy link'}
        </button>
      </div>
      <p role='status' className='min-h-5 text-sm text-muted'>
        {STATUS_TEXT[status]}
      </p>
    </div>
  );
}

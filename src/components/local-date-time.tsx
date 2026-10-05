'use client';

import { useSyncExternalStore } from 'react';

// Explicit fields rather than dateStyle/timeStyle: those can't be combined with timeZoneName.
const FIELDS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

const SERVER_FORMAT = new Intl.DateTimeFormat('en-US', {
  ...FIELDS,
  timeZone: 'UTC',
  timeZoneName: 'short',
});

const LOCAL_FORMAT = new Intl.DateTimeFormat('en-US', FIELDS);

function subscribeToNothing() {
  return () => {};
}

/**
 * Renders an ISO timestamp in the viewer's time zone. The server (and hydration) render UTC so
 * the markup matches; the browser then switches to local time without an effect or a mismatch.
 */
export function LocalDateTime({ value }: { value: string }) {
  const isClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const date = new Date(value);

  return <time dateTime={value}>{(isClient ? LOCAL_FORMAT : SERVER_FORMAT).format(date)}</time>;
}

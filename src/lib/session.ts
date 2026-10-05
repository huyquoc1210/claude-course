import 'server-only';

import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

// Data-access-layer entry point for sessions. Memoized per request, so calling it from
// generateMetadata, the page and nested components costs a single session lookup.
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export type CurrentUser = { name: string; email: string };

// DTO for UI: only the fields components need, never the session token or ids.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  return session ? { name: session.user.name, email: session.user.email } : null;
});

// Call at the top of every protected page / server action / route handler.
// Deliberately not done in a layout: layouts don't re-run on client navigation.
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect('/auth');
  return session;
}

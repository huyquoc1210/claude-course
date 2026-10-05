import 'server-only';

import { cache } from 'react';
import { getNote } from '@/lib/notes-repo';
import { requireSession } from '@/lib/session';

/**
 * The current user's note, or null (missing or not owned, indistinguishable). Memoized per
 * request so generateMetadata and the page share one session check and one DB lookup.
 */
export const loadNote = cache(async (id: string) => {
  const { user } = await requireSession();
  return getNote(user.id, id);
});

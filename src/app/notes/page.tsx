import { requireSession } from '@/lib/session';

export const runtime = 'nodejs';

export default async function NotesPage() {
  await requireSession();

  return <h1>Notes list page</h1>;
}

'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export async function signOutAction() {
  // Revokes the session in the DB; the nextCookies() plugin clears the session cookie.
  await auth.api.signOut({ headers: await headers() });
  redirect('/auth');
}

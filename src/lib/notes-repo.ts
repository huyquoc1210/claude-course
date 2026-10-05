import 'server-only';

import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { parseNoteContent, type NoteDoc } from '@/lib/note-content';
import { MAX_NOTES_PER_USER } from '@/lib/note-limits';

// The only module that touches the notes table (SPEC §11.2). Every owner-facing function takes
// the session user's id from the caller (never from the request) and scopes its query to it.
// The single public read, getSharedNote, is keyed by share token and returns no owner data.

// nanoid's alphabet; ids and share tokens have different lengths so they can't be mixed up.
const NOTE_ID = /^[\w-]{21}$/;
const SHARE_TOKEN_LENGTH = 32; // ≈190 bits from a CSPRNG (SPEC §11.3: 21+ chars)
const SHARE_TOKEN = new RegExp(`^[\\w-]{${SHARE_TOKEN_LENGTH}}$`);

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

function newShareToken(): string {
  return nanoid(SHARE_TOKEN_LENGTH);
}

export type NoteInput = { title: string; content: NoteDoc; shared: boolean };

// --- Create ----------------------------------------------------------------------------------

const countNotesByUser = db.prepare<[userId: string], { count: number }>(
  'SELECT count(*) AS count FROM notes WHERE user_id = ?',
);

const insertNote = db.prepare<
  [{ id: string; userId: string; title: string; content: string; shareToken: string | null }]
>(
  `INSERT INTO notes (id, user_id, title, content, share_token, shared_at)
   VALUES (@id, @userId, @title, @content, @shareToken,
           CASE WHEN @shareToken IS NULL THEN NULL ELSE ${NOW} END)`,
);

type CreateNoteResult = { ok: true; id: string } | { ok: false; reason: 'limit-reached' };

// Count + insert in one transaction so concurrent requests can't exceed the cap.
export const createNote = db.transaction((userId: string, input: NoteInput): CreateNoteResult => {
  const { count } = countNotesByUser.get(userId)!;
  if (count >= MAX_NOTES_PER_USER) return { ok: false, reason: 'limit-reached' };

  const id = nanoid();
  insertNote.run({
    id,
    userId,
    title: input.title,
    content: JSON.stringify(input.content),
    shareToken: input.shared ? newShareToken() : null,
  });
  return { ok: true, id };
});

// --- Owner reads -----------------------------------------------------------------------------

export type NoteSummary = { id: string; title: string; updatedAt: string; isShared: boolean };

export type Note = {
  id: string;
  title: string;
  /** null if the stored JSON no longer passes validation (never rendered unvalidated). */
  content: NoteDoc | null;
  /** Present only while the note is publicly shared. */
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
};

// Newest first; served by idx_notes_user_updated. Content is not loaded for the list.
const selectNotesByUser = db.prepare<
  [userId: string],
  { id: string; title: string; updated_at: string; is_shared: 0 | 1 }
>(
  `SELECT id, title, updated_at, share_token IS NOT NULL AS is_shared
   FROM notes WHERE user_id = ? ORDER BY updated_at DESC, id`,
);

const selectNote = db.prepare<
  [id: string, userId: string],
  {
    id: string;
    title: string;
    content: string;
    share_token: string | null;
    created_at: string;
    updated_at: string;
  }
>(
  'SELECT id, title, content, share_token, created_at, updated_at FROM notes WHERE id = ? AND user_id = ?',
);

export function listNotes(userId: string): NoteSummary[] {
  return selectNotesByUser.all(userId).map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at,
    isShared: row.is_shared === 1,
  }));
}

/** Returns null both for missing notes and notes owned by someone else (SPEC §11.2). */
export function getNote(userId: string, id: string): Note | null {
  if (!NOTE_ID.test(id)) return null;

  const row = selectNote.get(id, userId);
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    content: parseNoteContent(row.content),
    shareToken: row.share_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Public read -----------------------------------------------------------------------------

export type SharedNote = { title: string; content: NoteDoc | null; updatedAt: string };

// Only the fields the public page shows: no id, owner, email or timestamps of sharing (SPEC §11.3).
const selectSharedNote = db.prepare<
  [shareToken: string],
  { title: string; content: string; updated_at: string }
>('SELECT title, content, updated_at FROM notes WHERE share_token = ?');

/** null for malformed, unknown and revoked tokens alike. */
export function getSharedNote(shareToken: string): SharedNote | null {
  if (!SHARE_TOKEN.test(shareToken)) return null; // reject before touching the DB

  const row = selectSharedNote.get(shareToken);
  if (!row) return null;

  return { title: row.title, content: parseNoteContent(row.content), updatedAt: row.updated_at };
}

// --- Update / delete -------------------------------------------------------------------------

// Sharing semantics:
// - stays on  → keep the existing token (the link keeps working)
// - turned on → new token (an old, revoked link is never reused)
// - off       → token and shared_at cleared, so the old link 404s immediately
const updateNoteStatement = db.prepare<
  [{ title: string; content: string; shared: 0 | 1; newToken: string; id: string; userId: string }]
>(
  `UPDATE notes SET
     title = @title,
     content = @content,
     updated_at = ${NOW},
     share_token = CASE WHEN @shared = 1 THEN COALESCE(share_token, @newToken) ELSE NULL END,
     shared_at   = CASE WHEN @shared = 1 THEN COALESCE(shared_at, ${NOW}) ELSE NULL END
   WHERE id = @id AND user_id = @userId`,
);

const deleteNoteStatement = db.prepare<[id: string, userId: string]>(
  'DELETE FROM notes WHERE id = ? AND user_id = ?',
);

/** Returns false if the note doesn't exist or belongs to someone else (indistinguishable). */
export function updateNote(userId: string, id: string, input: NoteInput): boolean {
  if (!NOTE_ID.test(id)) return false;
  const { changes } = updateNoteStatement.run({
    title: input.title,
    content: JSON.stringify(input.content),
    shared: input.shared ? 1 : 0,
    newToken: newShareToken(), // only used if sharing is being turned on
    id,
    userId,
  });
  return changes === 1;
}

/** Returns false if the note doesn't exist or belongs to someone else (indistinguishable). */
export function deleteNote(userId: string, id: string): boolean {
  if (!NOTE_ID.test(id)) return false;
  return deleteNoteStatement.run(id, userId).changes === 1;
}

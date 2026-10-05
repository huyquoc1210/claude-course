import type Database from 'better-sqlite3';
import type { NoteDoc } from '@/lib/note-content';
import { openDatabase } from '@/lib/open-database';

/** A fresh in-memory database with the full app schema. */
export function createTestDb(): Database.Database {
  return openDatabase(':memory:');
}

/** Inserts a minimal better-auth user row (notes.user_id references it). */
export function insertUser(db: Database.Database, id: string): void {
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO "user" (id, name, email, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
  ).run(id, id, `${id}@example.com`, now, now);
}

/** Removes all rows so each test starts from an empty database. */
export function resetDb(db: Database.Database): void {
  db.exec('DELETE FROM notes; DELETE FROM session; DELETE FROM account; DELETE FROM "user";');
}

export function docWithText(text: string): NoteDoc {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

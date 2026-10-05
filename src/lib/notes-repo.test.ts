import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db';
import { MAX_NOTES_PER_USER } from '@/lib/note-limits';
import {
  createNote,
  deleteNote,
  getNote,
  getSharedNote,
  listNotes,
  updateNote,
  type NoteInput,
} from '@/lib/notes-repo';
import { docWithText, insertUser, resetDb } from '@/test/test-db';

// Real SQL against an in-memory database instead of the file at DB_PATH.
vi.mock('@/lib/db', async () => {
  const { createTestDb } = await import('@/test/test-db');
  return { db: createTestDb() };
});

const ALICE = 'alice';
const BOB = 'bob';

const input = (overrides: Partial<NoteInput> = {}): NoteInput => ({
  title: 'Title',
  content: docWithText('body'),
  shared: false,
  ...overrides,
});

function create(userId: string, overrides?: Partial<NoteInput>): string {
  const result = createNote(userId, input(overrides));
  if (!result.ok) throw new Error('createNote failed');
  return result.id;
}

const shareToken = (userId: string, id: string) => getNote(userId, id)!.shareToken;

const row = (id: string) =>
  db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Record<string, string | null>;

beforeEach(() => {
  resetDb(db);
  insertUser(db, ALICE);
  insertUser(db, BOB);
});

describe('createNote', () => {
  it('stores the note for its owner', () => {
    const id = create(ALICE, { title: 'Hello', content: docWithText('world') });

    expect(id).toMatch(/^[\w-]{21}$/);
    expect(getNote(ALICE, id)).toMatchObject({
      id,
      title: 'Hello',
      content: docWithText('world'),
      shareToken: null,
    });
  });

  it('creates a share token only when shared', () => {
    const shared = create(ALICE, { shared: true });

    expect(shareToken(ALICE, shared)).toMatch(/^[\w-]{32}$/);
    expect(row(shared).shared_at).not.toBeNull();
    expect(row(create(ALICE)).shared_at).toBeNull();
  });

  it('refuses to exceed the per-user note limit', () => {
    const insert = db.prepare("INSERT INTO notes (id, user_id, content) VALUES (?, ?, '{}')");
    db.transaction(() => {
      for (let i = 0; i < MAX_NOTES_PER_USER; i++) insert.run(`bulk-${i}`, ALICE);
    })();

    expect(createNote(ALICE, input())).toEqual({ ok: false, reason: 'limit-reached' });
    expect(createNote(BOB, input()).ok).toBe(true);
  });
});

describe('listNotes', () => {
  it("returns only the user's own notes, newest first", () => {
    const older = create(ALICE, { title: 'Older' });
    const newer = create(ALICE, { title: 'Newer', shared: true });
    create(BOB, { title: "Bob's" });
    db.prepare('UPDATE notes SET updated_at = ? WHERE id = ?').run(
      '2020-01-01T00:00:00.000Z',
      older,
    );
    db.prepare('UPDATE notes SET updated_at = ? WHERE id = ?').run(
      '2021-01-01T00:00:00.000Z',
      newer,
    );

    expect(listNotes(ALICE)).toEqual([
      { id: newer, title: 'Newer', updatedAt: '2021-01-01T00:00:00.000Z', isShared: true },
      { id: older, title: 'Older', updatedAt: '2020-01-01T00:00:00.000Z', isShared: false },
    ]);
  });

  it('returns an empty list for a user without notes', () => {
    expect(listNotes(BOB)).toEqual([]);
  });
});

describe('getNote', () => {
  it("returns null for another user's note, same as for a missing one", () => {
    const id = create(ALICE);

    expect(getNote(BOB, id)).toBeNull();
    expect(getNote(BOB, 'x'.repeat(21))).toBeNull();
  });

  it('returns null for malformed ids without querying', () => {
    expect(getNote(ALICE, "' OR 1=1 --")).toBeNull();
    expect(getNote(ALICE, '')).toBeNull();
  });

  it('returns null content when the stored JSON no longer validates', () => {
    const id = create(ALICE);
    db.prepare('UPDATE notes SET content = ? WHERE id = ?').run(
      '{"type":"doc","content":[{"type":"image"}]}',
      id,
    );

    expect(getNote(ALICE, id)!.content).toBeNull();
  });
});

describe('updateNote', () => {
  it('updates title, content and updated_at for the owner', () => {
    const id = create(ALICE);
    db.prepare('UPDATE notes SET updated_at = ? WHERE id = ?').run('2000-01-01T00:00:00.000Z', id);

    expect(updateNote(ALICE, id, input({ title: 'New', content: docWithText('changed') }))).toBe(
      true,
    );
    expect(getNote(ALICE, id)).toMatchObject({ title: 'New', content: docWithText('changed') });
    expect(getNote(ALICE, id)!.updatedAt > '2000-01-01T00:00:00.000Z').toBe(true);
  });

  it("can't touch another user's note", () => {
    const id = create(ALICE, { title: 'Original' });

    expect(updateNote(BOB, id, input({ title: 'Hacked', shared: true }))).toBe(false);
    expect(getNote(ALICE, id)).toMatchObject({ title: 'Original', shareToken: null });
  });

  it('returns false for missing and malformed ids', () => {
    expect(updateNote(ALICE, 'x'.repeat(21), input())).toBe(false);
    expect(updateNote(ALICE, 'bad id', input())).toBe(false);
  });

  it('keeps the same token while a note stays shared', () => {
    const id = create(ALICE, { shared: true });
    const token = shareToken(ALICE, id);
    const sharedAt = row(id).shared_at;

    updateNote(ALICE, id, input({ title: 'Edited', shared: true }));

    expect(shareToken(ALICE, id)).toBe(token);
    expect(row(id).shared_at).toBe(sharedAt);
  });

  it('clears the token when sharing is turned off', () => {
    const id = create(ALICE, { shared: true });
    const token = shareToken(ALICE, id)!;

    updateNote(ALICE, id, input({ shared: false }));

    expect(shareToken(ALICE, id)).toBeNull();
    expect(row(id).shared_at).toBeNull();
    expect(getSharedNote(token)).toBeNull();
  });

  it('issues a new token when sharing is turned back on', () => {
    const id = create(ALICE, { shared: true });
    const first = shareToken(ALICE, id)!;

    updateNote(ALICE, id, input({ shared: false }));
    updateNote(ALICE, id, input({ shared: true }));
    const second = shareToken(ALICE, id)!;

    expect(second).toMatch(/^[\w-]{32}$/);
    expect(second).not.toBe(first);
    expect(getSharedNote(first)).toBeNull();
    expect(getSharedNote(second)).not.toBeNull();
  });
});

describe('deleteNote', () => {
  it('deletes the owner’s note', () => {
    const id = create(ALICE);

    expect(deleteNote(ALICE, id)).toBe(true);
    expect(getNote(ALICE, id)).toBeNull();
  });

  it("can't delete another user's note", () => {
    const id = create(ALICE);

    expect(deleteNote(BOB, id)).toBe(false);
    expect(getNote(ALICE, id)).not.toBeNull();
  });

  it('returns false for missing and malformed ids', () => {
    expect(deleteNote(ALICE, 'x'.repeat(21))).toBe(false);
    expect(deleteNote(ALICE, 'bad id')).toBe(false);
  });

  it("revokes a deleted note's public link", () => {
    const id = create(ALICE, { shared: true });
    const token = shareToken(ALICE, id)!;

    deleteNote(ALICE, id);

    expect(getSharedNote(token)).toBeNull();
  });

  it("removes a user's notes when the user is deleted", () => {
    const id = create(ALICE);
    db.prepare('DELETE FROM "user" WHERE id = ?').run(ALICE);

    expect(row(id)).toBeUndefined();
  });
});

describe('getSharedNote', () => {
  it('returns only title, content and updatedAt', () => {
    const id = create(ALICE, { title: 'Public', content: docWithText('hi'), shared: true });

    const shared = getSharedNote(shareToken(ALICE, id)!);

    expect(shared).toEqual({
      title: 'Public',
      content: docWithText('hi'),
      updatedAt: row(id).updated_at,
    });
  });

  it.each([
    ['unknown', 'A'.repeat(32)],
    ['too short', 'A'.repeat(21)],
    ['too long', 'A'.repeat(33)],
    ['containing invalid characters', `${'A'.repeat(31)}/`],
    ['empty', ''],
  ])('returns null for a token that is %s', (_label, token) => {
    create(ALICE, { shared: true });
    expect(getSharedNote(token)).toBeNull();
  });
});

describe('database constraints', () => {
  it('rejects invalid JSON content', () => {
    expect(() =>
      db
        .prepare("INSERT INTO notes (id, user_id, content) VALUES ('n1', ?, 'not json')")
        .run(ALICE),
    ).toThrow(/CHECK constraint/);
  });

  it('rejects notes for users that do not exist', () => {
    expect(() =>
      db.prepare("INSERT INTO notes (id, user_id, content) VALUES ('n1', 'ghost', '{}')").run(),
    ).toThrow(/FOREIGN KEY/);
  });
});

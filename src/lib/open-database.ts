import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

// Opens a database and applies the schema. Side-effect free on import, so tests can open
// their own in-memory database (`openDatabase(':memory:')`) without touching the real file.

// better-auth core tables mirror the schema its CLI generates for SQLite;
// `notes` is owned by the app. Everything is idempotent so it can run on every boot.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS "user" (
  "id"            TEXT PRIMARY KEY,
  "name"          TEXT NOT NULL,
  "email"         TEXT NOT NULL UNIQUE,
  "emailVerified" INTEGER NOT NULL DEFAULT 0,
  "image"         TEXT,
  "createdAt"     TEXT NOT NULL,
  "updatedAt"     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  "id"        TEXT PRIMARY KEY,
  "expiresAt" TEXT NOT NULL,
  "token"     TEXT NOT NULL UNIQUE,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId"    TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session"("userId");

CREATE TABLE IF NOT EXISTS "account" (
  "id"                    TEXT PRIMARY KEY,
  "accountId"             TEXT NOT NULL,
  "providerId"            TEXT NOT NULL,
  "userId"                TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken"           TEXT,
  "refreshToken"          TEXT,
  "idToken"               TEXT,
  "accessTokenExpiresAt"  TEXT,
  "refreshTokenExpiresAt" TEXT,
  "scope"                 TEXT,
  "password"              TEXT,
  "createdAt"             TEXT NOT NULL,
  "updatedAt"             TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account"("userId");

CREATE TABLE IF NOT EXISTS "verification" (
  "id"         TEXT PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value"      TEXT NOT NULL,
  "expiresAt"  TEXT NOT NULL,
  "createdAt"  TEXT,
  "updatedAt"  TEXT
);
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification"("identifier");

CREATE TABLE IF NOT EXISTS notes (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL CHECK (json_valid(content)),
  share_token TEXT UNIQUE,
  shared_at   TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON notes(user_id, updated_at DESC);
`;

export function openDatabase(file: string): Database.Database {
  // Create the database directory on first run (e.g. ./data or a fresh volume mount).
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });

  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  db.transaction(() => db.exec(SCHEMA))();
  return db;
}

import type Database from 'better-sqlite3';
import path from 'node:path';
import { env } from '@/lib/env';
import { openDatabase } from '@/lib/open-database';

// Single SQLite file shared by better-auth and the app (SPEC §4).
// better-sqlite3 is a native module: only import this from Node.js runtime code.

// `next build` loads this module in several parallel workers but never needs real data (all
// routes are dynamic). An in-memory database avoids lock contention on the file and keeps the
// build from creating a stray database in the build directory.
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

// Relative paths resolve against the working directory.
const DB_PATH = isBuild ? ':memory:' : path.resolve(env.DB_PATH);

// Reuse one connection across dev hot reloads instead of leaking a new one per edit.
const globalForDb = globalThis as unknown as { __db?: Database.Database };

export const db: Database.Database = globalForDb.__db ?? openDatabase(DB_PATH);

if (process.env.NODE_ENV !== 'production') globalForDb.__db = db;

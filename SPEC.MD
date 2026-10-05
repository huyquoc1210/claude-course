# Note Taking App: Answers & Requirements

Here are my answers to your questions. Please use them to write the full technical specification.

---

## 1. Authentication

- Email + password only (better-auth `emailAndPassword`). No OAuth, no email verification, no password reset in v1.
- Cookie-based sessions via better-auth. Protected pages and API routes are checked server-side with `auth.api.getSession()`.

## 2. Public Sharing

- Sharing generates a random, unguessable token (nanoid, 21+ chars), stored in `notes.share_token`.
- Public URL: `/s/<token>`. Read-only, no login required, `<meta name="robots" content="noindex">`.
- "Stop sharing" sets `share_token = NULL`, so the old link returns 404 immediately.
- Sharing again generates a **new** token (an old link is never reused).
- The public page exposes only `title`, `content` and `updated_at`. Never `user_id` or email.

## 3. Note Fields / List

- Each note has a `title` (plain text input) and `content` (TipTap JSON).
- Notes list: newest-first by `updated_at`. No search, no pagination in v1.

## 4. Database

SQLite, one file, shared by better-sqlite3 and better-auth.

Pragmas on connect: `journal_mode = WAL`, `foreign_keys = ON`.

### better-auth tables (standard schema, generated via the better-auth CLI)

**user**

| Column        | Type                       |
| ------------- | -------------------------- |
| id            | TEXT PRIMARY KEY           |
| name          | TEXT NOT NULL              |
| email         | TEXT NOT NULL UNIQUE       |
| emailVerified | INTEGER NOT NULL DEFAULT 0 |
| image         | TEXT                       |
| createdAt     | TEXT NOT NULL              |
| updatedAt     | TEXT NOT NULL              |

**session**

| Column    | Type                                                |
| --------- | --------------------------------------------------- |
| id        | TEXT PRIMARY KEY                                    |
| expiresAt | TEXT NOT NULL                                       |
| token     | TEXT NOT NULL UNIQUE                                |
| createdAt | TEXT NOT NULL                                       |
| updatedAt | TEXT NOT NULL                                       |
| ipAddress | TEXT                                                |
| userAgent | TEXT                                                |
| userId    | TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE |

**account**

| Column                | Type                                                |
| --------------------- | --------------------------------------------------- |
| id                    | TEXT PRIMARY KEY                                    |
| accountId             | TEXT NOT NULL                                       |
| providerId            | TEXT NOT NULL                                       |
| userId                | TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE |
| accessToken           | TEXT                                                |
| refreshToken          | TEXT                                                |
| idToken               | TEXT                                                |
| accessTokenExpiresAt  | TEXT                                                |
| refreshTokenExpiresAt | TEXT                                                |
| scope                 | TEXT                                                |
| password              | TEXT (hashed password for email+password login)     |
| createdAt             | TEXT NOT NULL                                       |
| updatedAt             | TEXT NOT NULL                                       |

**verification**

| Column     | Type             |
| ---------- | ---------------- |
| id         | TEXT PRIMARY KEY |
| identifier | TEXT NOT NULL    |
| value      | TEXT NOT NULL    |
| expiresAt  | TEXT NOT NULL    |
| createdAt  | TEXT             |
| updatedAt  | TEXT             |

### App table

**notes**

| Column      | Type                                                         | Notes                                                         |
| ----------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| id          | TEXT PRIMARY KEY                                             | nanoid                                                        |
| user_id     | TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE          | owner                                                         |
| title       | TEXT NOT NULL DEFAULT ''                                     | max 200 chars (validated in API)                              |
| content     | TEXT NOT NULL                                                | TipTap JSON (`JSON.stringify`), `CHECK (json_valid(content))` |
| share_token | TEXT UNIQUE                                                  | NULL = private, non-NULL = publicly shared                    |
| shared_at   | TEXT                                                         | set when sharing starts, NULL when stopped                    |
| created_at  | TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) | ISO 8601 UTC                                                  |
| updated_at  | TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) | ISO 8601 UTC                                                  |

**Indexes**

```sql
CREATE INDEX idx_notes_user_updated ON notes(user_id, updated_at DESC);
-- share_token is already indexed via its UNIQUE constraint
```

All timestamps are ISO 8601 UTC strings. All queries use prepared statements with bound parameters (no string concatenation).

## 5. Saving Behavior

- Autosave with an 800ms debounce after the last keystroke, plus save on blur.
- Status indicator: "Saving…" / "Saved" / "Error".
- Updates go through `PATCH` and set `updated_at` on every save.

## 6. Code Snippets

- Plain monospace code blocks, no syntax highlighting.

## 7. Next.js Architecture

App Router with Route Handlers (REST-style):

| Method | Endpoint               | Purpose                           |
| ------ | ---------------------- | --------------------------------- |
| GET    | `/api/notes`           | List my notes                     |
| POST   | `/api/notes`           | Create a note                     |
| GET    | `/api/notes/:id`       | Get one (owner only)              |
| PATCH  | `/api/notes/:id`       | Update title/content (owner only) |
| DELETE | `/api/notes/:id`       | Delete (owner only)               |
| POST   | `/api/notes/:id/share` | Enable sharing (returns the URL)  |
| DELETE | `/api/notes/:id/share` | Disable sharing                   |
| \*     | `/api/auth/[...all]`   | better-auth handler               |

Pages: `/login`, `/register`, `/notes`, `/notes/[id]`, `/s/[token]` (public, server-rendered).

- Every note operation checks the session **and** filters by user: `WHERE id = ? AND user_id = ?`. Return 404 (not 403) for notes the user doesn't own.
- Validate all input with zod.
- Runtime must be Node.js (`export const runtime = 'nodejs'`) because better-sqlite3 is a native module.

## 8. Deployment

- Self-hosted: a single Node.js process (`next build` + `next start`) in Docker, with a mounted volume for the SQLite file (`DATABASE_PATH` env var).
- Required env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_PATH`.
- Single instance only (no horizontal scaling). Daily backup of the `.db` file.
- Runs behind a reverse proxy (Caddy / Nginx / Traefik) that terminates HTTPS.

## 9. Extras

- Responsive (mobile-friendly), light mode only.
- Tests:
  - Vitest for unit/API logic (especially authorization and sharing).
  - Playwright for 1-2 e2e flows: register → create note → share → open public link → stop sharing → link returns 404.

## 10. TipTap Config

- StarterKit with only: Bold, Italic, Heading (levels 1-3), Paragraph, Code, CodeBlock, BulletList + ListItem, HorizontalRule.
- Disable everything else (blockquote, ordered list, strike, etc.).
- The public page renders the JSON read-only via `generateHTML` or a non-editable TipTap instance using the same extensions.

---

## 11. Security

### 11.1 Authentication & Sessions

- Passwords are hashed by better-auth (scrypt by default). Never store or log plain-text passwords.
- Password policy: minimum 8 characters (set `minPasswordLength`), maximum 128.
- Session cookies must be `HttpOnly`, `Secure` (in production), and `SameSite=Lax`. Session expiry 7 days with sliding refresh (better-auth defaults, configured explicitly).
- Login errors are generic ("Invalid email or password") so the response never reveals whether an email is registered.
- `BETTER_AUTH_SECRET` is a random string of at least 32 chars, supplied via env var, never committed to git.
- Configure `trustedOrigins` in better-auth to the app's own origin only.

### 11.2 Authorization (preventing IDOR)

- Every `/api/notes/*` handler first resolves the session; no session → `401`.
- Every note query includes `AND user_id = ?` with the session's user id. The user id is **never** taken from the request body, query string or URL.
- A note that doesn't exist and a note owned by someone else both return `404` with an identical body.
- Authorization logic lives in one data-access layer (e.g. `lib/notes-repo.ts`) so no route can forget the ownership check. Unit tests cover cross-user access for every operation (get, patch, delete, share, unshare).

### 11.3 Public Sharing

- Share tokens come from a CSPRNG (`nanoid` with 21+ chars ≈ 126 bits of entropy). Tokens are never derived from the note id, user id or timestamps.
- `/s/[token]` validates the token format (regex + length) before querying the DB.
- Response `404` for unknown, malformed or revoked tokens (same body for all).
- The public page sets `Referrer-Policy: no-referrer` (so the token isn't leaked via the Referer header to links inside a note), `X-Robots-Tag: noindex, nofollow`, and `Cache-Control: no-store` (so revoked links stop working immediately and aren't served from a shared cache).
- The public query selects only `title`, `content`, `updated_at`. No `user_id`, email or author info.
- Rate limit the public route per IP to slow token guessing.

### 11.4 Input Validation & Content Safety (XSS)

- All request bodies, params and query strings are validated with zod. Reject unknown fields (`.strict()`).
- Limits: title ≤ 200 chars; request body ≤ 1 MB; content must be valid JSON.
- **Server-side TipTap schema validation:** before saving, validate that `content` is a TipTap `doc` and that every node/mark type is in the allowlist (doc, paragraph, text, heading 1-3, bold, italic, code, codeBlock, bulletList, listItem, horizontalRule). Reject anything else. Never trust the client editor to enforce this.
- Render content only through TipTap's `generateHTML` or a read-only TipTap instance. Never use `dangerouslySetInnerHTML` with raw user-supplied HTML.
- Since marks like links are not enabled, there are no user-controlled URLs, which removes the `javascript:` URL attack surface. If links are added later, restrict protocols to `http`, `https`, `mailto`.
- React's default escaping stays on everywhere else (titles, error messages, etc.).

### 11.5 SQL Injection

- Only prepared statements with bound parameters (`db.prepare("... WHERE id = ? AND user_id = ?").get(id, userId)`). No string concatenation or template-literal SQL with user data.
- `CHECK (json_valid(content))` adds a DB-level guard against malformed JSON.

### 11.6 CSRF & CORS

- State-changing routes use `POST` / `PATCH` / `DELETE` only (never `GET`).
- `SameSite=Lax` cookies plus better-auth's origin checking protect auth routes.
- For note routes, verify the `Origin` header matches the app's origin on every mutating request and reject mismatches with `403`.
- No CORS headers are added: the API is same-origin only.

### 11.7 Rate Limiting & Abuse Protection

- Enable better-auth's built-in rate limiter, with stricter limits on `/sign-in/email` and `/sign-up/email` (e.g. 5 attempts per minute per IP).
- Rate limit `/api/notes` mutations per user (e.g. 60/min) and `/s/[token]` per IP.
- Because the app is a single instance, an in-memory limiter is sufficient. (A shared store would be needed if it ever scales out.)
- Cap notes per user (e.g. 1,000) and content size per note (e.g. 500 KB) to prevent storage abuse.

### 11.8 HTTP Security Headers

Set globally in `next.config.ts` (or middleware):

- `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` (adjust for Next.js nonces as needed)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin` (overridden to `no-referrer` on `/s/*`)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (production, over HTTPS only)
- `Permissions-Policy`: disable camera, microphone, geolocation

### 11.9 Secrets, Data & Infrastructure

- Secrets live only in environment variables / Docker secrets. `.env*` files are in `.gitignore`.
- The SQLite file sits on a mounted volume with permissions limited to the app user; the container runs as a **non-root** user.
- The database file is never served statically (keep it outside `public/`).
- HTTPS is mandatory in production (terminated by the reverse proxy); redirect HTTP → HTTPS.
- Daily backup of the `.db` file (use `sqlite3 .backup` or `VACUUM INTO`, not a raw file copy while the DB is in use), stored off-host, with a periodic restore test.
- Deleting a user cascades to sessions, accounts and notes (`ON DELETE CASCADE`, with `foreign_keys = ON`).

### 11.10 Logging & Dependencies

- Log auth failures and authorization failures (user id, route, timestamp). Never log passwords, session tokens, share tokens or note content.
- Error responses to clients are generic; stack traces stay in server logs only.
- Run `npm audit` in CI, pin the lockfile, and keep Next.js, better-auth, TipTap and better-sqlite3 updated.

### 11.11 Security Tests

- Unit/API tests (Vitest): unauthenticated access returns 401; user B cannot get/patch/delete/share user A's note (404); invalid TipTap node types are rejected; oversize payloads are rejected; revoked token returns 404.
- E2E (Playwright): the full share → open → unshare → 404 flow, plus a check that the public page doesn't expose user data.

---

## Request

Please write the full technical specification now, including: architecture overview, folder structure, DB schema and SQL, API endpoints with request/response examples, auth flow, TipTap extension configuration, sharing logic, the security measures above, and a recommended build order.

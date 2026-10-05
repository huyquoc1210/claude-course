# CLAUDE.md

<!-- This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. -->

We're building the app described in @SPEC.MD. Read that file for general architectural tasks or to double-check the exact database structure, tech stack or application architecture.

Keep your replies extremely concise and focus on conveying the key information. No unnecessary fluff, no long code snippets.

Whenever working with any third-party library or something similar, you MUST look up the official documentation to ensure that you're working with up-to-date information.
Use the DocsExplorer subagent for efficient documentation lookup.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (`packageManager: pnpm@11.6.0`). Do not use npm/yarn.

- `pnpm dev` — dev server on http://localhost:3000
- `pnpm build` / `pnpm start` — production build and serve
- `pnpm lint` — ESLint 9 flat config (`eslint.config.mjs`, extends `eslint-config-next` core-web-vitals + typescript)
- Type check: `pnpm exec tsc --noEmit`

- `pnpm test` — Vitest unit tests, single run (`pnpm test:watch` for watch mode); `pnpm test src/lib/notes-repo.test.ts` for one file

Vitest (`vitest.config.mts`): tests live next to the code as `src/**/*.test.ts`, Node environment. DB-backed tests mock `@/lib/db` with an in-memory database from `src/test/test-db.ts`; `server-only` is aliased to a stub. Playwright e2e (per spec) is not set up yet.

## Stack

Next.js 16 (App Router, `src/app/`), React 19, TypeScript strict, Tailwind CSS v4 (via `@tailwindcss/postcss`, no `tailwind.config`), better-auth, TipTap v3, zod v4. Import alias `@/*` → `src/*`.

Next.js 16 differs from older versions — per AGENTS.md, read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code.

## Project direction: SPEC.MD

The repo is currently the create-next-app scaffold; `SPEC.MD` defines the app being built — a **note-taking app with public sharing**. Read it before implementing features. Key architectural decisions from it:

- **Data:** single SQLite file (`DATABASE_PATH`) shared by better-sqlite3 and better-auth. Pragmas `journal_mode = WAL`, `foreign_keys = ON`. better-auth tables come from the better-auth CLI; the app owns a `notes` table (content is TipTap JSON with `CHECK (json_valid(content))`, nullable unique `share_token`). Prepared statements with bound params only. better-sqlite3 and nanoid are not yet installed.
- **Runtime:** any route touching the DB must be Node.js (`export const runtime = 'nodejs'`) — better-sqlite3 is native.
- **Auth:** better-auth email+password only, cookie sessions, handler at `/api/auth/[...all]`. Server-side checks via `auth.api.getSession()`.
- **API:** REST Route Handlers under `/api/notes` and `/api/notes/:id/share` (POST enable / DELETE disable). Pages: `/login`, `/register`, `/notes`, `/notes/[id]`, `/s/[token]` (public, server-rendered, noindex).
- **Authorization:** all ownership logic in one data-access layer (e.g. `lib/notes-repo.ts`); every query filters `WHERE id = ? AND user_id = ?` using the session user id (never from the request). Missing and not-owned notes both return an identical 404. Mutating note routes also verify the `Origin` header (403 on mismatch).
- **Validation:** zod `.strict()` on all inputs; title ≤ 200 chars. Server-side TipTap allowlist check on save (doc, paragraph, text, heading 1–3, bold, italic, code, codeBlock, bulletList, listItem, horizontalRule) — the editor's StarterKit must be configured to the same set.
- **Sharing:** new nanoid (21+ chars) token on every share; unshare sets it NULL. Public page selects only `title`, `content`, `updated_at`, renders via `generateHTML`/read-only TipTap (never `dangerouslySetInnerHTML` with raw HTML), and sends `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store`.
- **Editor saving:** 800ms debounced autosave + save on blur via PATCH, with Saving…/Saved/Error status.
- **Deployment:** single-instance self-hosted Docker; env vars `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_PATH`. In-memory rate limiting is acceptable because of the single instance.

See SPEC.MD §11 for the full security requirements (headers/CSP, rate limits, size caps, logging rules).

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

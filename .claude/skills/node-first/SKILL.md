---
name: node-first
description: Describes efficient usage of Node.js and Node.js APIs (modern, standards-based) for this project
---

# Node-First Development

We default to **Node.js** (20 LTS or newer) as our JavaScript runtime, with **npm** as package manager and task runner.
Assume Node.js is available unless explicitly stated otherwise.

## General Principles

- **PREFER** Node.js and npm over Bun, Deno, pnpm, or yarn
- **PREFER** Node's built-in features over third-party tools when available
- **PREFER** Node's native APIs (eg for file access, fetch, crypto, etc) over extra packages

## Package Management

- **USE** `npm install`, `npm install <pkg>`, `npm uninstall <pkg>`
- **AVOID** `bun`, `yarn`, `pnpm`
- Commit `package-lock.json` and use `npm ci` in CI
- Keep dependencies minimal and intentional

## Scripts & Tooling

- **PREFER** `npm run` for scripts
- **AVOID** Node's built-in test runner (`node --test`) => We'll use `Vitest` for testing
- **AVOID** hand-rolled bundling scripts => We'll use Vite for libraries and tooling, and `next build` for the Next.js app
- Use `tsx` to run standalone TypeScript scripts (eg DB init scripts)
- Avoid introducing extra task runners unless required

## Runtime & APIs

- **PREFER** Node's native and Web-standard APIs (global `fetch`, `node:fs/promises`, `node:path`, `process.env`)
- Import built-in modules with the `node:` prefix (eg `import { readFile } from "node:fs/promises"`)
- Use ES modules (`import` / `export`) instead of CommonJS (`require`)
- Load env files with `--env-file=.env` (or the framework's own handling, eg Next.js) instead of adding `dotenv`
- For SQLite use `better-sqlite3` (synchronous API), not Bun-specific clients
- Avoid Bun-specific APIs (`Bun.file`, `Bun.serve`, `bun:sqlite`, etc.)

## Performance & DX

- Prefer simple, explicit scripts over complex toolchains
- **AVOID** unnecessary abstractions

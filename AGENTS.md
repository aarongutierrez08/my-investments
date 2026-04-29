# my-investments

This file is the canonical source of project context for AI agents (refiner, developer, reviewer). It is also understood by Claude Code, Cursor, Codex, and other AI coding tools that follow the AGENTS.md convention.

When this document and any other prompt or skill disagree on a project-specific rule, **this document wins**. The agents must read it end-to-end before writing or reviewing code.

## What this project does

Investment portfolio tracker — track purchases, categories and custom labels for a personal portfolio that evolves into a multi-user social platform. See `VISION.md` for the long-term direction and `STAGES.md` for the staged roadmap.

## Tech stack

- **Language:** TypeScript (strict)
- **Framework:** Next.js 15 (App Router) + React 19
- **Styling:** Tailwind CSS 4
- **Database (Stage 2+):** Supabase / Postgres, accessed via `@supabase/supabase-js`. Money is `NUMERIC`, never `float`.
- **Validation:** Zod (already a dependency — must be used at all boundaries)
- **Test runner:** Vitest with jsdom + Testing Library
- **Auth (Stage 3+):** Supabase Auth (email + password)

## Commands

- `npm test` — run tests
- `npm run dev` — run the dev server
- `npm run build` — production build
- `npm run db:start` / `db:stop` — local Supabase up/down
- `npm run db:reset` — reset local DB to seed state

## Development workflow

This project follows **TDD** (Test-Driven Development). For every change:

1. Write a failing test that captures the expected behavior.
2. Run the test and confirm it fails for the right reason.
3. Implement the minimum code needed to make the test pass.
4. Refactor if needed, keeping tests green.

The developer agent MUST follow this flow.

## Users

- **Owner (Stage 1–3):** a single user tracking their own investments. Implicit identity in Stages 1–2; explicit auth in Stage 3.
- **Authenticated user (Stage 4+):** any user with their own isolated portfolio, enforced by Postgres RLS.
- **Viewer (Stage 5):** any authenticated user browsing other users' public portfolios or labels.
- **Forker (Stage 5):** any authenticated user copying a public label or organization template into their own workspace.

## Domain concepts

- **Investment:** a single purchase event of a financial instrument. Always represents an *acquisition*, never a sale. A sale is a future concept (`Sale` entity, not implemented). The fields:
  - `instrument` — free-text identifier (ticker, asset name). 1–100 chars.
  - `amount` — number of units acquired. Stored as `NUMERIC(20, 8)` in Postgres. Always > 0.
  - `price` — price per unit at purchase, in the user's reference currency (assumed single-currency for now). Stored as `NUMERIC(20, 4)`. Always ≥ 0 (zero allowed for gifts/inheritance).
  - `purchase_date` — calendar date of the purchase. Cannot be in the future.
  - `category` — closed enum (see below).
  - `notes` — optional free-text annotation.
  - `labels` — zero-to-many user-defined tags via the `investment_labels` join table.
- **Category:** a closed classification of investment type. Today: `Stocks`, `Crypto`, `Real Estate`, `Bonds`, `Cash`, `Other`. **Treated as enum until Stage 5.** Adding a category requires updating the SQL CHECK constraint, the TypeScript union, and the seed.
- **Label:** a user-defined tag with `id`, `name`, `color` (hex). Many-to-many with investments via `investment_labels`. **Single source of truth for tags — the legacy `labels: string[]` free-text field on `Investment` is being removed.**
- **Portfolio:** the set of investments + labels owned by one user. Not modeled as a standalone entity; emerges from `where user_id = auth.uid()`.
- **Money:** every monetary value MUST be `NUMERIC(precision, scale)` at the database level. In TypeScript code, money may be carried as `number` for display, but **arithmetic operations over money must avoid float drift** (use integer cents or BigInt when summing many values).

## Business rules

These are non-negotiable. The Developer must respect them; the Reviewer must enforce them.

- `amount > 0` always. Zero or negative units are not a valid Investment.
- `price >= 0` (zero allowed: gift, inheritance, airdrop).
- `purchase_date <= today`. Future-dated purchases are invalid.
- `category` must be one of the closed enum values until Stage 5 unlocks custom categories.
- An Investment with no labels is valid. An Investment with N labels has N rows in `investment_labels`.
- A Label name is unique **per user** (Stage 4+). In Stage 1–3, labels are effectively global because `user_id` is null.
- Deleting a Label removes all its `investment_labels` rows but never deletes the Investment itself.
- Deleting an Investment cascades to its `investment_labels` rows.

## Code conventions

These conventions exist to keep the codebase **professional, scalable, and reviewable** as it grows. Past iterations accumulated technical debt by ignoring them; that is no longer acceptable.

### File structure
- Tests live next to the file they test (`foo.ts` + `foo.test.ts`). No `__tests__/` directories.
- Library code lives in `lib/`, partitioned by domain entity once it grows: `lib/investments/`, `lib/labels/`, `lib/auth/`. Avoid dumping everything in `lib/storage.ts`.
- React components live in `app/` (route components) or in feature-scoped folders. Shared UI primitives go in `app/components/` only when they are genuinely reused.

### Component size
- **Hard ceiling: 300 lines per React component.** Above this, splitting is mandatory unless explicitly justified in the PR body.
- **Hard ceiling: 5 `useState` hooks per component.** When a component would exceed this, extract a sub-component or lift state into a custom hook.
- A component with >7 `useMemo` calls is doing too much. Split or extract a hook.
- Adding a new feature to a file already at the ceiling? Open a refactor issue first. Do not push the limits further.

### Avoiding parallel implementations
- Before implementing a new feature, search the codebase for an existing similar feature. If one exists, **extend it**; do not create a parallel path.
- If two implementations of the same concept already coexist (legacy + new), the migration must include **eliminating the legacy** in the same PR.
- Specific case being cleaned up: `Investment.labels: string[]` (free-text legacy) and `Investment.labelIds: string[]` (relational). The relational form is canonical. The free-text legacy field must be removed during Stage 2.

### Validation at boundaries
- Every input that crosses a boundary (form submit, API request body, fetched DB row, query param) MUST be validated with a **Zod schema** before being trusted. TypeScript `interface` declarations are not runtime guarantees.
- Zod schemas live next to the type they validate (`lib/types.ts` exports the type and the schema together).
- Do not write hand-rolled validation when a Zod schema would do.

### Testability
- Production code must not export underscore-prefixed test hooks (`_setTestDataFilePath` is a known mistake to avoid). Achieve testability through dependency injection: pass the file path / client / clock as a parameter, default to the production value.
- A component that's hard to test is a design smell. Refactor before piling on workarounds.

### Mocks vs. real boundaries
- Unit tests mock the Supabase client. Mocks are useful for logic, but they **do not validate the contract between the DB and the parsing layer** — the mock can return whatever shape the test author thinks is correct, even if PostgREST returns something else.
- Known trap: PostgREST returns `NUMERIC` columns as JSON `number`, not string. Schemas that assume strings will pass mocked tests but throw at runtime.
- Any PR that touches: a Zod schema for a DB row, a migration, a `select` shape, env-var loading, or the Supabase client wiring **must be smoke-tested against a running local Supabase** (`npm run db:start` + `npm run dev` + load `/`). Test results from the unit suite alone are not sufficient evidence.

### Money and arithmetic
- Money in the database: `NUMERIC(precision, scale)` always. `amount` uses `NUMERIC(20, 8)`, `price` uses `NUMERIC(20, 4)`.
- Money in TypeScript: prefer `number` for display only. When summing or averaging across many investments, use a strategy that avoids float drift (multiply to integer scale, sum, divide back; or use a decimal library if introduced via `package.json`).
- Never do `0.1 + 0.2` arithmetic on money paths.

### Database migrations
- Migrations are append-only and additive. New columns are nullable or have a default. Renames require two migrations (add new + backfill + drop old) across separate PRs.
- The seed (`supabase/seed.sql`) must be deterministic and reset-safe. `db:reset` is the standard way to bring the DB to a known state.

### Comments
- Default to no comments. Names should explain **what** the code does.
- Add a comment only when it explains a **non-obvious why**: a hidden constraint, a workaround for a documented bug, a subtle invariant. If removing the comment would not confuse a future reader, do not write it.
- Banned: comments that describe what the next line does, references to PR numbers or task IDs, "added for X" notes.

### TypeScript
- Strict mode is on. `any` is forbidden except in adapter shims at external boundaries (and even then, prefer `unknown` + Zod parsing).
- Types and Zod schemas live together; export both.
- Discriminated unions over boolean flags. If a function takes `mode: 'create' | 'edit'`, do not collapse it into `isEdit: boolean`.

## Agent overrides

These instructions override the default agent behavior for this project specifically.

### Developer

1. **Read AGENTS.md fully before writing code.** This file is authoritative for conventions, business rules, and architectural patterns.
2. **Before adding state, count.** If the component you're touching already has 5 or more `useState` hooks, do not add another one. Extract a sub-component or a custom hook first. If that requires a refactor that doesn't fit in the current issue, stop and propose a follow-up issue instead of forcing the change in.
3. **Before adding lines to a large file, check the size.** If the file is already >500 lines, do not pile on. Stop, propose a refactor issue separating concerns, then revisit. The current main offender is `app/InvestmentsTable.tsx` — adding to it without splitting is forbidden until it has been broken down.
4. **Detect and remove parallel implementations.** If you encounter two ways of representing the same concept (e.g., `Investment.labels: string[]` and `Investment.labelIds: string[]`), the canonical one is described in this AGENTS.md. Eliminate the legacy as part of your PR; do not write code that maintains both.
5. **Validate at boundaries with Zod.** When you add a form, an API route, or a function that consumes external data, write the Zod schema. Do not rely on TypeScript types for runtime safety.
6. **Use dependency injection over module-level mutable state.** If something needs to be mocked in tests, the production callsite should accept it as a parameter with a sensible default. Do not add `_setTestX` exports.
7. **Stay inside the active stage.** Read `STAGES.md`, identify the active stage, and respect its anti-priorities. Do not propose or sneak in features from future stages.
8. **One issue, one goal.** If your implementation is growing into a refactor or pulling in unrelated changes, stop and split. The reviewer will block multi-goal PRs.
9. **Smoke-test boundary changes against a real Supabase.** If the diff touches DB row parsing, migrations, `select` shapes, env-var loading, or the Supabase client, do not rely on unit tests alone: start the local DB and load the app once before declaring done. See "Mocks vs. real boundaries".

### Reviewer

The Reviewer must enforce all of the Code conventions and Agent overrides above. Specifically, mark a PR as `needs-work` if any of these hold:

1. The PR adds a new `useState` to a component that already has 5 or more, without first extracting structure.
2. The PR adds >50 net lines to a file already >500 lines, without an explicit justification of why splitting was deferred.
3. The PR introduces a new abstraction parallel to an existing one (e.g., a second labels system, a second storage layer) instead of extending or replacing.
4. The PR validates input at a boundary without using Zod when Zod is already in `package.json`.
5. The PR exports an underscore-prefixed test hook from production code.
6. The PR does monetary arithmetic on `number` types in a path that sums or averages many values, without an integer-scaling or decimal-library strategy.
7. The PR contains comments that describe **what** the next line does, or reference PR numbers / task IDs / agent runs.
8. The PR uses `any` outside an adapter shim, or collapses a meaningful discriminated union into a boolean.
9. The PR mixes two unrelated goals into one diff. Acceptance criteria from the issue are met but the diff also touches unrelated files.
10. The PR violates a Business rule from this AGENTS.md (e.g., allows `amount = 0`, allows future-dated `purchase_date`, allows custom categories before Stage 5).
11. The PR touches a DB↔code boundary (Zod schema for a DB row, migration, `select` shape, env-var loading, Supabase client wiring) and presents only unit-test evidence. The Developer must show evidence of a smoke test against a running local Supabase. See "Mocks vs. real boundaries".

When blocking, the Reviewer must cite the specific Code convention or Agent override violated and reference the file:line.

### Refiner

When the Refiner identifies that an issue inevitably requires touching a file that is already over the size or `useState` ceiling, it must include a Follow-up entry recommending the refactor as a precondition. The Planner reads Follow-ups and may schedule the refactor before the original issue.

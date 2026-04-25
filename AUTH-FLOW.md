# AUTH-FLOW.md

Authentication contract for `my-investments`. This document describes the email + password auth flow that **Stage 3 will implement** on top of Supabase Auth. It is forward-looking: at the time of writing the app is still single-user with no login, no protected routes, and no session. Nothing here is wired up yet. The point of capturing the contract now, during Stage 1.5, is so that when Stage 3 starts the Refiner and Developer have a single place to look for "what does sign-in mean in this app" instead of re-deciding scope ticket by ticket.

The shape described here intentionally aligns with `STAGES.md` (Stage 3 completion criteria and anti-priorities), `VISION.md` (Supabase as the persistence and auth target), and `SCHEMA.md` (the `users` table that the data model already references).

## Overview

Authentication is provided by **Supabase Auth**, the same Supabase project that hosts the Postgres database described in `SCHEMA.md`. The single login method is **email + password**. There is no OAuth, no magic-link, no SMS, and no email-verification step: a sign-up succeeds the moment the credentials are accepted by Supabase, and the user is signed in immediately.

This choice follows directly from `VISION.md`:

> Backend: Supabase. No SQLite, no MongoDB, no Neon.

and from the Stage 3 anti-priorities in `STAGES.md`, which explicitly defer everything beyond the password flow ("Forgot-password, email verification, OAuth — keep it simple"). The purpose of Stage 3 is to make the app multi-session-capable and to gate every page behind a logged-in user; it is not to ship an auth product. Email + password is the smallest thing that satisfies the gate.

## User-facing flows

Stage 3 will ship exactly three flows. Every other auth-adjacent capability (password reset, account deletion, profile editing, social linking) is deliberately out of scope; see the Out of scope section.

### Sign up

- **Entry route:** `/sign-up`
- **Inputs:** `email` (text), `password` (text). Both are required.
- **Success outcome:** Supabase Auth creates a new user in `auth.users`, the client receives a session, and the browser is redirected to the home page (`/`) already signed in. No verification email is sent and none is expected: the account is usable immediately.
- **Error outcomes:**
  - **Email already registered** — Supabase rejects the sign-up. The form stays on `/sign-up` and shows an inline error inviting the user to sign in instead.
  - **Invalid email format / password too short** — the form stays on `/sign-up` and shows an inline error describing the constraint Supabase enforced.
  - **Network / server error** — the form stays on `/sign-up` and shows a generic "could not sign you up, try again" error. The user's email input is preserved.

### Sign in

- **Entry route:** `/sign-in`
- **Inputs:** `email` (text), `password` (text). Both are required.
- **Success outcome:** Supabase Auth validates the credentials, the client receives an active session, and the browser is redirected to the home page (`/`). If the user landed on `/sign-in` because of the route-protection redirect described below, they are sent back to the route they originally requested instead of `/`.
- **Error outcomes:**
  - **Invalid credentials** (wrong email, wrong password, no such user) — the form stays on `/sign-in` and shows a single non-disambiguating error such as "email or password is incorrect". The wording does not reveal whether the email exists, to avoid leaking account enumeration.
  - **Network / server error** — the form stays on `/sign-in` and shows a generic "could not sign you in, try again" error.

### Sign out

- **Entry point:** a sign-out control reachable from any authenticated page (typically a header menu). There is no dedicated `/sign-out` page.
- **Inputs:** none.
- **Success outcome:** the client clears the Supabase session (cookies and any client-side storage), and the browser is redirected to `/sign-in`.
- **Error outcomes:** sign-out is treated as best-effort. If the network call to revoke the session fails, the local session is still cleared and the user is still redirected to `/sign-in`; the next request from any stale token would be rejected by Supabase anyway.

## Session handling

The Supabase JS client is the single source of truth for "is there a session, and whose is it". The client persists the session across page reloads using the standard Supabase storage strategy: an HTTP-only cookie pair that the server can read on every request, complemented by client-side storage so that the browser-side client can rehydrate the session without a round-trip on initial render.

In practice this means:

- **On the client**, the Supabase JS client is initialised once (the singleton wired up in Stage 1.5) and exposes the current `session` reactively. UI that depends on "am I logged in" subscribes to this client instead of duplicating the check.
- **On the server**, every Next.js server component, server action, and route handler that needs to know the caller's identity reads the session from the request cookies via the same Supabase client. The result is a `session` object (or `null` if unauthenticated). No session state is kept in memory on the server between requests.
- **Refresh tokens** are handled transparently by the Supabase client. Stage 3 does not implement its own refresh logic; if the access token expires mid-request, the next call refreshes it via the Supabase SDK.

A user reloading the page, closing and reopening the tab, or coming back the next day all land in an authenticated state until either Supabase invalidates the session or the user signs out explicitly.

## Route protection

There is exactly one rule, and it is the contract every page in the app must respect from Stage 3 onward:

> Every route in the application requires an authenticated session, except `/sign-up` and `/sign-in`. An unauthenticated request to any other route is redirected to `/sign-in`.

A few clarifications of that single rule:

- The two public routes are exhaustive. There is no marketing landing page, no public read-only view, and no anonymous demo mode. `/` (the investments list) is protected, the same as every other existing route.
- The redirect target is always `/sign-in`, never `/sign-up`. Sign-up is reachable from a link on the sign-in page. This keeps the protection rule symmetric and avoids guessing the user's intent on first visit.
- A successful sign-in should return the user to the route they originally requested (not unconditionally to `/`), so that a deep link clicked while signed out still works after authenticating.
- A user who is already authenticated and visits `/sign-in` or `/sign-up` is redirected to `/` rather than being shown the form again.

How this rule is enforced (Next.js middleware, per-route guards, layout-level checks, or a combination) is an implementation decision that Stage 3 development will make. This document fixes the rule, not the mechanism.

## Out of scope

The following items are explicitly **not** part of Stage 3 and must not be smuggled into the PRs that implement this contract. The list is copied verbatim from the Stage 3 anti-priorities in `STAGES.md` so future readers can verify it has not drifted:

- **Multi-user RLS** (deferred to Stage 4)
- **Social features** (deferred to Stage 5)
- **Forgot-password** (deliberately omitted: keep it simple)
- **Email verification** (deliberately omitted: keep it simple)
- **OAuth** (deliberately omitted: keep it simple)

If a Stage 3 issue starts to require any of these, it is the wrong stage for that work; it should be deferred until the corresponding stage is active.

## Relation to SCHEMA.md

`SCHEMA.md` describes a `users` table that owns labels and investments, and notes that during Stage 1.5 and Stage 2 it stands on its own with placeholder rows. Stage 3 does **not** introduce a parallel application-level `users` table. The identities the app authenticates against are the rows in **Supabase Auth's `auth.users`**, addressed in queries via the standard `auth.uid()` helper.

In Stage 3 the `users.id` column described in `SCHEMA.md` is wired one-to-one to `auth.users(id)`, so that "the user that owns this investment" and "the authenticated session" refer to the same identifier. No additional table, mapping, or sync job is added: the application-level `users` row, when it exists, has the same `uuid` as the corresponding Supabase Auth user. Stage 4 then leans on this identity to enforce RLS via `user_id = auth.uid()`, exactly as anticipated in the Stage 3/4 plan note in `SCHEMA.md`.

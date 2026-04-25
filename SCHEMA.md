# SCHEMA.md

Postgres data model for `my-investments`. This document describes the tables that the Stage 1.5 initial migration will apply to the local Supabase database. It is the single source of truth for the schema until the migration file lands; everything downstream in Stage 1.5 (the migration, the seed script, the typed JS client) must conform to what is written here.

The shape described here intentionally mirrors the in-memory `Investment` and `Label` types defined in `lib/types.ts` so the Stage 2 migration can carry existing JSON data across without losing meaning.

## Money is always exact decimal

Per [VISION.md](./VISION.md):

> Cantidades monetarias siempre como NUMERIC o entero en menor unidad. NUNCA float.

Every monetary field in this schema is declared as `NUMERIC(precision, scale)`. Floating-point types (`real`, `double precision`, `float`) are forbidden anywhere money or quantities of fungible units are stored. This rule is not a recommendation; readers and reviewers should reject any schema change that violates it.

## Conventions

- Primary keys are `uuid`, generated server-side with `gen_random_uuid()` (from `pgcrypto`).
- Timestamps are `timestamptz` with default `now()`.
- Text identifiers (instrument symbols, label names) are stored as `text`; length limits are enforced with `CHECK` constraints rather than `varchar(N)`.
- All foreign keys explicitly declare an `ON DELETE` behaviour. The default is `CASCADE` for child rows that have no meaning without their parent (e.g. an `investment_labels` row whose `investment_id` no longer exists).
- `user_id` columns are `nullable` for the duration of Stage 1.5 because the app is still single-user. They become `NOT NULL` in Stage 4 (multi-user via RLS).

---

## Table: `users`

Placeholder owner of every row in the rest of the schema. During Stage 1.5 and Stage 2 the application is single-user and this table mostly holds a single row. In Stage 3/4 the column `id` will be wired to `auth.users(id)` so that Supabase Auth becomes the system of record for identity.

| Column       | Type          | Nullable | Default              | Notes                                  |
| ------------ | ------------- | -------- | -------------------- | -------------------------------------- |
| `id`         | `uuid`        | NO       | `gen_random_uuid()`  | Primary key.                           |
| `email`      | `text`        | NO       | —                    | Unique. Used to identify a user.       |
| `created_at` | `timestamptz` | NO       | `now()`              |                                        |

- **Primary key:** `(id)`
- **Unique constraints:** `UNIQUE (email)`
- **Foreign keys:** none.
- **Stage 3/4 plan:** `id` is later constrained to match a row in `auth.users(id)` (one-to-one). Until then the table stands on its own.

---

## Table: `labels`

Custom labels users attach to investments. Equivalent to the `Label` interface in `lib/types.ts` (`id`, `name`, `color`).

| Column       | Type          | Nullable | Default              | Notes                                                       |
| ------------ | ------------- | -------- | -------------------- | ----------------------------------------------------------- |
| `id`         | `uuid`        | NO       | `gen_random_uuid()`  | Primary key.                                                |
| `name`       | `text`        | NO       | —                    | Display name (e.g. `"long-term"`). Length-checked.          |
| `color`      | `text`        | NO       | `'#888888'`          | Hex string used by the UI. Format-checked (`#RRGGBB`).      |
| `user_id`    | `uuid`        | YES      | `NULL`               | FK to `users(id)`. Nullable during Stage 1.5 (single-user). |
| `created_at` | `timestamptz` | NO       | `now()`              |                                                             |

- **Primary key:** `(id)`
- **Unique constraints:** `UNIQUE (user_id, name)` — a single user cannot have two labels with the same name. Two different users may both have a label named `"long-term"`.
- **Foreign keys:**
  - `user_id` → `users(id)` `ON DELETE CASCADE`. When a user is removed, their labels go with them.
- **Lifecycle:** a label may exist without being attached to any investment. Removing every `investment_labels` row that references a label does not delete the label — labels are first-class entities that the user manages independently.

---

## Table: `investments`

Mirrors the `Investment` interface in `lib/types.ts`. One row per purchase event.

| Column          | Type             | Nullable | Default              | Notes                                                                |
| --------------- | ---------------- | -------- | -------------------- | -------------------------------------------------------------------- |
| `id`            | `uuid`           | NO       | `gen_random_uuid()`  | Primary key.                                                         |
| `instrument`    | `text`           | NO       | —                    | The traded symbol or name (e.g. `"AAPL"`, `"BTC"`). Length-checked.  |
| `amount`        | `NUMERIC(20, 8)` | NO       | —                    | Number of units purchased. Exact decimal. NEVER float.               |
| `price`         | `NUMERIC(20, 4)` | NO       | —                    | Price per unit at purchase, in the user's reporting currency. Exact decimal. NEVER float. |
| `category`      | `text`           | NO       | —                    | Constrained by `CHECK` to the fixed list (see below).                |
| `purchase_date` | `date`           | NO       | —                    | Calendar date of the purchase, no time-of-day.                       |
| `notes`         | `text`           | YES      | `NULL`               | Free-form notes. Optional.                                           |
| `user_id`       | `uuid`           | YES      | `NULL`               | FK to `users(id)`. Nullable during Stage 1.5 (single-user).          |
| `created_at`    | `timestamptz`    | NO       | `now()`              | Row creation, not purchase date.                                     |
| `updated_at`    | `timestamptz`    | NO       | `now()`              | Bumped by a trigger on every `UPDATE`.                               |

- **Primary key:** `(id)`
- **Check constraints:**
  - `amount > 0` — a purchase of zero or negative units is meaningless.
  - `price >= 0` — free assets are conceivable; negative prices are not.
  - `category IN ('Stocks', 'Crypto', 'Real Estate', 'Bonds', 'Cash', 'Other')` — matches `CATEGORIES` in `lib/types.ts`.
- **Foreign keys:**
  - `user_id` → `users(id)` `ON DELETE CASCADE`.
- **Money fields are `NUMERIC` and only `NUMERIC`.** `amount` uses `NUMERIC(20, 8)` to support fractional crypto units (8 decimals matches BTC's satoshi precision). `price` uses `NUMERIC(20, 4)` to support fiat sub-cent precision while keeping a generous integer range. These choices may be revisited if a real-world use case demands a different scale, but the type stays `NUMERIC`.
- **Resolved open question — category as text vs. table.** The category list is a small, closed enumeration that already lives in `lib/types.ts` (`CATEGORIES`). Promoting it to its own table would buy nothing in Stage 1.5: there is no per-user category, no category metadata to store, no UI to manage categories. It stays as `text` constrained by `CHECK`. If a later stage adds per-user categories or metadata (icons, descriptions), the migration to a `categories` table is mechanical: replace the `CHECK` with a foreign key.

---

## Table: `investment_labels`

Join table that links investments to labels in a many-to-many relationship. Replaces the in-memory `labelIds: string[]` array on `Investment`.

| Column          | Type   | Nullable | Default | Notes                            |
| --------------- | ------ | -------- | ------- | -------------------------------- |
| `investment_id` | `uuid` | NO       | —       | FK to `investments(id)`.         |
| `label_id`      | `uuid` | NO       | —       | FK to `labels(id)`.              |

- **Primary key:** `(investment_id, label_id)` — composite. The same investment cannot be linked to the same label twice.
- **Foreign keys:**
  - `investment_id` → `investments(id)` `ON DELETE CASCADE`. When an investment is deleted, its label links are removed automatically. The labels themselves are untouched.
  - `label_id` → `labels(id)` `ON DELETE CASCADE`. When a label is deleted, every investment loses that link automatically. The investments themselves are untouched.
- **Indexes:** the composite primary key already serves lookups starting from `investment_id`. A separate index on `(label_id)` is added so "all investments tagged with this label" stays fast as the table grows.

---

## Relations at a glance

```
users (1) ──< (N) labels
users (1) ──< (N) investments
investments (M) ──< investment_labels >── (N) labels
```

- A user owns many labels and many investments.
- Each investment can carry zero, one, or many labels.
- Each label can be attached to zero, one, or many investments.
- Deleting a user removes their labels and investments (cascade); the join rows go with them.
- Deleting an investment removes only the join rows that reference it; the labels survive.
- Deleting a label removes only the join rows that reference it; the investments survive.

---

## What this document does NOT cover

- The actual SQL of the initial migration (separate Stage 1.5 deliverable).
- Seed data (separate Stage 1.5 deliverable).
- The TypeScript types generated from the schema (separate Stage 1.5 deliverable).
- Row-Level Security policies (Stage 4).
- Auth wiring between `users.id` and `auth.users.id` (Stage 3/4).
- Indexes beyond the ones called out above; performance tuning happens once real query patterns exist.

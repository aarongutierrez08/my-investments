-- Adds a free-text labels column on public.investments to preserve the
-- existing Investment.labels: string[] field across the JSON-to-Supabase
-- migration. Relational labels remain in public.investment_labels and are
-- the canonical labelling mechanism (SCHEMA.md). This column is the
-- temporary home for the legacy free-text array until a separate cleanup
-- removes the field per AGENTS.md.

alter table public.investments
  add column labels text[] not null default '{}';

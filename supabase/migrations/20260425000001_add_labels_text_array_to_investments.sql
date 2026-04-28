-- Adds the legacy free-text labels column on investments so the existing
-- Investment.labels: string[] field round-trips through the new Supabase
-- backend without changing the public API shape. The relational labels
-- system (labels + investment_labels) stays the canonical one; this column
-- is the bridge until the legacy free-text labels feature is migrated in
-- its own follow-up issue.

alter table public.investments
  add column labels text[] not null default '{}';

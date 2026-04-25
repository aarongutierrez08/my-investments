-- Initial schema for my-investments.
-- Source of truth: SCHEMA.md (Stage 1.5 — Foundation).
-- Money/quantity columns are NUMERIC by project policy (VISION.md).

create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  constraint users_email_key unique (email)
);

create table public.labels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#888888',
  user_id uuid references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint labels_user_id_name_key unique (user_id, name),
  constraint labels_name_length_check check (char_length(name) between 1 and 100),
  constraint labels_color_format_check check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create table public.investments (
  id uuid primary key default gen_random_uuid(),
  instrument text not null,
  amount numeric(20, 8) not null,
  price numeric(20, 4) not null,
  category text not null,
  purchase_date date not null,
  notes text,
  user_id uuid references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investments_amount_positive_check check (amount > 0),
  constraint investments_price_non_negative_check check (price >= 0),
  constraint investments_category_check check (
    category in ('Stocks', 'Crypto', 'Real Estate', 'Bonds', 'Cash', 'Other')
  ),
  constraint investments_instrument_length_check check (
    char_length(instrument) between 1 and 100
  )
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger investments_set_updated_at
before update on public.investments
for each row execute function public.set_updated_at();

create table public.investment_labels (
  investment_id uuid not null references public.investments (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  primary key (investment_id, label_id)
);

create index investment_labels_label_id_idx on public.investment_labels (label_id);

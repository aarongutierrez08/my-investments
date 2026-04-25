-- Deterministic seed for local development.
-- Loaded automatically by `supabase db reset` (see [db.seed] in supabase/config.toml).
-- Money columns are NUMERIC literals — never floats — per VISION.md.

insert into public.users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'dev@my-investments.local')
on conflict (id) do nothing;

insert into public.labels (id, name, color, user_id)
values
  ('11111111-1111-1111-1111-111111111111', 'long-term', '#3366CC', '00000000-0000-0000-0000-000000000001'),
  ('22222222-2222-2222-2222-222222222222', 'high-risk', '#CC3333', '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.investments (
  id, instrument, amount, price, category, purchase_date, notes, user_id
)
values
  (
    '33333333-3333-3333-3333-333333333333',
    'AAPL',
    10.00000000,
    150.0000,
    'Stocks',
    '2026-01-15',
    'Seed: long-term equity position',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'BTC',
    0.25000000,
    30000.0000,
    'Crypto',
    '2026-02-20',
    null,
    '00000000-0000-0000-0000-000000000001'
  )
on conflict (id) do nothing;

insert into public.investment_labels (investment_id, label_id)
values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111'),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111'),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222')
on conflict (investment_id, label_id) do nothing;

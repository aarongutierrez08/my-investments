# STAGES.md

Authoritative staged roadmap for my-investments. The Planner reads this and proposes issues that advance **only the active stage**. When every completion criterion of the active stage maps to an entry in `FEATURES.md`, the Planner emits `stage_complete` and the loop pauses until the user flips the next stage to `active`.

---

## Stage 1 — Mock single-user
Status: complete
Goal: Validar el loop autónomo (Planner → Refiner → Developer → Reviewer → Merge) con un CRUD básico sobre JSON.

Completion criteria:
- [x] CRUD de inversiones end-to-end sobre JSON storage
- [x] El loop ha mergeado +20 PRs autónomos con éxito

---

## Stage 1.5 — Foundation (persistencia real, scaffolding)
Status: active
Goal: Preparar el terreno para migrar de JSON a Supabase en modo local-first. Esta etapa entrega docs + scaffolding únicamente. Ninguna feature existente se mueve a Supabase todavía.

Completion criteria:
- [ ] `SCHEMA.md` documents the Postgres tables (investments, labels, users, etc.) with NUMERIC money fields and explicit relations
- [ ] `AUTH-FLOW.md` documents the email+password auth flow that Stage 3 will implement
- [ ] Supabase local dev is configured (e.g. `supabase/config.toml`) so `supabase start` spins up a local Postgres + auth server
- [ ] The Supabase JS client is wired as a singleton with env-var configuration
- [ ] A single initial migration applies SCHEMA.md to the local DB
- [ ] An npm script (e.g. `db:reset`) brings the local DB to a known seeded state

Anti-priorities:
- Moving existing features from JSON to Supabase (that is Stage 2)
- Auth UI or middleware (that is Stage 3)
- User-scoping or RLS (that is Stage 4)
- More statistics, filters, or sort options (Stage 1 already covered these)

---

## Stage 2 — Persistencia sin auth (single-user sobre Supabase)
Status: pending
Goal: Reemplazar el JSON storage por Supabase. La app sigue single-user (sin login aún). Todas las features existentes siguen funcionando pero ahora los datos viven en Postgres.

Completion criteria:
- [ ] Investments persist in Supabase instead of the JSON file
- [ ] Labels persist in Supabase instead of the JSON file
- [ ] All existing CRUD operations (create, edit, delete) still work against Supabase
- [ ] Money fields are stored as NUMERIC at the database level
- [ ] `lib/storage.ts` has been removed or turned into a thin wrapper over the Supabase client
- [ ] The JSON data file is no longer read or written

Anti-priorities:
- Auth (Stage 3)
- Multi-user (Stage 4)
- Any new user-visible feature on top of persistence

---

## Stage 3 — Auth single-user
Status: pending
Goal: Añadir email+password auth. La app sigue single-user (una sola sesión), sin RLS aún. Todas las rutas quedan protegidas.

Completion criteria:
- [ ] Users can sign up with email and password
- [ ] Users can sign in with email and password
- [ ] Users can sign out
- [ ] The session is persisted across page reloads
- [ ] Protected routes redirect to the sign-in page when not authenticated

Anti-priorities:
- Multi-user RLS (Stage 4)
- Social features (Stage 5)
- Forgot-password, email verification, OAuth — keep it simple

---

## Stage 4 — Multi-user via RLS
Status: pending
Goal: Scopear todas las queries por usuario. RLS en Postgres hace cumplir la visibilidad.

Completion criteria:
- [ ] RLS policies restrict every investment query to `user_id = auth.uid()`
- [ ] RLS policies restrict every label query to `user_id = auth.uid()`
- [ ] New investments and labels are automatically tagged with the creator's user_id
- [ ] Two separate users cannot see each other's data

Anti-priorities:
- Social features (Stage 5)

---

## Stage 5 — Social (sharing, fork)
Status: pending
Goal: Habilitar la dimensión social. Usuarios pueden compartir labels, ver portfolios de otros, y forkear plantillas.

Completion criteria:
- [ ] Users can mark a label as public so others can see it
- [ ] Users can browse public labels created by other users
- [ ] Users can fork a public label into their own portfolio
- [ ] Users can mark their portfolio as visible to others
- [ ] Users can browse other users' visible portfolios
- [ ] Users can fork an organization template

Anti-priorities:
- Historical prices, ROI (Stage 6)
- Reports (Stage 7)

---

## Stage 6 — Precios + ROI
Status: pending
Goal: Mostrar performance real contra precios actuales.

Completion criteria:
- [ ] System fetches the current price for each investment from an external source
- [ ] Users see ROI per investment (current vs purchase price)
- [ ] Users see total portfolio ROI
- [ ] Users see ROI evolution over time as a chart

Anti-priorities:
- Reports (Stage 7)

---

## Stage 7 — Reportes
Status: pending
Goal: Exportar/visualizar la información necesaria para gestión real (impuestos, decisiones de portfolio).

Completion criteria:
- [ ] Users can export an annual tax-relevant report
- [ ] Users can see a portfolio performance summary by period

Anti-priorities:
- (a definir cuando lleguemos)

my-investments es un tracker de portfolio personal que evoluciona
de single-user mock hacia multi-user social con persistencia real.

## Targets a largo plazo
- Persistencia real con Supabase (Postgres + RLS + realtime + auth)
- Multi-usuario con autenticación (email + password)
- Funcionalidad social:
  - Compartir labels/plantillas entre usuarios
  - Ver portfolios de otros (visibilidad por RLS)
  - Forkear plantillas de organización populares
- Tracking histórico de precios y ROI
- Reportes (impuestos, performance)

## Restricciones técnicas no negociables
- Cantidades monetarias siempre como NUMERIC o entero en menor unidad. NUNCA float.
- Backend: Supabase. No SQLite, no MongoDB, no Neon.
